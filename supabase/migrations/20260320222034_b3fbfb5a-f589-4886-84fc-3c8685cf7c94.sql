-- Add ip_hash to invite_uses for IP-based rate limiting
ALTER TABLE invite_uses ADD COLUMN IF NOT EXISTS ip_hash text;

-- Add secret_token to invites for slug hardening on infinite invites
ALTER TABLE invites ADD COLUMN IF NOT EXISTS secret_token text;

-- Generate token for existing infinite invites
UPDATE invites
SET secret_token = substr(md5(random()::text || clock_timestamp()::text), 1, 8),
    slug = slug || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8)
WHERE is_infinite = true AND secret_token IS NULL;

-- Update the handle_new_profile_invite function to generate hardened slugs for admins
CREATE OR REPLACE FUNCTION public.handle_new_profile_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_admin boolean;
  _token text;
  _slug text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.id AND role = 'admin'
  ) INTO _is_admin;

  _token := substr(md5(random()::text || clock_timestamp()::text), 1, 8);

  IF _is_admin THEN
    _slug := NEW.handle || '-' || _token;
  ELSE
    _slug := NEW.handle;
  END IF;

  INSERT INTO public.invites (inviter_id, slug, uses_remaining, uses_total, is_infinite, is_active, secret_token)
  VALUES (
    NEW.id,
    _slug,
    CASE WHEN _is_admin THEN 999999 ELSE 3 END,
    CASE WHEN _is_admin THEN 999999 ELSE 3 END,
    _is_admin,
    true,
    CASE WHEN _is_admin THEN _token ELSE NULL END
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create rate limit check function (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.check_invite_rate_limit(_invite_id uuid, _ip_hash text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_infinite boolean;
  _hourly_count integer;
  _daily_count integer;
  _ip_daily_count integer;
BEGIN
  -- Check if this is an infinite (founder/admin) invite
  SELECT is_infinite INTO _is_infinite
  FROM public.invites WHERE id = _invite_id;

  IF NOT _is_infinite THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  -- Count uses in the last hour
  SELECT count(*) INTO _hourly_count
  FROM public.invite_uses
  WHERE invite_id = _invite_id
    AND used_at >= now() - interval '1 hour';

  IF _hourly_count >= 5 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'hourly_limit');
  END IF;

  -- Count uses in the last 24 hours
  SELECT count(*) INTO _daily_count
  FROM public.invite_uses
  WHERE invite_id = _invite_id
    AND used_at >= now() - interval '24 hours';

  IF _daily_count >= 20 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'daily_limit');
  END IF;

  -- IP-based: max 1 signup per IP per 24 hours (any invite)
  IF _ip_hash IS NOT NULL AND _ip_hash != '' THEN
    SELECT count(*) INTO _ip_daily_count
    FROM public.invite_uses
    WHERE ip_hash = _ip_hash
      AND used_at >= now() - interval '24 hours';

    IF _ip_daily_count >= 1 THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'ip_limit');
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Function to rotate founder invite link
CREATE OR REPLACE FUNCTION public.rotate_invite_link(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _handle text;
  _new_token text;
  _new_slug text;
BEGIN
  -- Verify user is admin
  IF NOT public.is_admin(_user_id) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT handle INTO _handle FROM public.profiles WHERE id = _user_id;
  _new_token := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
  _new_slug := _handle || '-' || _new_token;

  UPDATE public.invites
  SET slug = _new_slug,
      secret_token = _new_token
  WHERE inviter_id = _user_id
    AND is_infinite = true;

  RETURN _new_slug;
END;
$$;