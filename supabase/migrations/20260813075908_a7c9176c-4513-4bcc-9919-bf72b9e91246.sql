-- 1. Hard-revoke sensitive profile columns from broad reads (idempotent belt-and-braces).
REVOKE SELECT (latitude, longitude, zip_code, age_bracket, birth_year)
  ON public.profiles FROM authenticated, anon;

-- 2. Scope post-media reads to content the viewer is actually allowed to see.
CREATE OR REPLACE FUNCTION public.can_read_post_media(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- The uploader always sees their own objects.
    (storage.foldername(_name))[1] = (auth.uid())::text
    -- Post images / post media, gated by the existing post visibility check.
    OR EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.image_url LIKE '%' || _name
        AND public.can_see_post(p.id, auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.post_media pm
      JOIN public.posts p ON p.id = pm.post_id
      WHERE pm.url LIKE '%' || _name
        AND public.can_see_post(p.id, auth.uid())
    )
    -- Direct-message media: participants only.
    OR EXISTS (
      SELECT 1 FROM public.campfire_messages m
      JOIN public.campfire_participants cp ON cp.campfire_id = m.campfire_id
      WHERE m.media_url LIKE '%' || _name
        AND cp.user_id = auth.uid()
    )
    -- Group post media: group members only.
    OR EXISTS (
      SELECT 1 FROM public.camp_post_media cpm
      JOIN public.camp_posts cp ON cp.id = cpm.camp_post_id
      JOIN public.camp_members cm ON cm.camp_id = cp.camp_id
      WHERE cpm.url LIKE '%' || _name
        AND cm.user_id = auth.uid()
    )
    -- Intentionally broad surfaces for signed-in members.
    OR EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.cover_image_url LIKE '%' || _name
    )
    OR EXISTS (
      SELECT 1 FROM public.camps c
      WHERE c.cover_image_url LIKE '%' || _name
    )
    OR EXISTS (
      SELECT 1 FROM public.camp_newsletters n
      WHERE n.content LIKE '%' || _name
    )
$$;

REVOKE ALL ON FUNCTION public.can_read_post_media(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_post_media(text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Members can read post media" ON storage.objects;
CREATE POLICY "Members can read post media they are allowed to see"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'post-media' AND public.can_read_post_media(name));