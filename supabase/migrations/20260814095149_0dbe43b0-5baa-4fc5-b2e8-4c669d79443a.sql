-- 1. Peer-rank guard on the six ranger RPCs that lacked it.

CREATE OR REPLACE FUNCTION public.ranger_freeze_invites(_target uuid, _reason_code text, _case_id uuid DEFAULT NULL::uuid, _notes text DEFAULT NULL::text, _pause_outstanding boolean DEFAULT true)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _actor uuid := auth.uid();
  _paused integer := 0;
BEGIN
  IF public.ranger_level(_actor) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;
  IF _target = _actor OR public.ranger_level(_target) >= public.ranger_level(_actor) THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_action_peer');
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
$function$;

CREATE OR REPLACE FUNCTION public.ranger_require_verification(_target uuid, _case_id uuid DEFAULT NULL::uuid, _notes text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _actor uuid := auth.uid();
  _before jsonb;
BEGIN
  IF public.ranger_level(_actor) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;
  IF _target = _actor OR public.ranger_level(_target) >= public.ranger_level(_actor) THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_action_peer');
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
$function$;

CREATE OR REPLACE FUNCTION public.ranger_restrict(_target uuid, _reason_code text, _case_id uuid DEFAULT NULL::uuid, _notes text DEFAULT NULL::text, _days integer DEFAULT NULL::integer)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _actor uuid := auth.uid();
  _before jsonb;
  _ends timestamptz := CASE WHEN _days IS NULL THEN NULL ELSE now() + make_interval(days => _days) END;
BEGIN
  IF public.ranger_level(_actor) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;
  IF _target = _actor OR public.ranger_level(_target) >= public.ranger_level(_actor) THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_action_peer');
  END IF;

  SELECT jsonb_build_object('moderation_state', moderation_state)
  INTO _before FROM public.user_trust WHERE user_id = _target;

  UPDATE public.user_trust SET moderation_state = 'RESTRICTED' WHERE user_id = _target;

  PERFORM public._notify_user(_target);
  PERFORM public._record_ranger_action(_actor, 'restrict', _target, _case_id,
    _reason_code, _notes, _before, jsonb_build_object('moderation_state','RESTRICTED'), _ends);
  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.ranger_unrestrict(_target uuid, _case_id uuid DEFAULT NULL::uuid, _notes text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _actor uuid := auth.uid();
  _before jsonb;
BEGIN
  IF public.ranger_level(_actor) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;
  IF _target = _actor OR public.ranger_level(_target) >= public.ranger_level(_actor) THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_action_peer');
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
$function$;

CREATE OR REPLACE FUNCTION public.ranger_security_lock(_target uuid, _case_id uuid DEFAULT NULL::uuid, _notes text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _actor uuid := auth.uid();
BEGIN
  IF public.ranger_level(_actor) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;
  IF _target = _actor OR public.ranger_level(_target) >= public.ranger_level(_actor) THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_action_peer');
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
$function$;

CREATE OR REPLACE FUNCTION public.ranger_warn(_target uuid, _reason_code text, _case_id uuid DEFAULT NULL::uuid, _notes text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _actor uuid := auth.uid();
BEGIN
  IF public.ranger_level(_actor) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;
  IF _target = _actor OR public.ranger_level(_target) >= public.ranger_level(_actor) THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_action_peer');
  END IF;
  PERFORM public._notify_user(_target);
  PERFORM public._record_ranger_action(_actor, 'warn', _target, _case_id,
    _reason_code, _notes, NULL, NULL);
  RETURN jsonb_build_object('success', true);
END;
$function$;

-- 2. Reposts: scope reads to visible posts and respect blocks.
DROP POLICY IF EXISTS "Users can read reposts" ON public.reposts;
CREATE POLICY "Users can read visible reposts"
  ON public.reposts FOR SELECT TO authenticated
  USING (
    public.can_see_post(post_id, auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = reposts.user_id)
         OR (b.blocker_id = reposts.user_id AND b.blocked_id = auth.uid())
    )
  );