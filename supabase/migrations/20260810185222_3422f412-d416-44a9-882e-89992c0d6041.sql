-- Helper: is the current viewer allowed to see _owner's member content?
CREATE OR REPLACE FUNCTION public.can_view_member_content(_owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN auth.uid() = _owner THEN true
    WHEN public.cabin_blocked(_owner, auth.uid()) THEN false
    ELSE public.cabin_friends(_owner, auth.uid())
  END
$$;

REVOKE EXECUTE ON FUNCTION public.can_view_member_content(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_member_content(uuid) TO authenticated, service_role;

-- Helper: does the owner's cabin visibility setting admit the current viewer?
CREATE OR REPLACE FUNCTION public.cabin_visible_to_viewer(_owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN auth.uid() = _owner THEN true
    ELSE public.cabin_mode_allows(
      _owner, auth.uid(),
      COALESCE((SELECT c.visibility FROM public.cabins c WHERE c.user_id = _owner), 'friends')
    )
  END
$$;

REVOKE EXECUTE ON FUNCTION public.cabin_visible_to_viewer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cabin_visible_to_viewer(uuid) TO authenticated, service_role;

-- Albums
DROP POLICY IF EXISTS "Albums are readable by members" ON public.albums;
CREATE POLICY "Albums readable by owner and connections"
  ON public.albums FOR SELECT TO authenticated
  USING (public.can_view_member_content(owner_id));

-- Album contents
DROP POLICY IF EXISTS "Album contents are readable by members" ON public.album_media;
CREATE POLICY "Album contents readable by owner and connections"
  ON public.album_media FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.albums a
    WHERE a.id = album_media.album_id
      AND public.can_view_member_content(a.owner_id)
  ));

-- Top friends
DROP POLICY IF EXISTS "Top friends are readable by members" ON public.top_friends;
CREATE POLICY "Top friends readable by owner and connections"
  ON public.top_friends FOR SELECT TO authenticated
  USING (public.can_view_member_content(owner_id));

-- Trail map pins (exact coordinates)
DROP POLICY IF EXISTS "Anyone authenticated can read pins" ON public.trail_map_pins;
CREATE POLICY "Pins readable by owner and opted-in connections"
  ON public.trail_map_pins FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      public.can_view_member_content(user_id)
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = trail_map_pins.user_id AND p.trail_map_visible IS TRUE
      )
    )
  );

-- Events
DROP POLICY IF EXISTS "Events are readable by members" ON public.events;
CREATE POLICY "Events readable by host, camp members and connections"
  ON public.events FOR SELECT TO authenticated
  USING (
    host_id = auth.uid()
    OR (camp_id IS NOT NULL AND public.is_camp_member(camp_id, auth.uid()))
    OR (camp_id IS NULL AND public.can_view_member_content(host_id))
  );

-- Cabin widgets
DROP POLICY IF EXISTS "Cabin widgets viewable by members" ON public.cabin_widgets;
CREATE POLICY "Cabin widgets follow cabin visibility"
  ON public.cabin_widgets FOR SELECT TO authenticated
  USING (public.cabin_visible_to_viewer(user_id));