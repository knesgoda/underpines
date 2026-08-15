CREATE OR REPLACE FUNCTION public.can_read_post_media(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
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
    -- Collection covers: published collections, or the author's own drafts.
    OR EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.cover_image_url LIKE '%' || _name
        AND (c.is_published = true OR c.author_id = auth.uid())
    )
    -- Group covers: mirrors the camps read policy (active + open, member, or owner).
    OR EXISTS (
      SELECT 1 FROM public.camps c
      WHERE c.cover_image_url LIKE '%' || _name
        AND (
          c.firekeeper_id = auth.uid()
          OR (c.is_active = true AND (c.visibility = 'open' OR public.is_camp_member(c.id, auth.uid())))
        )
    )
    -- Newsletter images: sent newsletters visible to group members; drafts to the author only.
    OR EXISTS (
      SELECT 1 FROM public.camp_newsletters n
      WHERE n.content LIKE '%' || _name
        AND (
          n.author_id = auth.uid()
          OR (n.status = 'sent' AND public.is_camp_member(n.camp_id, auth.uid()))
        )
    )
$$;