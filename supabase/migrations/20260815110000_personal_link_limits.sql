-- Personal link limits: each personal invite link is good for 7 days and at
-- most 10 joins (both tunable via security_config:
-- personal_link_expiry_days / personal_link_max_uses). When a link expires or
-- runs out, it deactivates and the next /invites visit lazily mints a fresh
-- one — old texted links die, the panel always shows a working link. The
-- per-join allowance spend from 20260815100000 is unchanged, so total joins
-- stay bounded by the owner's pass balance no matter how often links renew.
--
-- The 10-join cap reuses the invites.uses_remaining counter that personal
-- rows previously bypassed. Rows stay is_infinite = true so validate-invite's
-- per-IP rate limiting keeps applying ("is_infinite" now means "reusable",
-- not "unlimited"). Email Trail Passes are untouched.
--
-- ⚠️ This file re-emits handle_new_user, get_invite_landing and
-- get_my_invite_link and supersedes 20260815100000 as their newest source of
-- truth. Future edits start from here. (rotate_my_invite_link and
-- accept_invite_create_circle are unchanged and still live in 20260815100000.)

-- ---------------------------------------------------------------------------
-- 1. Schema: expiry lands on invites. NULL = no expiry (legacy/root rows).
-- ---------------------------------------------------------------------------

ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Any personal row minted between the two migrations gets the limits too.
UPDATE public.invites
SET expires_at = now() + interval '7 days',
    uses_remaining = 10,
    uses_total = 10
WHERE spends_allowance AND is_active AND expires_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Landing: expired or exhausted personal links read as plain invalid
--    (the client's "This invite has expired." copy); 'resting' stays
--    reserved for a live link whose owner is frozen or out of passes.
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

  IF _invite.spends_allowance THEN
    -- A personal link dies at its expiry or its join cap...
    IF (_invite.expires_at IS NOT NULL AND _invite.expires_at <= now())
       OR _invite.uses_remaining < 1 THEN
      RETURN jsonb_build_object('valid', false);
    END IF;
    -- ...and rests while its owner is frozen or out of passes. 'resting'
    -- leaks nothing beyond what the link holder already knows (they got the
    -- link from the owner); it lets the landing say something useful.
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
-- 3. Signup gate: the personal branch also enforces expiry and the join cap,
--    and decrements uses alongside the allowance spend — atomically, under
--    the existing FOR UPDATE row lock. Hitting zero self-deactivates the
--    row, freeing the one-active-per-member index slot for auto-renewal.
--    (Re-emitted from the live body; only the spends_allowance branch grew.)
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

      -- The link itself is bounded: a week of life, ten joins.
      IF (_legacy.expires_at IS NOT NULL AND _legacy.expires_at <= now())
         OR _legacy.uses_remaining < 1 THEN
        RAISE EXCEPTION 'signup_invalid_invitation';
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

      -- Spend one of the link's ten joins; the last one retires the link.
      UPDATE public.invites
      SET uses_remaining = uses_remaining - 1,
          is_active = (uses_remaining - 1) > 0
      WHERE id = _legacy.id;

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
-- 4. get_my_invite_link: lazily retire an expired/exhausted link and mint a
--    fresh one; new links carry the week + ten-join budget. The payload now
--    answers expires_at and uses_remaining so the panel can show them.
-- ---------------------------------------------------------------------------

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
  _row public.invites%ROWTYPE;
  _handle text;
  _slug text;
  _expiry_days integer := COALESCE((_cfg->>'personal_link_expiry_days')::integer, 7);
  _max_uses integer := COALESCE((_cfg->>'personal_link_max_uses')::integer, 10);
  _expires timestamptz;
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

  SELECT * INTO _row
  FROM public.invites
  WHERE inviter_id = _user_id AND spends_allowance AND is_active;

  IF _row.id IS NOT NULL THEN
    IF (_row.expires_at IS NOT NULL AND _row.expires_at <= now())
       OR _row.uses_remaining < 1 THEN
      -- Lazily retire a spent link; a fresh one is minted below.
      UPDATE public.invites SET is_active = false WHERE id = _row.id;
    ELSE
      RETURN jsonb_build_object(
        'success', true,
        'slug', _row.slug,
        'expires_at', _row.expires_at,
        'uses_remaining', _row.uses_remaining
      );
    END IF;
  END IF;

  SELECT handle INTO _handle FROM public.profiles WHERE id = _user_id;
  _slug := COALESCE(_handle, 'member') || '-' || substr(encode(gen_random_bytes(6), 'hex'), 1, 12);
  _expires := now() + make_interval(days => _expiry_days);

  BEGIN
    INSERT INTO public.invites
      (inviter_id, slug, uses_remaining, uses_total, is_infinite, is_active, is_root, spends_allowance, expires_at)
    VALUES
      (_user_id, _slug, _max_uses, _max_uses, true, true, false, true, _expires);
  EXCEPTION WHEN unique_violation THEN
    -- A concurrent call created it first; answer with that one.
    SELECT slug, expires_at, uses_remaining
    INTO _slug, _expires, _max_uses
    FROM public.invites
    WHERE inviter_id = _user_id AND spends_allowance AND is_active;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'slug', _slug,
    'expires_at', _expires,
    'uses_remaining', _max_uses
  );
END;
$function$;
