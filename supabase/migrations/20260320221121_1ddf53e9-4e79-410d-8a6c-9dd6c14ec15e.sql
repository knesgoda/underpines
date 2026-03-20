
-- Security definer function to check if user is a campfire participant (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_campfire_participant(_campfire_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campfire_participants
    WHERE campfire_id = _campfire_id AND user_id = _user_id
  )
$$;

-- Drop and recreate the problematic policies on campfire_participants
DROP POLICY IF EXISTS "Participants can read participants" ON public.campfire_participants;
CREATE POLICY "Participants can read participants"
  ON public.campfire_participants FOR SELECT TO authenticated
  USING (
    is_campfire_participant(campfire_id, auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE (blocks.blocker_id = auth.uid() AND blocks.blocked_id = campfire_participants.user_id)
         OR (blocks.blocker_id = campfire_participants.user_id AND blocks.blocked_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Firekeeper can add participants" ON public.campfire_participants;
CREATE POLICY "Users can add participants"
  ON public.campfire_participants FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM campfires WHERE id = campfire_id AND firekeeper_id = auth.uid()
    )
  );

-- Also fix policies on other tables that reference campfire_participants and could recurse
DROP POLICY IF EXISTS "Participants can read campfire messages" ON public.campfire_messages;
CREATE POLICY "Participants can read campfire messages"
  ON public.campfire_messages FOR SELECT TO authenticated
  USING (is_campfire_participant(campfire_id, auth.uid()));

DROP POLICY IF EXISTS "Participants can send messages" ON public.campfire_messages;
CREATE POLICY "Participants can send messages"
  ON public.campfire_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND is_campfire_participant(campfire_id, auth.uid()));

DROP POLICY IF EXISTS "Participants can read their campfires" ON public.campfires;
CREATE POLICY "Participants can read their campfires"
  ON public.campfires FOR SELECT TO authenticated
  USING (is_campfire_participant(id, auth.uid()));

DROP POLICY IF EXISTS "Participants can read log" ON public.campfire_log;
CREATE POLICY "Participants can read log"
  ON public.campfire_log FOR SELECT TO authenticated
  USING (is_campfire_participant(campfire_id, auth.uid()));

DROP POLICY IF EXISTS "Participants can add to log" ON public.campfire_log;
CREATE POLICY "Participants can add to log"
  ON public.campfire_log FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND is_campfire_participant(campfire_id, auth.uid()));
