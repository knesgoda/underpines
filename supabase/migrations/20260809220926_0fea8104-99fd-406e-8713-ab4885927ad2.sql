-- ============================================================================
-- RANGER STATION — moderation action RPCs, trail lineage, appeals review
--
-- Every action: (1) verifies the caller's ranger level server-side,
-- (2) records a moderation_actions row with a structured reason code,
-- (3) appends to the tamper-resistant admin_audit_log with before/after
-- state, and (4) is reversible. Clients receive {success:...} JSON and are
-- never trusted for role, state, or risk data.
--
-- Level requirements: 1 Ranger, 2 Senior Ranger, 3 Head Ranger.
-- ============================================================================

-- Internal helper: writes the action + audit trail. Not client-callable.
CREATE OR REPLACE FUNCTION public._record_ranger_action(
  _actor uuid,
  _action_type text,
  _target_user uuid,
  _case_id uuid,
  _reason_code text,
  _notes text,
  _before jsonb,
  _after jsonb,
  _ends_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _action_id uuid;
BEGIN
  INSERT INTO public.moderation_actions
    (admin_id, target_user_id, action_type, action_detail, case_id,
     reason_code, starts_at, ends_at)
  VALUES
    (_actor, _target_user, _action_type, _notes, _case_id,
     _reason_code, now(), _ends_at)
  RETURNING id INTO _action_id;

  INSERT INTO public.admin_audit_log
    (actor_admin_id, action_type, target_type, target_id, case_id,
     before_state, after_state, reason_code, notes)
  VALUES
    (_actor, _action_type, 'user', _target_user, _case_id,
     _before, _after, _reason_code, _notes);

  IF _case_id IS NOT NULL THEN
    UPDATE public.moderation_cases
    SET status = CASE WHEN status IN ('NEW','TRIAGED','IN_REVIEW') THEN 'ACTIONED' ELSE status END
    WHERE id = _case_id;
  END IF;

  RETURN _action_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._record_ranger_action(uuid,text,uuid,uuid,text,text,jsonb,jsonb,timestamptz)
  FROM PUBLIC, anon, authenticated;

-- Internal helper: user-facing note in the Lantern (notification feed).
CREATE OR REPLACE FUNCTION public._notify_user(_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.notifications (recipient_id, notification_type)
  VALUES (_user_id, 'system');
$$;
REVOKE EXECUTE ON FUNCTION public._notify_user(uuid) FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Mark Safe (level 1): clears active suspicion; evidence is kept.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ranger_mark_safe(
  _target uuid, _case_id uuid DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _before jsonb;
BEGIN
  IF public.ranger_level(_actor) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  SELECT jsonb_build_object('risk_level', risk_level, 'moderation_state', moderation_state)
  INTO _before FROM public.user_trust WHERE user_id = _target;

  UPDATE public.user_trust
  SET risk_level = 'NONE',
      risk_updated_at = now(),
      moderation_state = CASE WHEN moderation_state IN ('REVIEW_HOLD') THEN 'NONE' ELSE moderation_state END
  WHERE user_id = _target;

  -- Signals are expired, not deleted: false-positive learning needs them.
  UPDATE public.risk_signals
  SET expires_at = now()
  WHERE user_id = _target AND (expires_at IS NULL OR expires_at > now());

  IF _case_id IS NOT NULL THEN
    UPDATE public.moderation_cases
    SET status = 'CLOSED', resolved_at = now(), resolution = 'mark_safe',
        resolution_reason_code = 'FALSE_POSITIVE_REVERSAL', resolution_notes = _notes
    WHERE id = _case_id;
  END IF;

  INSERT INTO public.trust_events (user_id, event_type, weight, category, source_type, source_id)
  VALUES (_target, 'MARKED_SAFE_BY_RANGER', 10, 'moderation', 'moderation_case', _case_id);

  PERFORM public._record_ranger_action(_actor, 'mark_safe', _target, _case_id,
    'FALSE_POSITIVE_REVERSAL', _notes, _before, jsonb_build_object('risk_level','NONE'));
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ranger_mark_safe(uuid,uuid,text) FROM PUBLIC, anon;

-- ----------------------------------------------------------------------------
-- Require verification (level 1)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ranger_require_verification(
  _target uuid, _case_id uuid DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _before jsonb;
BEGIN
  IF public.ranger_level(_actor) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  SELECT jsonb_build_object('moderation_state', moderation_state)
  INTO _before FROM public.user_trust WHERE user_id = _target;

  UPDATE public.user_trust SET moderation_state = 'VERIFICATION_REQUIRED' WHERE user_id = _target;

  INSERT INTO public.account_verifications (user_id, reverification_required_at)
  VALUES (_target, now())
  ON CONFLICT (user_id) DO UPDATE SET reverification_required_at = now();

  PERFORM public._notify_user(_target);
  PERFORM public._record_ranger_action(_actor, 'require_verification', _target, _case_id,
    'POLICY_VIOLATION_OTHER', _notes, _before,
    jsonb_build_object('moderation_state','VERIFICATION_REQUIRED'));
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ranger_require_verification(uuid,uuid,text) FROM PUBLIC, anon;

-- ----------------------------------------------------------------------------
-- Restrict / Unrestrict (level 1)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ranger_restrict(
  _target uuid, _reason_code text, _case_id uuid DEFAULT NULL,
  _notes text DEFAULT NULL, _days integer DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _before jsonb;
  _ends timestamptz := CASE WHEN _days IS NULL THEN NULL ELSE now() + make_interval(days => _days) END;
BEGIN
  IF public.ranger_level(_actor) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  SELECT jsonb_build_object('moderation_state', moderation_state)
  INTO _before FROM public.user_trust WHERE user_id = _target;

  UPDATE public.user_trust SET moderation_state = 'RESTRICTED' WHERE user_id = _target;

  PERFORM public._notify_user(_target);
  PERFORM public._record_ranger_action(_actor, 'restrict', _target, _case_id,
    _reason_code, _notes, _before, jsonb_build_object('moderation_state','RESTRICTED'), _ends);
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ranger_restrict(uuid,text,uuid,text,integer) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.ranger_unrestrict(
  _target uuid, _case_id uuid DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _before jsonb;
BEGIN
  IF public.ranger_level(_actor) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  SELECT jsonb_build_object('moderation_state', moderation_state)
  INTO _before FROM public.user_trust WHERE user_id = _target;

  UPDATE public.user_trust
  SET moderation_state = 'NONE'
  WHERE user_id = _target
    AND moderation_state IN ('RESTRICTED','VERIFICATION_REQUIRED','REVIEW_HOLD');

  PERFORM public._record_ranger_action(_actor, 'unrestrict', _target, _case_id,
    'FALSE_POSITIVE_REVERSAL', _notes, _before, jsonb_build_object('moderation_state','NONE'));
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ranger_unrestrict(uuid,uuid,text) FROM PUBLIC, anon;

-- ----------------------------------------------------------------------------
-- Freeze / unfreeze invites (level 1). Containment, not punishment: the
-- account keeps working, only Trail Passes stop.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ranger_freeze_invites(
  _target uuid, _reason_code text, _case_id uuid DEFAULT NULL,
  _notes text DEFAULT NULL, _pause_outstanding boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _paused integer := 0;
BEGIN
  IF public.ranger_level(_actor) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  UPDATE public.invite_allowances
  SET invites_frozen_at = now(), frozen_reason_code = _reason_code
  WHERE user_id = _target;
  IF NOT FOUND THEN
    INSERT INTO public.invite_allowances (user_id, invites_frozen_at, frozen_reason_code)
    VALUES (_target, now(), _reason_code)
    ON CONFLICT (user_id) DO UPDATE
      SET invites_frozen_at = now(), frozen_reason_code = _reason_code;
  END IF;

  IF _pause_outstanding THEN
    UPDATE public.trail_passes
    SET status = 'PAUSED', paused_at = now()
    WHERE inviter_user_id = _target AND status = 'PENDING';
    GET DIAGNOSTICS _paused = ROW_COUNT;
  END IF;

  PERFORM public._notify_user(_target);
  PERFORM public._record_ranger_action(_actor, 'freeze_invites', _target, _case_id,
    _reason_code, _notes, NULL,
    jsonb_build_object('invites_frozen', true, 'passes_paused', _paused));
  RETURN jsonb_build_object('success', true, 'passes_paused', _paused);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ranger_freeze_invites(uuid,text,uuid,text,boolean) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.ranger_unfreeze_invites(
  _target uuid, _case_id uuid DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
BEGIN
  IF public.ranger_level(_actor) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  UPDATE public.invite_allowances
  SET invites_frozen_at = NULL, frozen_reason_code = NULL
  WHERE user_id = _target;

  -- Paused-but-unexpired passes come back to life; overdue ones expire.
  UPDATE public.trail_passes
  SET status = CASE WHEN expires_at > now() THEN 'PENDING' ELSE 'EXPIRED' END,
      paused_at = NULL
  WHERE inviter_user_id = _target AND status = 'PAUSED';

  PERFORM public._record_ranger_action(_actor, 'unfreeze_invites', _target, _case_id,
    'FALSE_POSITIVE_REVERSAL', _notes, NULL, jsonb_build_object('invites_frozen', false));
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ranger_unfreeze_invites(uuid,uuid,text) FROM PUBLIC, anon;

-- ----------------------------------------------------------------------------
-- Revoke outstanding invites (level 2)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ranger_revoke_outstanding_invites(
  _target uuid, _reason_code text, _case_id uuid DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _revoked integer;
BEGIN
  IF public.ranger_level(_actor) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  UPDATE public.trail_passes
  SET status = 'REVOKED', revoked_at = now(), revoked_by = _actor,
      revocation_reason = _reason_code
  WHERE inviter_user_id = _target AND status IN ('PENDING','PAUSED');
  GET DIAGNOSTICS _revoked = ROW_COUNT;

  PERFORM public._record_ranger_action(_actor, 'revoke_invites', _target, _case_id,
    _reason_code, _notes, NULL, jsonb_build_object('passes_revoked', _revoked));
  RETURN jsonb_build_object('success', true, 'passes_revoked', _revoked);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ranger_revoke_outstanding_invites(uuid,text,uuid,text) FROM PUBLIC, anon;

-- ----------------------------------------------------------------------------
-- Close / reopen a trail branch (level 2): freeze invites for an account and
-- optionally its whole descendant branch. Accounts keep working (spec §74).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ranger_close_trail(
  _root uuid, _include_descendants boolean, _reason_code text,
  _case_id uuid DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _affected uuid[];
  _uid uuid;
BEGIN
  IF public.ranger_level(_actor) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  IF _include_descendants THEN
    WITH RECURSIVE branch AS (
      SELECT _root AS user_id
      UNION
      SELECT l.user_id
      FROM public.user_lineage l
      JOIN branch b ON l.invited_by_user_id = b.user_id
    )
    SELECT array_agg(user_id) INTO _affected FROM branch;
  ELSE
    _affected := ARRAY[_root];
  END IF;

  FOREACH _uid IN ARRAY _affected LOOP
    INSERT INTO public.invite_allowances (user_id, invites_frozen_at, frozen_reason_code)
    VALUES (_uid, now(), _reason_code)
    ON CONFLICT (user_id) DO UPDATE
      SET invites_frozen_at = now(), frozen_reason_code = _reason_code;

    UPDATE public.trail_passes
    SET status = 'PAUSED', paused_at = now()
    WHERE inviter_user_id = _uid AND status = 'PENDING';
  END LOOP;

  PERFORM public._notify_user(_root);
  PERFORM public._record_ranger_action(_actor, 'close_trail', _root, _case_id,
    _reason_code, _notes, NULL,
    jsonb_build_object('affected_count', COALESCE(array_length(_affected, 1), 0),
                       'include_descendants', _include_descendants,
                       'affected_user_ids', to_jsonb(_affected)));
  RETURN jsonb_build_object('success', true,
    'affected_count', COALESCE(array_length(_affected, 1), 0));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ranger_close_trail(uuid,boolean,text,uuid,text) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.ranger_reopen_trail(
  _root uuid, _include_descendants boolean, _case_id uuid DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _affected uuid[];
  _uid uuid;
BEGIN
  IF public.ranger_level(_actor) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  IF _include_descendants THEN
    WITH RECURSIVE branch AS (
      SELECT _root AS user_id
      UNION
      SELECT l.user_id
      FROM public.user_lineage l
      JOIN branch b ON l.invited_by_user_id = b.user_id
    )
    SELECT array_agg(user_id) INTO _affected FROM branch;
  ELSE
    _affected := ARRAY[_root];
  END IF;

  FOREACH _uid IN ARRAY _affected LOOP
    UPDATE public.invite_allowances
    SET invites_frozen_at = NULL, frozen_reason_code = NULL
    WHERE user_id = _uid;

    UPDATE public.trail_passes
    SET status = CASE WHEN expires_at > now() THEN 'PENDING' ELSE 'EXPIRED' END,
        paused_at = NULL
    WHERE inviter_user_id = _uid AND status = 'PAUSED';
  END LOOP;

  PERFORM public._record_ranger_action(_actor, 'reopen_trail', _root, _case_id,
    'FALSE_POSITIVE_REVERSAL', _notes, NULL,
    jsonb_build_object('affected_count', COALESCE(array_length(_affected, 1), 0)));
  RETURN jsonb_build_object('success', true,
    'affected_count', COALESCE(array_length(_affected, 1), 0));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ranger_reopen_trail(uuid,boolean,uuid,text) FROM PUBLIC, anon;

-- ----------------------------------------------------------------------------
-- Warn (level 1)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ranger_warn(
  _target uuid, _reason_code text, _case_id uuid DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
BEGIN
  IF public.ranger_level(_actor) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;
  PERFORM public._notify_user(_target);
  PERFORM public._record_ranger_action(_actor, 'warn', _target, _case_id,
    _reason_code, _notes, NULL, NULL);
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ranger_warn(uuid,text,uuid,text) FROM PUBLIC, anon;

-- ----------------------------------------------------------------------------
-- Suspend (level 2) / Security lock (level 1) / Ban (level 3) / Restore
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ranger_suspend(
  _target uuid, _days integer, _reason_code text,
  _case_id uuid DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _until timestamptz := CASE WHEN _days IS NULL THEN NULL ELSE now() + make_interval(days => _days) END;
  _before jsonb;
BEGIN
  IF public.ranger_level(_actor) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;
  IF public.ranger_level(_target) >= public.ranger_level(_actor) THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_action_peer');
  END IF;

  SELECT to_jsonb(s) INTO _before FROM public.suspensions s WHERE s.user_id = _target;

  INSERT INTO public.suspensions (user_id, suspended_by, reason, suspended_until, is_permanent)
  VALUES (_target, _actor, COALESCE(_notes, _reason_code), _until, false)
  ON CONFLICT (user_id) DO UPDATE
    SET suspended_by = EXCLUDED.suspended_by, reason = EXCLUDED.reason,
        suspended_until = EXCLUDED.suspended_until, is_permanent = false;

  UPDATE public.user_trust SET moderation_state = 'SUSPENDED' WHERE user_id = _target;

  PERFORM public._record_ranger_action(_actor, 'suspend', _target, _case_id,
    _reason_code, _notes, _before,
    jsonb_build_object('suspended_until', _until), _until);
  RETURN jsonb_build_object('success', true, 'suspended_until', _until);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ranger_suspend(uuid,integer,text,uuid,text) FROM PUBLIC, anon;

-- For suspected account compromise: hold the account and require
-- reverification, without treating the victim as an abuser.
CREATE OR REPLACE FUNCTION public.ranger_security_lock(
  _target uuid, _case_id uuid DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
BEGIN
  IF public.ranger_level(_actor) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  INSERT INTO public.suspensions (user_id, suspended_by, reason, suspended_until, is_permanent)
  VALUES (_target, _actor,
          'Account temporarily locked for security review', NULL, false)
  ON CONFLICT (user_id) DO UPDATE
    SET suspended_by = EXCLUDED.suspended_by, reason = EXCLUDED.reason,
        suspended_until = NULL, is_permanent = false;

  UPDATE public.user_trust SET moderation_state = 'SECURITY_LOCK' WHERE user_id = _target;

  INSERT INTO public.account_verifications (user_id, reverification_required_at)
  VALUES (_target, now())
  ON CONFLICT (user_id) DO UPDATE SET reverification_required_at = now();

  PERFORM public._record_ranger_action(_actor, 'security_lock', _target, _case_id,
    'COMPROMISED_ACCOUNT', _notes, NULL,
    jsonb_build_object('moderation_state','SECURITY_LOCK'));
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ranger_security_lock(uuid,uuid,text) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.ranger_ban(
  _target uuid, _reason_code text, _case_id uuid DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _before jsonb;
BEGIN
  -- Permanent removal is Head Ranger only (spec §57/§59).
  IF public.ranger_level(_actor) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;
  IF _target = _actor OR public.ranger_level(_target) >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_action_peer');
  END IF;

  SELECT to_jsonb(s) INTO _before FROM public.suspensions s WHERE s.user_id = _target;

  INSERT INTO public.suspensions (user_id, suspended_by, reason, suspended_until, is_permanent)
  VALUES (_target, _actor, COALESCE(_notes, _reason_code), NULL, true)
  ON CONFLICT (user_id) DO UPDATE
    SET suspended_by = EXCLUDED.suspended_by, reason = EXCLUDED.reason,
        suspended_until = NULL, is_permanent = true;

  UPDATE public.user_trust SET moderation_state = 'BANNED' WHERE user_id = _target;

  -- Contain the branch: no further growth from this account.
  UPDATE public.invite_allowances
  SET invites_frozen_at = now(), frozen_reason_code = _reason_code
  WHERE user_id = _target;
  UPDATE public.trail_passes
  SET status = 'REVOKED', revoked_at = now(), revoked_by = _actor,
      revocation_reason = 'inviter_banned'
  WHERE inviter_user_id = _target AND status IN ('PENDING','PAUSED');

  -- Invite accountability (spec §19/§20): the inviter's invite trust takes a
  -- hit, recorded as an explainable event — never automatic punishment.
  INSERT INTO public.trust_events (user_id, event_type, weight, category, source_type, source_id)
  SELECT l.invited_by_user_id, 'CONFIRMED_BAD_INVITEE', -50, 'invite', 'user', _target
  FROM public.user_lineage l
  WHERE l.user_id = _target AND l.invited_by_user_id IS NOT NULL;

  UPDATE public.user_trust ut
  SET invite_trust_score = GREATEST(ut.invite_trust_score - 50, 0)
  FROM public.user_lineage l
  WHERE l.user_id = _target AND l.invited_by_user_id = ut.user_id;

  PERFORM public._record_ranger_action(_actor, 'ban', _target, _case_id,
    _reason_code, _notes, _before, jsonb_build_object('banned', true));
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ranger_ban(uuid,text,uuid,text) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.ranger_restore(
  _target uuid, _reason_code text, _case_id uuid DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _suspension public.suspensions%ROWTYPE;
  _required integer := 2;
BEGIN
  SELECT * INTO _suspension FROM public.suspensions WHERE user_id = _target;
  IF _suspension.is_permanent THEN
    _required := 3;  -- only Head Rangers reverse permanent bans
  END IF;
  IF public.ranger_level(_actor) < _required THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  DELETE FROM public.suspensions WHERE user_id = _target;
  UPDATE public.user_trust SET moderation_state = 'NONE' WHERE user_id = _target;

  INSERT INTO public.trust_events (user_id, event_type, weight, category, source_type)
  VALUES (_target, 'ACCOUNT_RESTORED', 0, 'moderation', 'ranger');

  PERFORM public._notify_user(_target);
  PERFORM public._record_ranger_action(_actor, 'restore', _target, _case_id,
    _reason_code, _notes, to_jsonb(_suspension), jsonb_build_object('restored', true));
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ranger_restore(uuid,text,uuid,text) FROM PUBLIC, anon;

-- ----------------------------------------------------------------------------
-- Case management (level 1) and appeal review (level 2)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ranger_open_case(
  _subject uuid, _case_type text, _priority text DEFAULT 'MEDIUM', _summary text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _case_id uuid;
BEGIN
  IF public.ranger_level(_actor) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  INSERT INTO public.moderation_cases
    (case_type, subject_user_id, status, priority, summary, auto_generated, created_by)
  VALUES (_case_type, _subject, 'NEW', _priority, _summary, false, _actor)
  RETURNING id INTO _case_id;

  INSERT INTO public.admin_audit_log
    (actor_admin_id, action_type, target_type, target_id, case_id, notes)
  VALUES (_actor, 'open_case', 'user', _subject, _case_id, _summary);

  RETURN jsonb_build_object('success', true, 'case_id', _case_id);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ranger_open_case(uuid,text,text,text) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.ranger_review_appeal(
  _appeal_id uuid, _decision text, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _appeal public.appeals%ROWTYPE;
  _restore jsonb;
BEGIN
  IF public.ranger_level(_actor) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;
  IF _decision NOT IN ('uphold','modify','reverse') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_decision');
  END IF;

  SELECT * INTO _appeal FROM public.appeals WHERE id = _appeal_id FOR UPDATE;
  IF _appeal.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF _decision = 'reverse' THEN
    _restore := public.ranger_restore(_appeal.user_id, 'USER_APPEAL_APPROVED', _appeal.case_id, _notes);
    IF NOT (_restore->>'success')::boolean THEN
      RETURN _restore;  -- e.g. a Senior Ranger cannot reverse a permanent ban
    END IF;
  END IF;

  UPDATE public.appeals
  SET status = CASE _decision WHEN 'uphold' THEN 'UPHELD'
                              WHEN 'modify' THEN 'MODIFIED'
                              ELSE 'REVERSED' END,
      reviewed_by = _actor, reviewed_at = now(),
      outcome = _decision, outcome_notes = _notes
  WHERE id = _appeal_id;

  INSERT INTO public.admin_audit_log
    (actor_admin_id, action_type, target_type, target_id, case_id, reason_code, notes)
  VALUES (_actor, 'review_appeal', 'appeal', _appeal_id, _appeal.case_id,
          CASE _decision WHEN 'reverse' THEN 'USER_APPEAL_APPROVED' ELSE 'POLICY_VIOLATION_OTHER' END,
          _notes);

  PERFORM public._notify_user(_appeal.user_id);
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ranger_review_appeal(uuid,text,text) FROM PUBLIC, anon;

-- ----------------------------------------------------------------------------
-- Trail lineage (level 1): ancestors + descendants around one account,
-- with per-node risk/moderation context for the Trail Map.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_trail_lineage(_user_id uuid, _max_depth integer DEFAULT 3)
RETURNS TABLE (
  user_id uuid,
  handle text,
  display_name text,
  relation text,          -- 'self' | 'ancestor' | 'descendant'
  depth integer,          -- generations away from the subject
  invited_by_user_id uuid,
  account_created_at timestamptz,
  trust_state text,
  risk_level text,
  moderation_state text,
  invites_frozen boolean,
  is_suspended boolean,
  report_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
-- Unqualified names in the query resolve to columns, not to the OUT
-- parameters ('relation' etc. would otherwise be ambiguous at runtime).
#variable_conflict use_column
BEGIN
  IF public.ranger_level(auth.uid()) < 1 THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  WITH RECURSIVE ancestors AS (
    SELECT l.user_id AS uid, l.invited_by_user_id, 0 AS d
    FROM public.user_lineage l WHERE l.user_id = _user_id
    UNION ALL
    SELECT l.user_id, l.invited_by_user_id, a.d + 1
    FROM public.user_lineage l
    JOIN ancestors a ON l.user_id = a.invited_by_user_id
    WHERE a.d < _max_depth
  ),
  descendants AS (
    SELECT _user_id AS uid, 0 AS d
    UNION ALL
    SELECT l.user_id, dd.d + 1
    FROM public.user_lineage l
    JOIN descendants dd ON l.invited_by_user_id = dd.uid
    WHERE dd.d < _max_depth
  ),
  nodes AS (
    SELECT uid, d, CASE WHEN d = 0 THEN 'self' ELSE 'ancestor' END AS relation FROM ancestors
    UNION
    SELECT uid, d, CASE WHEN d = 0 THEN 'self' ELSE 'descendant' END AS relation FROM descendants
  )
  SELECT
    n.uid,
    p.handle,
    p.display_name,
    n.relation,
    n.d,
    l.invited_by_user_id,
    p.created_at,
    COALESCE(ut.trust_state, 'NEW'),
    COALESCE(ut.risk_level, 'NONE'),
    COALESCE(ut.moderation_state, 'NONE'),
    (ia.invites_frozen_at IS NOT NULL),
    public.is_account_blocked(n.uid),
    (SELECT count(*) FROM public.reports r WHERE r.reported_user_id = n.uid)
  FROM (SELECT DISTINCT ON (uid) uid, d, relation
        FROM nodes ORDER BY uid, CASE relation WHEN 'self' THEN 0 ELSE 1 END) n
  JOIN public.profiles p ON p.id = n.uid
  LEFT JOIN public.user_lineage l ON l.user_id = n.uid
  LEFT JOIN public.user_trust ut ON ut.user_id = n.uid
  LEFT JOIN public.invite_allowances ia ON ia.user_id = n.uid
  ORDER BY n.relation, n.d, p.created_at;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_trail_lineage(uuid, integer) FROM PUBLIC, anon;

-- ----------------------------------------------------------------------------
-- Function privileges
-- ----------------------------------------------------------------------------
-- REVOKE ... FROM PUBLIC above removed the default EXECUTE grant from every
-- role, so re-grant deliberately: user-callable RPCs to authenticated (their
-- bodies enforce identity/role), internal helpers to service_role only.

-- User-callable (invite system)
GRANT EXECUTE ON FUNCTION public.create_trail_pass(text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_trail_pass(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.redeem_trail_pass(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_my_invites() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_trail_pass_status(text) TO anon, authenticated, service_role;

-- Ranger-callable (bodies verify ranger_level server-side)
GRANT EXECUTE ON FUNCTION public.ranger_mark_safe(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ranger_require_verification(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ranger_restrict(uuid, text, uuid, text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ranger_unrestrict(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ranger_freeze_invites(uuid, text, uuid, text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ranger_unfreeze_invites(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ranger_revoke_outstanding_invites(uuid, text, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ranger_close_trail(uuid, boolean, text, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ranger_reopen_trail(uuid, boolean, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ranger_warn(uuid, text, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ranger_suspend(uuid, integer, text, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ranger_security_lock(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ranger_ban(uuid, text, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ranger_restore(uuid, text, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ranger_open_case(uuid, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ranger_review_appeal(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_trail_lineage(uuid, integer) TO authenticated, service_role;

-- Internal / service-role only
GRANT EXECUTE ON FUNCTION public.get_security_config() TO service_role;
GRANT EXECUTE ON FUNCTION public.email_hmac(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_reporter_count(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_invite_maturation_for(uuid) TO service_role;