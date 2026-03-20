DROP POLICY IF EXISTS "Participants can read their campfires" ON public.campfires;

CREATE POLICY "Participants can read their campfires"
ON public.campfires
FOR SELECT
TO authenticated
USING (
  firekeeper_id = auth.uid()
  OR public.is_campfire_participant(id, auth.uid())
);