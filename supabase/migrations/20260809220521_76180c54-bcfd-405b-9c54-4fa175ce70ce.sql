-- ============================================================================
-- TRAIL PASSES — server-side issue / validate / redeem / regenerate
--
-- Every rule here is enforced in the database so a hostile client calling
-- PostgREST directly gets the same answer as the UI. Raw invitation tokens
-- are never stored — only a SHA-256 hash. The raw token is returned exactly
-- once, to the inviter who is about to share it.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Internal secrets (HMAC keys for abuse correlation)
-- ----------------------------------------------------------------------------
-- RLS is enabled with no policies and all client privileges revoked; only
-- SECURITY DEFINER functions (and the service role) can read these.
CREATE TABLE IF NOT EXISTS public.internal_secrets (
  name text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.internal_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.internal_secrets FROM anon, authenticated;

INSERT INTO public.internal_secrets (name, value)
VALUES
  ('email_hmac_key', encode(gen_random_bytes(32), 'hex')),
  ('phone_hmac_key', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------
-- Lowercase + trim only. Plus-aliases are deliberately preserved: they are
-- legitimate and distinct for security evaluation (spec §13).
CREATE OR REPLACE FUNCTION public.normalize_email(_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(btrim(_email))
$$;

CREATE OR REPLACE FUNCTION public.email_hmac(_email text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT encode(
    hmac(public.normalize_email(_email)::bytea,
         (SELECT decode(value, 'hex') FROM public.internal_secrets WHERE name = 'email_hmac_key'),
         'sha256'),
    'hex')
$$;
REVOKE EXECUTE ON FUNCTION public.email_hmac(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.hash_invite_token(_token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT encode(digest(_token, 'sha256'), 'hex')
$$;

-- True when the account is currently suspended or banned.
CREATE OR REPLACE FUNCTION public.is_account_blocked(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.suspensions s
    WHERE s.user_id = _user_id
      AND (s.is_permanent OR s.suspended_until IS NULL OR s.suspended_until > now())
  )
$$;

-- ----------------------------------------------------------------------------
-- Issue a Trail Pass
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_trail_pass(
  _invitee_email text,
  _invitee_name text DEFAULT NULL,
  _personal_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _cfg jsonb := public.get_security_config();
  _allowance public.invite_allowances%ROWTYPE;
  _trust public.user_trust%ROWTYPE;
  _email_norm text;
  _token text;
  _pass_id uuid;
  _expires timestamptz;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF NOT COALESCE((_cfg->>'TRAIL_PASSES_ENABLED')::boolean, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'passes_disabled');
  END IF;

  _email_norm := public.normalize_email(_invitee_email);
  IF _email_norm IS NULL OR _email_norm !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_email');
  END IF;

  IF public.is_account_blocked(_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_eligible');
  END IF;

  SELECT * INTO _trust FROM public.user_trust WHERE user_id = _user_id;
  IF _trust.user_id IS NOT NULL AND _trust.moderation_state NOT IN ('NONE') THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_eligible');
  END IF;
  IF _trust.user_id IS NOT NULL
     AND _trust.trust_score < COALESCE((_cfg->>'invite_min_trust_score')::integer, 50) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_eligible');
  END IF;

  -- Lock the allowance row: issuing is atomic, so two parallel requests
  -- cannot both spend the last pass.
  SELECT * INTO _allowance
  FROM public.invite_allowances
  WHERE user_id = _user_id
  FOR UPDATE;

  IF _allowance.user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_eligible');
  END IF;
  IF _allowance.invites_frozen_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invites_frozen');
  END IF;
  IF _allowance.invite_eligible_at IS NULL OR _allowance.invite_eligible_at > now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_yet_eligible');
  END IF;
  IF _allowance.available_passes < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_passes');
  END IF;

  -- One live pass per invitee email per inviter; quietly refuse duplicates.
  IF EXISTS (
    SELECT 1 FROM public.trail_passes
    WHERE inviter_user_id = _user_id
      AND invitee_email_normalized = _email_norm
      AND status IN ('PENDING', 'PAUSED')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_invited');
  END IF;

  _token := encode(gen_random_bytes(24), 'hex');
  _expires := now() + make_interval(days => COALESCE((_cfg->>'invite_expiry_days')::integer, 7));

  INSERT INTO public.trail_passes
    (inviter_user_id, invitee_email_normalized, invitee_email_hmac,
     invitee_name, personal_message, token_hash, expires_at)
  VALUES
    (_user_id, _email_norm, public.email_hmac(_email_norm),
     NULLIF(btrim(_invitee_name), ''), NULLIF(btrim(_personal_message), ''),
     public.hash_invite_token(_token), _expires)
  RETURNING id INTO _pass_id;

  UPDATE public.invite_allowances
  SET available_passes = available_passes - 1
  WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'success', true,
    'pass_id', _pass_id,
    'token', _token,
    'expires_at', _expires
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_trail_pass(text, text, text) FROM PUBLIC, anon;

-- ----------------------------------------------------------------------------
-- Revoke a pass (inviter or Ranger). Unredeemed passes return to the balance.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_trail_pass(_pass_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _pass public.trail_passes%ROWTYPE;
BEGIN
  SELECT * INTO _pass FROM public.trail_passes WHERE id = _pass_id FOR UPDATE;
  IF _pass.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;
  IF _pass.inviter_user_id <> _user_id AND NOT public.is_ranger(_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;
  IF _pass.status NOT IN ('PENDING', 'PAUSED') THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_revocable');
  END IF;

  UPDATE public.trail_passes
  SET status = 'REVOKED', revoked_at = now(), revoked_by = _user_id,
      revocation_reason = COALESCE(_reason, 'revoked_by_inviter')
  WHERE id = _pass_id;

  -- Refund only when the inviter themselves cancels an unredeemed pass and
  -- their invites are not frozen.
  IF _pass.inviter_user_id = _user_id THEN
    UPDATE public.invite_allowances
    SET available_passes = LEAST(available_passes + 1, maximum_passes)
    WHERE user_id = _user_id AND invites_frozen_at IS NULL;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.revoke_trail_pass(uuid, text) FROM PUBLIC, anon;

-- ----------------------------------------------------------------------------
-- Pre-signup status check (anonymous — the landing page calls this)
-- ----------------------------------------------------------------------------
-- Reveals only what the token holder already legitimately knows: the invite
-- exists, who sent it, and the email it was sent to. Never reveals inviter
-- account state beyond a display name.
CREATE OR REPLACE FUNCTION public.get_trail_pass_status(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _pass public.trail_passes%ROWTYPE;
  _inviter_name text;
BEGIN
  SELECT * INTO _pass
  FROM public.trail_passes
  WHERE token_hash = public.hash_invite_token(_token);

  IF _pass.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;

  IF _pass.status = 'PENDING' AND _pass.expires_at <= now() THEN
    UPDATE public.trail_passes SET status = 'EXPIRED' WHERE id = _pass.id;
    _pass.status := 'EXPIRED';
  END IF;

  IF _pass.status <> 'PENDING' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', CASE _pass.status
        WHEN 'EXPIRED' THEN 'expired'
        WHEN 'REDEEMED' THEN 'already_used'
        WHEN 'PAUSED' THEN 'paused'
        ELSE 'revoked' END
    );
  END IF;

  SELECT display_name INTO _inviter_name
  FROM public.profiles WHERE id = _pass.inviter_user_id;

  RETURN jsonb_build_object(
    'valid', true,
    'invitee_email', _pass.invitee_email_normalized,
    'invitee_name', _pass.invitee_name,
    'personal_message', _pass.personal_message,
    'inviter_name', _inviter_name,
    'expires_at', _pass.expires_at
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_trail_pass_status(text) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- Redeem (called by the freshly signed-up user; email-bound, single-use)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_trail_pass(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _user_email text;
  _pass public.trail_passes%ROWTYPE;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;

  -- Row lock makes concurrent redemption of the same token impossible.
  SELECT * INTO _pass
  FROM public.trail_passes
  WHERE token_hash = public.hash_invite_token(_token)
  FOR UPDATE;

  IF _pass.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;
  IF _pass.status = 'PENDING' AND _pass.expires_at <= now() THEN
    UPDATE public.trail_passes SET status = 'EXPIRED' WHERE id = _pass.id;
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;
  IF _pass.status <> 'PENDING' THEN
    RETURN jsonb_build_object('success', false, 'error', lower(_pass.status));
  END IF;

  -- Email binding: the pass only creates an account for the address it was
  -- sent to (spec §12).
  IF public.normalize_email(_user_email) IS DISTINCT FROM _pass.invitee_email_normalized THEN
    RETURN jsonb_build_object('success', false, 'error', 'email_mismatch');
  END IF;

  -- One lineage per account, ever.
  IF EXISTS (SELECT 1 FROM public.user_lineage WHERE user_id = _user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_joined');
  END IF;

  UPDATE public.trail_passes
  SET status = 'REDEEMED', redeemed_at = now(), redeemed_by_user_id = _user_id
  WHERE id = _pass.id;

  INSERT INTO public.user_lineage (user_id, invited_by_user_id, source_invite_id, source_kind)
  VALUES (_user_id, _pass.inviter_user_id, _pass.id, 'trail_pass')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.trust_events (user_id, event_type, weight, category, source_type, source_id)
  VALUES (_pass.inviter_user_id, 'INVITE_REDEEMED', 0, 'invite', 'trail_pass', _pass.id);

  -- The inviter and invitee start connected, same as the legacy invite flow.
  IF _pass.inviter_user_id <> _user_id THEN
    INSERT INTO public.circles (requester_id, requestee_id, status, created_at, updated_at)
    VALUES (_pass.inviter_user_id, _user_id, 'accepted', now(), now())
    ON CONFLICT DO NOTHING;
    INSERT INTO public.circles (requester_id, requestee_id, status, created_at, updated_at)
    VALUES (_user_id, _pass.inviter_user_id, 'accepted', now(), now())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'inviter_id', _pass.inviter_user_id);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.redeem_trail_pass(text) FROM PUBLIC, anon;

-- ----------------------------------------------------------------------------
-- Regeneration: healthy matured invitees earn the inviter passes back
-- ----------------------------------------------------------------------------
-- Credits at most once per pass (matured_credited_at). An invitee counts as
-- healthy when they are past the maturation window, not suspended/banned,
-- and carry no active moderation state.
CREATE OR REPLACE FUNCTION public.process_invite_maturation_for(_inviter_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cfg jsonb := public.get_security_config();
  _maturation_days integer := COALESCE((_cfg->>'invite_maturation_days')::integer, 14);
  _pass record;
  _credited integer := 0;
BEGIN
  FOR _pass IN
    SELECT tp.id, tp.redeemed_by_user_id
    FROM public.trail_passes tp
    WHERE tp.inviter_user_id = _inviter_id
      AND tp.status = 'REDEEMED'
      AND tp.matured_credited_at IS NULL
      AND tp.redeemed_at <= now() - make_interval(days => _maturation_days)
    FOR UPDATE OF tp
  LOOP
    IF public.is_account_blocked(_pass.redeemed_by_user_id) THEN
      CONTINUE;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.user_trust ut
      WHERE ut.user_id = _pass.redeemed_by_user_id
        AND ut.moderation_state <> 'NONE'
    ) THEN
      CONTINUE;
    END IF;

    UPDATE public.trail_passes SET matured_credited_at = now() WHERE id = _pass.id;

    UPDATE public.invite_allowances
    SET available_passes = LEAST(available_passes + 1, maximum_passes),
        last_regeneration_at = now()
    WHERE user_id = _inviter_id AND invites_frozen_at IS NULL;

    INSERT INTO public.trust_events (user_id, event_type, weight, category, source_type, source_id)
    VALUES (_inviter_id, 'HEALTHY_INVITEE_MATURED', 25, 'invite', 'trail_pass', _pass.id);

    UPDATE public.user_trust
    SET invite_trust_score = LEAST(invite_trust_score + 10, 1000)
    WHERE user_id = _inviter_id;

    _credited := _credited + 1;
  END LOOP;

  RETURN _credited;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.process_invite_maturation_for(uuid) FROM PUBLIC, anon, authenticated;

-- User-callable wrapper: refreshes only the caller's own passes, then returns
-- their current invite summary. Safe to call every time the invite page opens.
CREATE OR REPLACE FUNCTION public.refresh_my_invites()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _allowance public.invite_allowances%ROWTYPE;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Expire overdue pending passes lazily.
  UPDATE public.trail_passes
  SET status = 'EXPIRED'
  WHERE inviter_user_id = _user_id AND status = 'PENDING' AND expires_at <= now();

  PERFORM public.process_invite_maturation_for(_user_id);

  SELECT * INTO _allowance FROM public.invite_allowances WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'success', true,
    'available_passes', COALESCE(_allowance.available_passes, 0),
    'maximum_passes', COALESCE(_allowance.maximum_passes, 0),
    'eligible', _allowance.user_id IS NOT NULL
                AND _allowance.invite_eligible_at IS NOT NULL
                AND _allowance.invite_eligible_at <= now(),
    'frozen', _allowance.invites_frozen_at IS NOT NULL
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.refresh_my_invites() FROM PUBLIC, anon;