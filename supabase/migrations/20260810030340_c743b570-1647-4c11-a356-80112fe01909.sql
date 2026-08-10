-- 1. Profile PII: column-level read privileges (no lat/lng/zip/birth_year)
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, handle, display_name, bio, mantra, currently_type, currently_value, city,
  accent_color, atmosphere, layout, cabin_mood, pinned_song_title, pinned_song_artist,
  pinned_song_preview_url, header_image_url, is_pines_plus, created_at, updated_at,
  feed_show_sparks, feed_show_stories, feed_show_embers, feed_show_quotes,
  feed_show_camp_posts, feed_scroll_reminder, quiet_mode, ember_unsubscribed,
  applied_design_id, avatar_url, default_avatar_key, seedling_ends_at, last_active_at,
  theme, age_bracket, is_age_verified, account_status, country_code, biome, hometown,
  job, links, interests, how_found, sitting_question, ask_me_about,
  pinned_memory_post_id, featured_photos, moments, trail_map_visible,
  spotify_track_id, spotify_preview_url, cabin_player_type, messenger_skin,
  onboarding_completed_at, last_seen_at
) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 2. Pine pets honour the owner's visibility setting
DROP POLICY IF EXISTS "Anyone authenticated can view pets" ON public.pine_pets;
CREATE POLICY "Pets visible per owner visibility" ON public.pine_pets
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.cabin_mode_allows(owner_id, auth.uid(), COALESCE(visibility, 'everyone'))
  );

-- 3. Personal social tables: signed-in members only (no anon reads)
DROP POLICY IF EXISTS "Albums are readable" ON public.albums;
CREATE POLICY "Albums are readable by members" ON public.albums
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Album contents are readable" ON public.album_media;
CREATE POLICY "Album contents are readable by members" ON public.album_media
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Top friends are readable" ON public.top_friends;
CREATE POLICY "Top friends are readable by members" ON public.top_friends
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Events are readable" ON public.events;
CREATE POLICY "Events are readable by members" ON public.events
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Event responses are readable" ON public.event_responses;
CREATE POLICY "Event responses are readable by members" ON public.event_responses
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Cabin widgets viewable by everyone" ON public.cabin_widgets;
CREATE POLICY "Cabin widgets viewable by members" ON public.cabin_widgets
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Wall notes are readable when not blocked" ON public.wall_notes;
CREATE POLICY "Wall notes are readable by members when not blocked" ON public.wall_notes
  FOR SELECT TO authenticated
  USING (
    NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = wall_notes.profile_id AND b.blocked_id = auth.uid())
         OR (b.blocker_id = auth.uid() AND b.blocked_id = wall_notes.profile_id)
    )
  );

-- 4. is_admin must mean admin, not "any ranger"
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.ranger_level(_user_id) >= 3
$$;

-- 5. Fixed search_path on the remaining helpers
ALTER FUNCTION public.normalize_email(text) SET search_path = public;
ALTER FUNCTION public.normalize_content_for_hash(text) SET search_path = public;
ALTER FUNCTION public.forbid_audit_mutation() SET search_path = public;

-- 6. Function execute privileges
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
-- Pre-auth landing lookups stay callable by anon
GRANT EXECUTE ON FUNCTION public.get_invite_landing(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_trail_pass_status(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_invite_rate_limit(uuid, text) TO anon;

-- Internal-only helpers: not callable by members either
REVOKE EXECUTE ON FUNCTION public._notify_user(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cabin_append_history(uuid, text, jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cabin_ensure(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cabin_notify(uuid, uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.email_hmac(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.accept_invite_create_circle(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_security_config() FROM authenticated;