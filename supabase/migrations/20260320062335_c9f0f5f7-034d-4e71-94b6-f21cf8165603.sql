
-- Function to auto-create an invite when a profile is created
CREATE OR REPLACE FUNCTION public.handle_new_profile_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_admin boolean;
BEGIN
  -- Check if user is admin/owner via user_roles
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.id AND role = 'admin'
  ) INTO _is_admin;

  INSERT INTO public.invites (inviter_id, slug, uses_remaining, uses_total, is_infinite, is_active)
  VALUES (
    NEW.id,
    NEW.handle,
    CASE WHEN _is_admin THEN 999999 ELSE 3 END,
    CASE WHEN _is_admin THEN 999999 ELSE 3 END,
    _is_admin,
    true
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
CREATE TRIGGER on_profile_created_create_invite
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile_invite();

-- Backfill: create invites for existing profiles that don't have one
INSERT INTO public.invites (inviter_id, slug, uses_remaining, uses_total, is_infinite, is_active)
SELECT
  p.id,
  p.handle,
  CASE WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin') THEN 999999 ELSE 3 END,
  CASE WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin') THEN 999999 ELSE 3 END,
  CASE WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin') THEN true ELSE false END,
  true
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.invites i WHERE i.inviter_id = p.id
);
