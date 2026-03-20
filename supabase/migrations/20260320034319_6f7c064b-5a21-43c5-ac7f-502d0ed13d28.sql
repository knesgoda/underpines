
-- Drop and recreate posts SELECT policy with block enforcement
DROP POLICY IF EXISTS "Users can read posts from their circles" ON posts;

CREATE POLICY "Users can read posts from their circles"
  ON posts FOR SELECT TO authenticated
  USING (
    (
      author_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM circles
        WHERE status = 'accepted'
        AND (
          (requester_id = auth.uid() AND requestee_id = posts.author_id)
          OR (requestee_id = auth.uid() AND requester_id = posts.author_id)
        )
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE (blocker_id = auth.uid() AND blocked_id = posts.author_id)
         OR (blocker_id = posts.author_id AND blocked_id = auth.uid())
    )
  );

-- Update circles SELECT policy with block enforcement
DROP POLICY IF EXISTS "Users can read their own circles" ON circles;

CREATE POLICY "Users can read their own circles"
  ON circles FOR SELECT TO authenticated
  USING (
    (requester_id = auth.uid() OR requestee_id = auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE (blocker_id = auth.uid() AND blocked_id = CASE WHEN circles.requester_id = auth.uid() THEN circles.requestee_id ELSE circles.requester_id END)
         OR (blocked_id = auth.uid() AND blocker_id = CASE WHEN circles.requester_id = auth.uid() THEN circles.requestee_id ELSE circles.requester_id END)
    )
  );

-- Update notifications SELECT policy with block enforcement
DROP POLICY IF EXISTS "Users can read their own notifications" ON notifications;

CREATE POLICY "Users can read their own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (
    recipient_id = auth.uid()
    AND (
      actor_id IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM blocks
        WHERE (blocker_id = auth.uid() AND blocked_id = notifications.actor_id)
           OR (blocker_id = notifications.actor_id AND blocked_id = auth.uid())
      )
    )
  );

-- Update campfire_participants to enforce blocks
DROP POLICY IF EXISTS "Participants can read participants" ON campfire_participants;

CREATE POLICY "Participants can read participants"
  ON campfire_participants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campfire_participants cp
      WHERE cp.campfire_id = campfire_participants.campfire_id
      AND cp.user_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE (blocker_id = auth.uid() AND blocked_id = campfire_participants.user_id)
         OR (blocker_id = campfire_participants.user_id AND blocked_id = auth.uid())
    )
  );

-- Allow users to delete circle rows (for withdraw request)
CREATE POLICY "Users can delete their own circle requests"
  ON circles FOR DELETE TO authenticated
  USING (requester_id = auth.uid() AND status = 'pending');
