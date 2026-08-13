-- Scope event RSVP reads
DROP POLICY IF EXISTS "Event responses are readable by members" ON public.event_responses;

CREATE POLICY "Event responses readable by related members"
ON public.event_responses
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_responses.event_id
      AND (
        e.host_id = auth.uid()
        OR (e.camp_id IS NOT NULL AND public.is_camp_member(e.camp_id, auth.uid()))
        OR (e.camp_id IS NULL AND public.can_view_member_content(e.host_id))
      )
  )
);

-- Design ratings: signed-in only
DROP POLICY IF EXISTS "Buyers can read ratings" ON public.design_ratings;

CREATE POLICY "Members can read ratings"
ON public.design_ratings
FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT ON public.design_ratings FROM anon;