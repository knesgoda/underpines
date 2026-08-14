-- Personal multi-use invite links.
--
-- Each member gets one reusable link they can text or share anywhere. Every
-- signup through it spends ONE pass from the owner's invite_allowances — a
-- leaked link is bounded by the owner's balance, a ranger freeze stops it
-- instantly, and the owner can rotate it (deactivate-and-recreate) if it
-- leaks. Email-bound Trail Passes are untouched and remain the personal,
-- email-locked path.
--
-- Rides on the legacy invites pipeline (slug landing, validate-invite IP
-- rate limiting, the invites branch of handle_new_user) rather than a new
-- table: personal rows are marked spends_allowance = true and is_infinite =
-- true (the allowance is the only counter; uses_remaining is bypassed).
--
-- ⚠️ This file re-emits handle_new_user, accept_invite_create_circle and
-- rotate_invite_link from their LIVE prod bodies (pg_get_functiondef,
-- 2026-08-14) and is now the newest source of truth for all three. Future
-- edits start from here.

-- ---------------------------------------------------------------------------
-- 1. Schema: mark personal rows; one active personal link per member.
-- ---------------------------------------------------------------------------

ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS spends_allowance boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_invites_personal_active
  ON public.invites (inviter_id)
  WHERE spends_allowance AND is_active;

-- Lineage vocabulary gains the new kind. (Constraint name verified in prod.)
ALTER TABLE public.user_lineage
  DROP CONSTRAINT user_lineage_source_kind_check;
ALTER TABLE public.user_lineage
  ADD CONSTRAINT user_lineage_source_kind_check
  CHECK (source_kind IN ('trail_pass', 'legacy_link', 'root_link', 'personal_link', 'unknown'));

-- ---------------------------------------------------------------------------
-- 2. Landing: personal links also answer for the owner's balance.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_invite_landing(_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _invite public.invites%ROWTYPE;
  _name text;
  _handle text;
BEGIN
  SELECT * INTO _invite FROM public.invites WHERE slug = _slug;

  IF _invite.id IS NULL
     OR NOT _invite.is_active
     OR (NOT _invite.is_infinite AND _invite.uses_remaining <= 0) THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  -- A personal link only works while its owner has passes and is not frozen.
  -- 'resting' leaks nothing beyond what the link holder already knows (they
  -- got the link from the owner); it lets the landing say something useful.
  IF _invite.spends_allowance THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.invite_allowances
      WHERE user_id = _invite.inviter_id
        AND invites_frozen_at IS NULL
        AND available_passes >= 1
    ) THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'resting');
    END IF;
  END IF;

  IF NOT _invite.is_root THEN
    SELECT display_name, handle INTO _name, _handle
    FROM public.profiles WHERE id = _invite.inviter_id;
  END IF;

  -- invite_id is returned because signup passes it back as metadata; the
  -- signup gate re-validates active/uses under a row lock, so the id alone
  -- grants nothing.
  RETURN jsonb_build_object(
    'valid', true,
    'invite_id', _invite.id,
    'is_root', _invite.is_root,
    'inviter_name', _name,
    'inviter_handle', _handle
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. Signup gate: a personal link spends one pass, atomically.
--    (Re-emitted from the live body; only the _legacy_invite_id branch is
--    restructured — the trail-pass and invite-only branches are verbatim.)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _cfg jsonb := public.get_security_config();
  _invite_only boolean := COALESCE((_cfg->>'INVITE_ONLY_SIGNUP')::boolean, true);
  _token text := NULLIF(NEW.raw_user_meta_data->>'trail_pass_token', '');
  _legacy_invite_id uuid := NULLIF(NEW.raw_user_meta_data->>'invite_id', '')::uuid;
  _pass public.trail_passes%ROWTYPE;
  _legacy public.invites%ROWTYPE;
  _allowance public.invite_allowances%ROWTYPE;
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
    SELECT * INTO _legacy
    FROM public.invites
    WHERE id = _legacy_invite_id AND is_active = true
    FOR UPDATE;

    IF _legacy.id IS NULL THEN
      RAISE EXCEPTION 'signup_invalid_invitation';
    END IF;

    IF _legacy.spends_allowance THEN
      -- Personal link: spends one of the owner's passes, atomically. Not
      -- subject to LEGACY_LINK_REDEMPTION_ENABLED (that flag drains the old
      -- slug links); has its own kill switch.
      IF NOT COALESCE((_cfg->>'PERSONAL_LINKS_ENABLED')::boolean, true) THEN
        RAISE EXCEPTION 'signup_requires_invitation';
      END IF;

      SELECT * INTO _allowance
      FROM public.invite_allowances
      WHERE user_id = _legacy.inviter_id
      FOR UPDATE;

      IF _allowance.user_id IS NULL
         OR _allowance.invites_frozen_at IS NOT NULL
         OR _allowance.invite_eligible_at IS NULL
         OR _allowance.invite_eligible_at > now()
         OR _allowance.available_passes < 1 THEN
        RAISE EXCEPTION 'signup_invalid_invitation';
      END IF;

      UPDATE public.invite_allowances
      SET available_passes = available_passes - 1
      WHERE user_id = _legacy.inviter_id;

      INSERT INTO public.trust_events (user_id, event_type, weight, category, source_type, source_id)
      VALUES (_legacy.inviter_id, 'INVITE_REDEEMED', 0, 'invite', 'personal_link', _legacy.id);

    ELSE
      IF NOT COALESCE((_cfg->>'LEGACY_LINK_REDEMPTION_ENABLED')::boolean, true) THEN
        RAISE EXCEPTION 'signup_requires_invitation';
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

    -- Tell the inviter their pass was used. notify_user swallows its own
    -- failures — this can never abort a signup.
    PERFORM public.notify_user(_pass.inviter_user_id, NEW.id, 'invite_accepted');

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
$function$;

-- ---------------------------------------------------------------------------
-- 4. Lineage/circles for link signups: personal links get their own kind.
--    (Re-emitted from the live body; only the source_kind CASE changed.)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.accept_invite_create_circle(_invite_id uuid, _new_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inviter_id uuid;
  v_is_root boolean;
  v_spends_allowance boolean;
BEGIN
  SELECT inviter_id, is_root, spends_allowance
  INTO v_inviter_id, v_is_root, v_spends_allowance
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
    CASE
      WHEN v_is_root THEN 'root_link'
      WHEN v_spends_allowance THEN 'personal_link'
      ELSE 'legacy_link'
    END
  )
  ON CONFLICT (user_id) DO NOTHING;

  IF v_is_root OR v_inviter_id = _new_user_id THEN
    RETURN;
  END IF;

  -- Tell the inviter their link was used.
  PERFORM public.notify_user(v_inviter_id, _new_user_id, 'invite_accepted');

  INSERT INTO public.circles (requester_id, requestee_id, status, created_at, updated_at)
  VALUES (v_inviter_id, _new_user_id, 'accepted', now(), now())
  ON CONFLICT DO NOTHING;

  INSERT INTO public.circles (requester_id, requestee_id, status, created_at, updated_at)
  VALUES (_new_user_id, v_inviter_id, 'accepted', now(), now())
  ON CONFLICT DO NOTHING;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 5. Member RPCs: get (lazily create) and rotate the personal link.
-- ---------------------------------------------------------------------------

-- Eligibility mirrors create_trail_pass: blocked, moderated, low-trust,
-- frozen, or not-yet-eligible members do not get a shareable door.
CREATE OR REPLACE FUNCTION public.get_my_invite_link()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _cfg jsonb := public.get_security_config();
  _allowance public.invite_allowances%ROWTYPE;
  _trust public.user_trust%ROWTYPE;
  _handle text;
  _slug text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF NOT COALESCE((_cfg->>'PERSONAL_LINKS_ENABLED')::boolean, true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'links_disabled');
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

  SELECT * INTO _allowance FROM public.invite_allowances WHERE user_id = _user_id;
  IF _allowance.user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_eligible');
  END IF;
  IF _allowance.invites_frozen_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invites_frozen');
  END IF;
  IF _allowance.invite_eligible_at IS NULL OR _allowance.invite_eligible_at > now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_yet_eligible');
  END IF;

  SELECT slug INTO _slug
  FROM public.invites
  WHERE inviter_id = _user_id AND spends_allowance AND is_active;

  IF _slug IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'slug', _slug);
  END IF;

  SELECT handle INTO _handle FROM public.profiles WHERE id = _user_id;
  _slug := COALESCE(_handle, 'member') || '-' || substr(encode(gen_random_bytes(6), 'hex'), 1, 12);

  BEGIN
    INSERT INTO public.invites
      (inviter_id, slug, uses_remaining, uses_total, is_infinite, is_active, is_root, spends_allowance)
    VALUES
      (_user_id, _slug, 0, 0, true, true, false, true);
  EXCEPTION WHEN unique_violation THEN
    -- A concurrent call created it first; answer with that one.
    SELECT slug INTO _slug
    FROM public.invites
    WHERE inviter_id = _user_id AND spends_allowance AND is_active;
  END;

  RETURN jsonb_build_object('success', true, 'slug', _slug);
END;
$function$;

-- Deactivate-and-recreate, never rename in place: get_invite_landing hands
-- the row's invite_id to any visitor, and signup validates by that id — a
-- renamed slug would leave a captured id redeemable forever. Killing the row
-- revokes both.
CREATE OR REPLACE FUNCTION public.rotate_my_invite_link()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  UPDATE public.invites
  SET is_active = false
  WHERE inviter_id = _user_id AND spends_allowance AND is_active;

  -- Re-runs the full eligibility gate, so an ineligible member cannot mint a
  -- fresh link by rotating.
  RETURN public.get_my_invite_link();
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_my_invite_link() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rotate_my_invite_link() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_invite_link() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_my_invite_link() TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. The founder's admin link rotation must not touch personal rows —
--    without the exclusion it renames both of an admin's infinite rows to
--    one slug and dies on the UNIQUE constraint (the 2026-08-13 bug class).
--    (Re-emitted from the live body; only the WHERE gained the exclusion.)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rotate_invite_link(_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _handle text;
  _new_token text;
  _new_slug text;
BEGIN
  -- The caller may only rotate their own link, and must be an admin.
  IF _user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT handle INTO _handle FROM public.profiles WHERE id = auth.uid();
  _new_token := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
  _new_slug := _handle || '-' || _new_token;

  UPDATE public.invites
  SET slug = _new_slug,
      secret_token = _new_token
  WHERE inviter_id = auth.uid()
    AND is_infinite = true
    AND is_root IS NOT TRUE
    AND spends_allowance IS NOT TRUE;

  RETURN _new_slug;
END;
$function$;
