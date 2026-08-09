-- ============================================================================
-- SIGNUP GATE, REPORT PIPELINE, BEHAVIORAL DEFENSE
--
-- Fixes the platform's biggest hole: signup was only *softly* invite-gated.
-- /onboarding was public and all invite validation/decrementing happened in
-- the browser. Account creation is now gated inside handle_new_user(), which
-- runs in the same transaction as the auth.users insert — an invalid or
-- missing invitation aborts signup at the database, no matter what client
-- performed it.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Invite-gated account creation
-- ----------------------------------------------------------------------------
-- The signup client passes exactly one of these in auth metadata:
--   trail_pass_token — a Trail Pass raw token (new system)
--   invite_id        — a legacy slug-link invite id (transition period)
-- Redemption (single-use marking, lineage, circles) happens here atomically,
-- replacing the old client-side inserts.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _cfg jsonb := public.get_security_config();
  _invite_only boolean := COALESCE((_cfg->>'INVITE_ONLY_SIGNUP')::boolean, true);
  _token text := NULLIF(NEW.raw_user_meta_data->>'trail_pass_token', '');
  _legacy_invite_id uuid := NULLIF(NEW.raw_user_meta_data->>'invite_id', '')::uuid;
  _pass public.trail_passes%ROWTYPE;
  _legacy public.invites%ROWTYPE;
BEGIN
  -- Validate the invitation BEFORE creating anything.
  IF _token IS NOT NULL THEN
    SELECT * INTO _pass
    FROM public.trail_passes
    WHERE token_hash = public.hash_invite_token(_token)
    FOR UPDATE;

    IF _pass.id IS NULL OR _pass.status <> 'PENDING' OR _pass.expires_at <= now() THEN
      RAISE EXCEPTION 'signup_invalid_invitation';
    END IF;
    -- Email binding: the pass only opens the gate for the address it was
    -- sent to.
    IF public.normalize_email(NEW.email) IS DISTINCT FROM _pass.invitee_email_normalized THEN
      RAISE EXCEPTION 'signup_invitation_email_mismatch';
    END IF;

  ELSIF _legacy_invite_id IS NOT NULL THEN
    IF NOT COALESCE((_cfg->>'LEGACY_LINK_REDEMPTION_ENABLED')::boolean, true) THEN
      RAISE EXCEPTION 'signup_requires_invitation';
    END IF;

    SELECT * INTO _legacy
    FROM public.invites
    WHERE id = _legacy_invite_id AND is_active = true
    FOR UPDATE;

    IF _legacy.id IS NULL THEN
      RAISE EXCEPTION 'signup_invalid_invitation';
    END IF;
    IF NOT _legacy.is_infinite THEN
      IF _legacy.uses_remaining < 1 THEN
        RAISE EXCEPTION 'signup_invalid_invitation';
      END IF;
      -- Atomic decrement, inside the signup transaction: concurrent
      -- redemptions cannot overspend the link.
      UPDATE public.invites
      SET uses_remaining = uses_remaining - 1,
          is_active = (uses_remaining - 1) > 0
      WHERE id = _legacy.id;
    END IF;

  ELSIF _invite_only
        -- app_metadata can only be set server-side (auth.admin.createUser),
        -- never by a browser signUp call — user_metadata would be forgeable.
        AND COALESCE(NEW.raw_app_meta_data->>'invite_bypass', '') <> 'true' THEN
    RAISE EXCEPTION 'signup_requires_invitation';
  END IF;

  INSERT INTO public.profiles (id, handle, display_name, default_avatar_key)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'handle', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New Arrival'),
    public.random_creature()
  );

  INSERT INTO public.account_verifications (user_id, email_verified_at)
  VALUES (NEW.id, NEW.email_confirmed_at)
  ON CONFLICT (user_id) DO NOTHING;

  -- Complete redemption now the profile row exists.
  IF _pass.id IS NOT NULL THEN
    UPDATE public.trail_passes
    SET status = 'REDEEMED', redeemed_at = now(), redeemed_by_user_id = NEW.id
    WHERE id = _pass.id;

    INSERT INTO public.user_lineage (user_id, invited_by_user_id, source_invite_id, source_kind)
    VALUES (NEW.id, _pass.inviter_user_id, _pass.id, 'trail_pass')
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.trust_events (user_id, event_type, weight, category, source_type, source_id)
    VALUES (_pass.inviter_user_id, 'INVITE_REDEEMED', 0, 'invite', 'trail_pass', _pass.id);

    IF _pass.inviter_user_id <> NEW.id THEN
      INSERT INTO public.circles (requester_id, requestee_id, status, created_at, updated_at)
      VALUES (_pass.inviter_user_id, NEW.id, 'accepted', now(), now())
      ON CONFLICT DO NOTHING;
      INSERT INTO public.circles (requester_id, requestee_id, status, created_at, updated_at)
      VALUES (NEW.id, _pass.inviter_user_id, 'accepted', now(), now())
      ON CONFLICT DO NOTHING;
    END IF;

  ELSIF _legacy.id IS NOT NULL THEN
    -- ip_hash keeps the existing per-IP rate limit on open (infinite) links
    -- fed; it is computed server-side by validate-invite and round-tripped
    -- through signup metadata, same trust level as before.
    INSERT INTO public.invite_uses (invite_id, invitee_id, ip_hash)
    VALUES (_legacy.id, NEW.id, NULLIF(NEW.raw_user_meta_data->>'invite_ip_hash', ''));
    PERFORM public.accept_invite_create_circle(_legacy.id, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Mirror Supabase email confirmation into the verification store, and record
-- the trust event that risk evaluation keys off.
CREATE OR REPLACE FUNCTION public.sync_email_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    INSERT INTO public.account_verifications (user_id, email_verified_at)
    VALUES (NEW.id, NEW.email_confirmed_at)
    ON CONFLICT (user_id) DO UPDATE
      SET email_verified_at = EXCLUDED.email_verified_at;

    INSERT INTO public.trust_events (user_id, event_type, weight, category, source_type)
    VALUES (NEW.id, 'VERIFICATION_COMPLETED', 20, 'verification', 'email');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_email_verification();

-- ----------------------------------------------------------------------------
-- Report pipeline: weighting, rate limiting, coordination, case attachment
-- ----------------------------------------------------------------------------
-- Used by triage-report; previously referenced but never created.
CREATE OR REPLACE FUNCTION public.increment_reporter_count(p_reporter_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.reporter_patterns (reporter_id, total_reports, last_updated)
  VALUES (p_reporter_id, 1, now())
  ON CONFLICT (reporter_id) DO UPDATE
    SET total_reports = public.reporter_patterns.total_reports + 1,
        last_updated = now();
$$;
REVOKE EXECUTE ON FUNCTION public.increment_reporter_count(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.prepare_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _cfg jsonb := public.get_security_config();
  _daily_limit integer := COALESCE((_cfg->>'report_daily_limit_per_user')::integer, 20);
  _burst_window integer := COALESCE((_cfg->>'report_burst_window_seconds')::integer, 120);
  _burst_threshold integer := COALESCE((_cfg->>'report_burst_threshold')::integer, 5);
  _today_count integer;
  _weight numeric := 1.0;
  _reporter_created timestamptz;
  _reporter_trust text;
  _serial boolean;
  _recent_reporters integer;
  _shared_branch integer;
  _case_id uuid;
  _case_type text;
BEGIN
  -- Per-reporter daily cap (server-enforced; brigading gets expensive).
  SELECT count(*) INTO _today_count
  FROM public.reports
  WHERE reporter_id = NEW.reporter_id
    AND created_at >= now() - interval '24 hours';
  IF _today_count >= _daily_limit THEN
    RAISE EXCEPTION 'report_rate_limited';
  END IF;

  -- Reporter weight at filing time (never shown to anyone; spec §45).
  SELECT p.created_at INTO _reporter_created
  FROM public.profiles p WHERE p.id = NEW.reporter_id;
  SELECT ut.trust_state INTO _reporter_trust
  FROM public.user_trust ut WHERE ut.user_id = NEW.reporter_id;
  SELECT rp.flagged_as_serial INTO _serial
  FROM public.reporter_patterns rp WHERE rp.reporter_id = NEW.reporter_id;

  IF _reporter_created > now() - interval '14 days' THEN
    _weight := 0.5;
  ELSIF _reporter_trust IN ('ESTABLISHED', 'TRUSTED') THEN
    _weight := 1.2;
  END IF;
  IF COALESCE(_serial, false) THEN
    _weight := LEAST(_weight, 0.3);
  END IF;
  NEW.reporter_weight_at_time := _weight;

  -- Coordination check: burst of distinct reporters on the same target, and
  -- how many of them share an invitation branch with each other. Recorded as
  -- context for Rangers — never auto-dismissal (spec §77).
  IF NEW.reported_user_id IS NOT NULL THEN
    SELECT count(DISTINCT r.reporter_id) INTO _recent_reporters
    FROM public.reports r
    WHERE r.reported_user_id = NEW.reported_user_id
      AND r.created_at >= now() - make_interval(secs => _burst_window);

    IF _recent_reporters + 1 >= _burst_threshold THEN
      SELECT count(*) INTO _shared_branch
      FROM public.reports r
      JOIN public.user_lineage l1 ON l1.user_id = r.reporter_id
      JOIN public.user_lineage l2 ON l2.user_id = NEW.reporter_id
      WHERE r.reported_user_id = NEW.reported_user_id
        AND r.created_at >= now() - make_interval(secs => _burst_window)
        AND l1.invited_by_user_id IS NOT NULL
        AND l1.invited_by_user_id = l2.invited_by_user_id;
      NEW.coordination_risk := CASE WHEN _shared_branch >= 2 THEN 'likely' ELSE 'possible' END;
    ELSE
      NEW.coordination_risk := 'none';
    END IF;
  END IF;

  -- Attach bot/spam reports against an account to an open case, creating one
  -- when needed. One case aggregates all reports on the same subject.
  IF NEW.reported_user_id IS NOT NULL
     AND NEW.report_reason IN ('suspected_bot', 'spam_fake') THEN
    _case_type := CASE NEW.report_reason WHEN 'suspected_bot' THEN 'BOT_SUSPECTED' ELSE 'SPAM' END;

    SELECT mc.id INTO _case_id
    FROM public.moderation_cases mc
    WHERE mc.subject_user_id = NEW.reported_user_id
      AND mc.case_type IN ('BOT_SUSPECTED', 'SPAM')
      AND mc.status NOT IN ('CLOSED')
    ORDER BY mc.created_at DESC
    LIMIT 1;

    IF _case_id IS NULL THEN
      INSERT INTO public.moderation_cases
        (case_type, subject_user_id, status, priority, summary, auto_generated)
      VALUES
        (_case_type, NEW.reported_user_id, 'NEW', 'MEDIUM',
         'Opened automatically from a community report', true)
      RETURNING id INTO _case_id;
    ELSE
      -- Several independent weighted reports raise the priority.
      UPDATE public.moderation_cases mc
      SET priority = 'HIGH'
      WHERE mc.id = _case_id
        AND mc.priority IN ('MEDIUM', 'LOW')
        AND (SELECT COALESCE(sum(r.reporter_weight_at_time), 0)
             FROM public.reports r WHERE r.case_id = _case_id) + _weight >= 3;
    END IF;
    NEW.case_id := _case_id;
  END IF;

  PERFORM public.increment_reporter_count(NEW.reporter_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_report_insert ON public.reports;
CREATE TRIGGER before_report_insert
  BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.prepare_report();

-- The report sheet offers 'minor_safety' but the CHECK never allowed it —
-- inserts 400ed. Widen the constraint (also done for suspected_bot in the
-- schema migration; kept in one final authoritative shape here).
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_report_reason_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_report_reason_check
  CHECK (report_reason IN ('harmful_dangerous','spam_fake','wrong_camp',
                           'suspected_bot','minor_safety','other'));

-- ----------------------------------------------------------------------------
-- New-account behavioral rate limits (server-enforced)
-- ----------------------------------------------------------------------------
-- Applies only during the probation window; established humans never hit
-- these. Generic across tables via trigger arguments:
--   TG_ARGV[0] = actor column name, TG_ARGV[1] = config key for daily limit.
CREATE OR REPLACE FUNCTION public.enforce_new_account_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _actor uuid := (to_jsonb(NEW) ->> TG_ARGV[0])::uuid;
  _cfg jsonb;
  _limit integer;
  _created timestamptz;
  _count integer;
BEGIN
  IF _actor IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT created_at INTO _created FROM public.profiles WHERE id = _actor;
  IF _created IS NULL OR _created <= now() - interval '14 days' THEN
    RETURN NEW;
  END IF;

  _cfg := public.get_security_config();
  _limit := COALESCE((_cfg->>TG_ARGV[1])::integer, 50);

  EXECUTE format(
    'SELECT count(*) FROM public.%I WHERE %I = $1 AND created_at >= now() - interval ''24 hours''',
    TG_TABLE_NAME, TG_ARGV[0])
  INTO _count USING _actor;

  IF _count >= _limit THEN
    RAISE EXCEPTION 'rate_limited_new_account';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rate_limit_new_posts ON public.posts;
CREATE TRIGGER rate_limit_new_posts
  BEFORE INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_new_account_rate('author_id', 'limit_new_posts');

DROP TRIGGER IF EXISTS rate_limit_new_follows ON public.circles;
CREATE TRIGGER rate_limit_new_follows
  BEFORE INSERT ON public.circles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_new_account_rate('requester_id', 'limit_new_follows');

DROP TRIGGER IF EXISTS rate_limit_new_messages ON public.campfire_messages;
CREATE TRIGGER rate_limit_new_messages
  BEFORE INSERT ON public.campfire_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_new_account_rate('sender_id', 'limit_new_messages');

CREATE INDEX IF NOT EXISTS idx_posts_author_created
  ON public.posts (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_circles_requester_created
  ON public.circles (requester_id, created_at);
CREATE INDEX IF NOT EXISTS idx_campfire_messages_sender_created
  ON public.campfire_messages (sender_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- Repetitive-content detection (privacy-conscious: hashes only)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_content_for_hash(_content text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(regexp_replace(lower(COALESCE(_content, '')), '\s+', ' ', 'g'),
                        '[!.,?''"“”‘’]+', '', 'g')
$$;

-- Fires for accounts inside the probation window: when the same normalized
-- message body has been sent many times in 24h, record a risk signal and
-- make sure a case exists. Signals store the hash and count — never the
-- private message content itself.
CREATE OR REPLACE FUNCTION public.detect_repeated_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _created timestamptz;
  _hash text;
  _count integer;
  _case_id uuid;
BEGIN
  IF NEW.content IS NULL OR char_length(NEW.content) < 12 THEN
    RETURN NEW;
  END IF;

  SELECT created_at INTO _created FROM public.profiles WHERE id = NEW.sender_id;
  IF _created IS NULL OR _created <= now() - interval '30 days' THEN
    RETURN NEW;
  END IF;

  _hash := md5(public.normalize_content_for_hash(NEW.content));

  SELECT count(*) INTO _count
  FROM public.campfire_messages m
  WHERE m.sender_id = NEW.sender_id
    AND m.created_at >= now() - interval '24 hours'
    AND md5(public.normalize_content_for_hash(m.content)) = _hash;

  -- Trip exactly once at the threshold so repeats don't spam signals.
  IF _count = 10 THEN
    SELECT mc.id INTO _case_id
    FROM public.moderation_cases mc
    WHERE mc.subject_user_id = NEW.sender_id
      AND mc.case_type IN ('BOT_SUSPECTED', 'SPAM')
      AND mc.status NOT IN ('CLOSED')
    LIMIT 1;

    IF _case_id IS NULL THEN
      INSERT INTO public.moderation_cases
        (case_type, subject_user_id, status, priority, summary, auto_generated)
      VALUES ('SPAM', NEW.sender_id, 'NEW', 'HIGH',
              'Repeated identical messages detected automatically', true)
      RETURNING id INTO _case_id;
    END IF;

    INSERT INTO public.risk_signals
      (user_id, signal_type, severity, confidence, observed_value, explanation, source, case_id)
    VALUES
      (NEW.sender_id, 'REPEATED_MESSAGE_CONTENT', 'high', 0.8,
       jsonb_build_object('content_hash', _hash, 'count_24h', _count),
       format('%s nearly identical messages sent within 24 hours', _count),
       'behavior', _case_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS detect_repeated_messages_trigger ON public.campfire_messages;
CREATE TRIGGER detect_repeated_messages_trigger
  AFTER INSERT ON public.campfire_messages
  FOR EACH ROW EXECUTE FUNCTION public.detect_repeated_messages();
