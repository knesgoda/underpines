-- ============================================================================
-- HUMAN TRUST / TRAIL SYSTEM — PHASE 1: DATA & PERMISSIONS
--
-- Additive foundation for invite lineage, account trust, risk signals,
-- moderation cases, appeals, verification storage, versioned security
-- configuration, and an append-only admin audit log.
--
-- Design constraints honoured here:
--  * profiles has a public SELECT policy, so nothing sensitive is added to
--    profiles. Trust scores, lineage, and risk data live in dedicated tables
--    with restrictive RLS.
--  * The legacy slug-link invite system (invites / invite_uses) keeps working
--    during the transition; new email-bound single-use passes get their own
--    table (trail_passes) instead of overloading rows that are publicly
--    readable by design.
--  * All writes to trust/moderation tables happen through SECURITY DEFINER
--    functions or service-role edge functions — there are deliberately no
--    INSERT/UPDATE policies for ordinary users on those tables.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- Role ladder
-- ----------------------------------------------------------------------------
-- 0 = not staff, 1 = Ranger, 2 = Senior Ranger, 3 = Head Ranger.
-- Existing roles slot in: moderator -> 1, admin/founder -> 3, so current
-- staff keep working without a data migration.
CREATE OR REPLACE FUNCTION public.ranger_level(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(
    CASE role::text
      WHEN 'head_ranger'   THEN 3
      WHEN 'founder'       THEN 3
      WHEN 'admin'         THEN 3
      WHEN 'senior_ranger' THEN 2
      WHEN 'moderator'     THEN 1
      WHEN 'ranger'        THEN 1
      ELSE 0
    END), 0)
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.is_ranger(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.ranger_level(_user_id) >= 1
$$;

-- Existing RLS across reports/moderation_actions/suspensions/etc. gates on
-- is_admin(); the new ranger roles must pass those same checks or a user
-- granted only 'ranger' could see the queue but none of its contents.
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.ranger_level(_user_id) >= 1
$$;

-- ----------------------------------------------------------------------------
-- Versioned security configuration
-- ----------------------------------------------------------------------------
-- One active row at a time; changing policy inserts a new version rather than
-- editing in place, so old risk decisions stay reproducible via their stored
-- policy version.
CREATE TABLE IF NOT EXISTS public.security_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  config jsonb NOT NULL,
  active boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.security_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Head Rangers can read security config"
  ON public.security_config FOR SELECT TO authenticated
  USING (public.ranger_level(auth.uid()) >= 3);

-- Readable only from SECURITY DEFINER functions and service role — thresholds
-- must never reach normal clients.
CREATE OR REPLACE FUNCTION public.get_security_config()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT config FROM public.security_config
  WHERE active = true
  ORDER BY created_at DESC
  LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.get_security_config() FROM PUBLIC, anon, authenticated;

INSERT INTO public.security_config (version, config, active)
VALUES (
  '2026-08-09-v1',
  jsonb_build_object(
    -- Feature flags
    'INVITE_ONLY_SIGNUP', true,
    'TRAIL_PASSES_ENABLED', true,
    'LEGACY_PERSONAL_LINKS_ENABLED', false,   -- new accounts no longer get slug links
    'LEGACY_LINK_REDEMPTION_ENABLED', true,   -- outstanding slug links keep working during transition
    'TURNSTILE_ENABLED', false,               -- needs TURNSTILE_SECRET_KEY; see docs
    'EMAIL_RISK_ENABLED', true,
    'PHONE_STEP_UP_ENABLED', false,           -- needs SMS provider credentials; see docs
    'BEHAVIOR_RISK_ENABLED', true,
    'AUTO_TRAIL_FREEZE_ENABLED', true,
    'COMMUNITY_BOT_REPORTS_ENABLED', true,
    'RANGER_STATION_ENABLED', true,
    'TRAIL_MAP_ENABLED', true,
    -- Invitations
    'invite_eligibility_days', 7,
    'invite_expiry_days', 7,
    'invite_maturation_days', 14,
    'max_passes_new', 2,
    'max_passes_established', 3,
    'max_passes_trusted', 5,
    'invite_min_trust_score', 50,
    -- Risk thresholds (internal; never exposed to clients)
    'risk_phone_stepup_score', 60,
    'risk_review_score', 80,
    'risk_reject_score', 95,
    'auto_freeze_min_suspicious_descendants', 3,
    -- Reporting
    'report_burst_window_seconds', 120,
    'report_burst_threshold', 5,
    'report_daily_limit_per_user', 20,
    -- New-account rate limits (per day)
    'limit_new_dm_recipients', 10,
    'limit_new_follows', 25,
    'limit_new_posts', 15,
    'limit_new_messages', 200
  ),
  true
)
ON CONFLICT (version) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Invite lineage (Trail Lineage)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_lineage (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  source_invite_id uuid,
  source_kind text NOT NULL DEFAULT 'legacy_link'
    CHECK (source_kind IN ('trail_pass', 'legacy_link', 'root_link', 'unknown')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_lineage_inviter
  ON public.user_lineage (invited_by_user_id);

ALTER TABLE public.user_lineage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own lineage, Rangers see all"
  ON public.user_lineage FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR invited_by_user_id = auth.uid()
         OR public.is_ranger(auth.uid()));

-- Backfill from the legacy invite history. Root open-signup links carry no
-- meaningful human vouching, so they record no inviter.
INSERT INTO public.user_lineage (user_id, invited_by_user_id, source_invite_id, source_kind, created_at)
SELECT
  iu.invitee_id,
  CASE WHEN i.is_root THEN NULL ELSE i.inviter_id END,
  iu.invite_id,
  CASE WHEN i.is_root THEN 'root_link' ELSE 'legacy_link' END,
  iu.used_at
FROM public.invite_uses iu
JOIN public.invites i ON i.id = iu.invite_id
ON CONFLICT (user_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Account trust (internal only — no user-visible score)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_trust (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  trust_score integer NOT NULL DEFAULT 100 CHECK (trust_score BETWEEN 0 AND 1000),
  invite_trust_score integer NOT NULL DEFAULT 100 CHECK (invite_trust_score BETWEEN 0 AND 1000),
  trust_state text NOT NULL DEFAULT 'NEW'
    CHECK (trust_state IN ('NEW','DEVELOPING','ESTABLISHED','TRUSTED')),
  moderation_state text NOT NULL DEFAULT 'NONE'
    CHECK (moderation_state IN ('NONE','RESTRICTED','VERIFICATION_REQUIRED','INVITE_SUSPENDED',
                                'REVIEW_HOLD','SECURITY_LOCK','SUSPENDED','BANNED')),
  risk_level text NOT NULL DEFAULT 'NONE'
    CHECK (risk_level IN ('NONE','LOW','MEDIUM','HIGH','CRITICAL')),
  risk_updated_at timestamptz,
  policy_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_trust ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rangers can read trust records"
  ON public.user_trust FOR SELECT TO authenticated
  USING (public.is_ranger(auth.uid()));

CREATE TRIGGER update_user_trust_updated_at
  BEFORE UPDATE ON public.user_trust
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.user_trust (user_id, trust_state, trust_score)
SELECT
  p.id,
  CASE
    WHEN p.created_at <= now() - interval '90 days' THEN 'ESTABLISHED'
    WHEN p.created_at <= now() - interval '14 days' THEN 'DEVELOPING'
    ELSE 'NEW'
  END,
  CASE
    WHEN p.created_at <= now() - interval '90 days' THEN 400
    WHEN p.created_at <= now() - interval '14 days' THEN 250
    ELSE 100
  END
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Trust events (explainability: score changes must be reconstructible)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trust_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  weight integer NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'general'
    CHECK (category IN ('general','invite','behavior','verification','moderation','report')),
  source_type text,
  source_id uuid,
  policy_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trust_events_user ON public.trust_events (user_id, created_at DESC);

ALTER TABLE public.trust_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rangers can read trust events"
  ON public.trust_events FOR SELECT TO authenticated
  USING (public.is_ranger(auth.uid()));

-- ----------------------------------------------------------------------------
-- Risk signals (raw, expirable, explainable)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.risk_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  signal_type text NOT NULL,
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low','medium','high','critical')),
  confidence numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  observed_value jsonb,
  explanation text NOT NULL,
  source text NOT NULL DEFAULT 'system',
  case_id uuid,
  policy_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_risk_signals_user ON public.risk_signals (user_id, created_at DESC);

ALTER TABLE public.risk_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rangers can read risk signals"
  ON public.risk_signals FOR SELECT TO authenticated
  USING (public.is_ranger(auth.uid()));

-- ----------------------------------------------------------------------------
-- Trail Passes (single-use, email-bound invitations)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trail_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_email_normalized text NOT NULL,
  invitee_email_hmac text,
  invitee_name text,
  personal_message text,
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','REDEEMED','EXPIRED','REVOKED','PAUSED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  redeemed_at timestamptz,
  redeemed_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.profiles(id),
  revocation_reason text,
  paused_at timestamptz,
  risk_at_redemption jsonb,
  -- set when this pass's invitee matured and the inviter's allowance was
  -- credited; guarantees regeneration happens exactly once per pass
  matured_credited_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_trail_passes_inviter ON public.trail_passes (inviter_user_id, status);
CREATE INDEX IF NOT EXISTS idx_trail_passes_email_hmac ON public.trail_passes (invitee_email_hmac);

ALTER TABLE public.trail_passes ENABLE ROW LEVEL SECURITY;

-- The inviter may see their own passes (they legitimately know the invitee
-- email; the raw token is never stored). Rangers see all. All writes go
-- through SECURITY DEFINER functions.
CREATE POLICY "Inviters and Rangers can read trail passes"
  ON public.trail_passes FOR SELECT TO authenticated
  USING (inviter_user_id = auth.uid() OR public.is_ranger(auth.uid()));

-- ----------------------------------------------------------------------------
-- Invite allowances (regenerative pass balance)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invite_allowances (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  available_passes integer NOT NULL DEFAULT 0 CHECK (available_passes >= 0),
  maximum_passes integer NOT NULL DEFAULT 2 CHECK (maximum_passes >= 0),
  invite_tier text NOT NULL DEFAULT 'new'
    CHECK (invite_tier IN ('new','established','trusted','head')),
  invite_eligible_at timestamptz,
  invites_frozen_at timestamptz,
  frozen_reason_code text,
  last_regeneration_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invite_allowances ENABLE ROW LEVEL SECURITY;

-- Users may see their own balance and frozen/eligibility state (the UI needs
-- it); the freeze reason code is internal but not sensitive. Writes are
-- server-side only.
CREATE POLICY "Users see own allowance, Rangers see all"
  ON public.invite_allowances FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_ranger(auth.uid()));

CREATE TRIGGER update_invite_allowances_updated_at
  BEFORE UPDATE ON public.invite_allowances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill: existing members are already part of the community, so they are
-- invite-eligible now (subject to trust checks at issue time). New accounts
-- start at zero and become eligible after the configured waiting period.
INSERT INTO public.invite_allowances
  (user_id, available_passes, maximum_passes, invite_tier, invite_eligible_at)
SELECT
  p.id,
  CASE WHEN public.ranger_level(p.id) >= 3 THEN 5
       WHEN p.created_at <= now() - interval '7 days' THEN 2
       ELSE 0 END,
  CASE WHEN public.ranger_level(p.id) >= 3 THEN 5
       WHEN p.created_at <= now() - interval '7 days' THEN 3
       ELSE 2 END,
  CASE WHEN public.ranger_level(p.id) >= 3 THEN 'head'
       WHEN p.created_at <= now() - interval '90 days' THEN 'established'
       ELSE 'new' END,
  p.created_at + interval '7 days'
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Moderation cases
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.moderation_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number serial,
  case_type text NOT NULL
    CHECK (case_type IN ('BOT_SUSPECTED','SPAM','SCAM','HARASSMENT','IMPERSONATION',
                         'INVITE_ABUSE','REPORT_BRIGADING','ACCOUNT_COMPROMISE','APPEAL','OTHER')),
  subject_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'NEW'
    CHECK (status IN ('NEW','TRIAGED','IN_REVIEW','WAITING_FOR_USER','ACTIONED',
                      'APPEALED','CLOSED','ESCALATED')),
  priority text NOT NULL DEFAULT 'MEDIUM'
    CHECK (priority IN ('CRITICAL','HIGH','MEDIUM','LOW')),
  summary text,
  risk_score_at_creation integer,
  auto_generated boolean NOT NULL DEFAULT false,
  parent_case_id uuid REFERENCES public.moderation_cases(id),
  created_by uuid REFERENCES public.profiles(id),
  assigned_ranger_id uuid REFERENCES public.profiles(id),
  resolved_at timestamptz,
  resolution text,
  resolution_reason_code text,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_status
  ON public.moderation_cases (status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_subject
  ON public.moderation_cases (subject_user_id);

ALTER TABLE public.moderation_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rangers can read cases"
  ON public.moderation_cases FOR SELECT TO authenticated
  USING (public.is_ranger(auth.uid()));

CREATE POLICY "Rangers can update cases"
  ON public.moderation_cases FOR UPDATE TO authenticated
  USING (public.is_ranger(auth.uid()));

CREATE TRIGGER update_moderation_cases_updated_at
  BEFORE UPDATE ON public.moderation_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- risk_signals.case_id can now reference cases
ALTER TABLE public.risk_signals
  ADD CONSTRAINT risk_signals_case_id_fkey
  FOREIGN KEY (case_id) REFERENCES public.moderation_cases(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- Reports: bot category + case linkage + coordination metadata
-- ----------------------------------------------------------------------------
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_report_reason_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_report_reason_check
  CHECK (report_reason IN ('harmful_dangerous','spam_fake','wrong_camp','suspected_bot','other'));

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS subcategory text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS case_id uuid REFERENCES public.moderation_cases(id) ON DELETE SET NULL;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reporter_weight_at_time numeric;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS coordination_risk text
  CHECK (coordination_risk IS NULL OR coordination_risk IN ('none','possible','likely'));
CREATE INDEX IF NOT EXISTS idx_reports_case ON public.reports (case_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON public.reports (reported_user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- Moderation actions: reason codes, case linkage, reversibility
-- ----------------------------------------------------------------------------
ALTER TABLE public.moderation_actions ADD COLUMN IF NOT EXISTS case_id uuid REFERENCES public.moderation_cases(id) ON DELETE SET NULL;
ALTER TABLE public.moderation_actions ADD COLUMN IF NOT EXISTS reason_code text;
ALTER TABLE public.moderation_actions ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE public.moderation_actions ADD COLUMN IF NOT EXISTS ends_at timestamptz;
ALTER TABLE public.moderation_actions ADD COLUMN IF NOT EXISTS reversed_at timestamptz;
ALTER TABLE public.moderation_actions ADD COLUMN IF NOT EXISTS reversed_by uuid REFERENCES public.profiles(id);

ALTER TABLE public.moderation_actions DROP CONSTRAINT IF EXISTS moderation_actions_action_type_check;
ALTER TABLE public.moderation_actions ADD CONSTRAINT moderation_actions_action_type_check
  CHECK (action_type IN (
    -- legacy values (kept so history stays valid)
    'warn','suspend','ban','clear','hide_content','restore_content','adjust_invites','note',
    -- Ranger Station actions
    'mark_safe','require_verification','restrict','unrestrict','freeze_invites','unfreeze_invites',
    'close_trail','reopen_trail','revoke_invites','security_lock','restore'
  ));

-- ----------------------------------------------------------------------------
-- Verification store (separated from profile data; more restricted)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_verifications (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_verified_at timestamptz,
  phone_verified_at timestamptz,
  -- keyed HMAC for abuse correlation; the phone number space is small, so a
  -- plain hash would be reversible by brute force. Raw/encrypted phone is
  -- stored only if operationally necessary and only server-side.
  phone_hmac text,
  phone_encrypted text,
  phone_risk text CHECK (phone_risk IS NULL OR phone_risk IN ('low','medium','high')),
  verification_provider text,
  reverification_required_at timestamptz,
  last_challenge_at timestamptz,
  failed_attempt_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_account_verifications_phone_hmac
  ON public.account_verifications (phone_hmac);

ALTER TABLE public.account_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own verification, Rangers see all"
  ON public.account_verifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_ranger(auth.uid()));

CREATE TRIGGER update_account_verifications_updated_at
  BEFORE UPDATE ON public.account_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mirror email verification state for existing users from auth metadata is
-- handled lazily server-side (auth.users is not readable from migrations in
-- all environments), so rows are created on demand.

-- ----------------------------------------------------------------------------
-- Appeals
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.moderation_cases(id) ON DELETE SET NULL,
  action_id uuid REFERENCES public.moderation_actions(id) ON DELETE SET NULL,
  appeal_text text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN','IN_REVIEW','UPHELD','MODIFIED','REVERSED','CLOSED')),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  outcome text,
  outcome_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_appeals_status ON public.appeals (status, created_at DESC);

ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own appeals, Rangers see all"
  ON public.appeals FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_ranger(auth.uid()));

CREATE POLICY "Users can file their own appeals"
  ON public.appeals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND char_length(appeal_text) BETWEEN 1 AND 5000);

-- ----------------------------------------------------------------------------
-- Append-only admin audit log
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_admin_id uuid REFERENCES public.profiles(id),
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  case_id uuid REFERENCES public.moderation_cases(id) ON DELETE SET NULL,
  before_state jsonb,
  after_state jsonb,
  reason_code text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor
  ON public.admin_audit_log (actor_admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target
  ON public.admin_audit_log (target_type, target_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Head Rangers can read the audit log"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.ranger_level(auth.uid()) >= 3);

-- Tamper resistance: the log is append-only for every role, including table
-- owners running through triggers. History is never rewritten.
CREATE OR REPLACE FUNCTION public.forbid_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_log is append-only';
END;
$$;

DROP TRIGGER IF EXISTS admin_audit_log_no_update ON public.admin_audit_log;
CREATE TRIGGER admin_audit_log_no_update
  BEFORE UPDATE OR DELETE ON public.admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.forbid_audit_mutation();

-- ----------------------------------------------------------------------------
-- New-profile bootstrap: allowances + trust instead of automatic slug links
-- ----------------------------------------------------------------------------
-- Replaces the legacy behaviour where every new profile received an active
-- 3-use slug invite immediately. New members now start with zero passes and
-- become eligible after the configured waiting period. Legacy personal links
-- are only created if the (default-off) config flag re-enables them.
CREATE OR REPLACE FUNCTION public.handle_new_profile_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _cfg jsonb;
  _eligibility_days integer;
  _is_admin boolean;
  _token text;
BEGIN
  _cfg := public.get_security_config();
  _eligibility_days := COALESCE((_cfg->>'invite_eligibility_days')::integer, 7);

  SELECT public.ranger_level(NEW.id) >= 3 INTO _is_admin;

  INSERT INTO public.invite_allowances
    (user_id, available_passes, maximum_passes, invite_tier, invite_eligible_at)
  VALUES (
    NEW.id,
    CASE WHEN _is_admin THEN 5 ELSE 0 END,
    CASE WHEN _is_admin THEN 5 ELSE COALESCE((_cfg->>'max_passes_new')::integer, 2) END,
    CASE WHEN _is_admin THEN 'head' ELSE 'new' END,
    CASE WHEN _is_admin THEN now() ELSE now() + make_interval(days => _eligibility_days) END
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_trust (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  IF COALESCE((_cfg->>'LEGACY_PERSONAL_LINKS_ENABLED')::boolean, false) THEN
    _token := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
    INSERT INTO public.invites (inviter_id, slug, uses_remaining, uses_total, is_infinite, is_active)
    VALUES (NEW.id, NEW.handle || '-' || _token, 3, 3, false, true)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Legacy redemption path: keep circle creation, and additionally record
-- lineage so accounts created through outstanding slug links still join the
-- Trail System graph.
CREATE OR REPLACE FUNCTION public.accept_invite_create_circle(_invite_id uuid, _new_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inviter_id uuid;
  v_is_root boolean;
BEGIN
  SELECT inviter_id, is_root INTO v_inviter_id, v_is_root
  FROM public.invites
  WHERE id = _invite_id;

  IF v_inviter_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.user_lineage (user_id, invited_by_user_id, source_invite_id, source_kind)
  VALUES (
    _new_user_id,
    CASE WHEN v_is_root THEN NULL ELSE v_inviter_id END,
    _invite_id,
    CASE WHEN v_is_root THEN 'root_link' ELSE 'legacy_link' END
  )
  ON CONFLICT (user_id) DO NOTHING;

  IF v_is_root OR v_inviter_id = _new_user_id THEN
    RETURN;
  END IF;

  INSERT INTO public.circles (requester_id, requestee_id, status, created_at, updated_at)
  VALUES (v_inviter_id, _new_user_id, 'accepted', now(), now())
  ON CONFLICT DO NOTHING;

  INSERT INTO public.circles (requester_id, requestee_id, status, created_at, updated_at)
  VALUES (_new_user_id, v_inviter_id, 'accepted', now(), now())
  ON CONFLICT DO NOTHING;
END;
$$;