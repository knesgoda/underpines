CREATE OR REPLACE FUNCTION public.get_boot_state(_campfires_seen_at timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN NULL ELSE jsonb_build_object(
    'profile', (
      SELECT to_jsonb(t) FROM (
        SELECT p.id, p.display_name, p.handle, p.avatar_url, p.default_avatar_key,
               p.accent_color, p.cabin_mood, p.bio, p.is_pines_plus, p.created_at,
               p.theme, p.messenger_skin, p.onboarding_completed_at,
               p.is_age_verified, p.age_bracket
        FROM public.profiles p
        WHERE p.id = auth.uid()
      ) t
    ),
    'roles', COALESCE(
      (SELECT jsonb_agg(ur.role::text) FROM public.user_roles ur WHERE ur.user_id = auth.uid()),
      '[]'::jsonb
    ),
    'is_admin', public.is_admin(auth.uid()),
    'suspension', (
      SELECT to_jsonb(t) FROM (
        SELECT s.reason, s.suspended_until, s.is_permanent
        FROM public.suspensions s
        WHERE s.user_id = auth.uid()
          AND (s.is_permanent OR (s.suspended_until IS NOT NULL AND s.suspended_until > now()))
      ) t
    ),
    'unread_notifications', (
      SELECT count(*) FROM public.notifications n
      WHERE n.recipient_id = auth.uid()
        AND n.is_read = false
        AND n.notification_type <> 'reaction_batch'
    ),
    'has_unread_messages', EXISTS (
      SELECT 1
      FROM public.campfire_messages m
      JOIN public.campfire_participants cp ON cp.campfire_id = m.campfire_id
      WHERE cp.user_id = auth.uid()
        AND m.sender_id <> auth.uid()
        AND m.created_at > COALESCE(_campfires_seen_at, '-infinity'::timestamptz)
    )
  ) END;
$$;

REVOKE ALL ON FUNCTION public.get_boot_state(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_boot_state(timestamptz) TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.get_boot_state(timestamptz) IS
  'Single-request boot payload: profile, theme, roles, suspension, age flag, onboarding state and unread counts. Replaces nine client requests. See src/hooks/useBootState.ts.';