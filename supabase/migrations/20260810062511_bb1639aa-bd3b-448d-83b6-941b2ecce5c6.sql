-- ============================================================
-- 1. profiles: stop exposing minor-status, and hide blocked people
-- ============================================================
-- Precise location (latitude/longitude), zip_code and birth_year are already
-- withheld at the column level; age_bracket was not, which leaked which
-- members are 13-17. The admin area reads it through a definer RPC instead.
REVOKE SELECT (age_bracket) ON public.profiles FROM authenticated;

DROP POLICY IF EXISTS "Profiles are viewable by authenticated members" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated members"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = public.profiles.id)
         OR (b.blocker_id = public.profiles.id AND b.blocked_id = auth.uid())
    )
  );

-- Admin-only read of the age flag, for the member directory / member detail.
CREATE OR REPLACE FUNCTION public.admin_profile_age_flags(_ids uuid[])
RETURNS TABLE(id uuid, age_bracket text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.age_bracket
  FROM public.profiles p
  WHERE public.is_admin(auth.uid())
    AND p.id = ANY(_ids)
$$;

REVOKE ALL ON FUNCTION public.admin_profile_age_flags(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_profile_age_flags(uuid[]) TO authenticated;

-- ============================================================
-- 2. cabin_visits: no open row writes; counting moves into a function
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can increment visits" ON public.cabin_visits;
DROP POLICY IF EXISTS "Authenticated users can record visits" ON public.cabin_visits;

CREATE UNIQUE INDEX IF NOT EXISTS cabin_visits_profile_date_key
  ON public.cabin_visits (profile_id, visit_date);

-- The visitor never supplies a count, and cannot touch anyone else's row
-- except by legitimately visiting their page once per day.
CREATE OR REPLACE FUNCTION public.record_cabin_visit(_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _viewer uuid := auth.uid();
BEGIN
  IF _viewer IS NULL OR _profile_id IS NULL OR _viewer = _profile_id THEN
    RETURN;
  END IF;
  IF public.cabin_blocked(_viewer, _profile_id) THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _profile_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.cabin_visits (profile_id, visit_date, visit_count)
  VALUES (_profile_id, CURRENT_DATE, 1)
  ON CONFLICT (profile_id, visit_date)
  DO UPDATE SET visit_count = public.cabin_visits.visit_count + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.record_cabin_visit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_cabin_visit(uuid) TO authenticated;

-- ============================================================
-- 3. notifications: the claimed sender must be the caller
-- ============================================================
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Members can only send notifications as themselves"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    OR (actor_id IS NULL AND public.is_admin(auth.uid()))
  );

-- ============================================================
-- 4. storage: uploads must land in the uploader's own folder
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can upload camp covers" ON storage.objects;
CREATE POLICY "Members can upload camp covers to their own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'camp-covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated users can upload design previews" ON storage.objects;
CREATE POLICY "Members can upload design previews to their own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'design-previews'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- 5. SECURITY DEFINER functions: shrink the callable surface
-- ============================================================
-- Not callable before signing in: only the three pre-auth landings need anon.
REVOKE EXECUTE ON FUNCTION public.check_invite_rate_limit(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_waitlist_admin() FROM anon;

-- Internal helpers, trigger bodies and secret handling: never called directly
-- by the app, and not referenced by any RLS policy, so signed-in members do
-- not need EXECUTE. Nested calls from other definer functions still work,
-- because those run as the function owner.
REVOKE EXECUTE ON FUNCTION public.check_invite_rate_limit(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public._notify_user(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public._record_ranger_action(uuid, text, uuid, uuid, text, text, jsonb, jsonb, timestamptz) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.accept_invite_create_circle(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cabin_append_history(uuid, text, jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cabin_blocked(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cabin_ensure(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cabin_friends(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cabin_notify(uuid, uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cabin_transfer_trade_item(public.cabin_trade_items, uuid, uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cabin_validate_placement() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.detect_repeated_messages() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.email_hmac(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_bonfire_cap() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_new_account_rate() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_security_config() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_profile_invite() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_account_blocked(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.prepare_report() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_invite_maturation_for(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_email_verification() FROM authenticated;