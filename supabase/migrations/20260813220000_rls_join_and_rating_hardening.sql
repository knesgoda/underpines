-- P1 RLS hardening — 2026-08-13 database schema review findings
--
-- 1. (Critical) camp_members INSERT allowed any authenticated user to add
--    themselves to ANY camp (user_id = auth.uid() unconditionally), bypassing
--    the closed/invite-only approval flow and exposing member-only posts,
--    lodge items and newsletters.
-- 2. (Critical) campfire_participants INSERT allowed any authenticated user to
--    add themselves to ANY campfire, granting full read access to private
--    direct-message and group history (visibility is participation-gated).
-- 3. (Warning) design_ratings INSERT only checked buyer_id = auth.uid() with
--    no verified purchase, so anyone could rate any design.
--
-- Legitimate flows preserved (verified against the client code):
--   * CreateCamp: creator self-inserts as firekeeper member (camps.firekeeper_id
--     bootstrap branch) and joins the bonfire they own (campfire firekeeper branch).
--   * CampView "join": self-insert as scout into an OPEN camp, then self-join the
--     camp's bonfire campfire (can_self_join_campfire camp-membership branch).
--   * CampSettings: firekeeper/trailblazer inserts approved/invited members
--     (admin branch — may not mint new firekeepers; ownership transfer is UPDATE).
--   * NewCampfireSheet / CirclesPage / CircleButton / SuggestionBox: creator
--     inserts self + invitees right after creating the campfire (firekeeper branch).
--   * Invite-accept and accepted-join-request self-joins are permitted so the
--     approval flow works without an admin-side insert.

-- ---------------------------------------------------------------------------
-- 1) camp_members: joins require the camp to be open, an accepted request,
--    an invite naming the user, or a firekeeper/trailblazer doing the insert.
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER because the joining user cannot yet read camp_invites
-- (member-only SELECT) and must not need to.
CREATE OR REPLACE FUNCTION public.can_self_join_camp(_camp_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.camps c
    WHERE c.id = _camp_id
      AND c.is_active = true
      AND (
        c.visibility = 'open'
        OR EXISTS (
          SELECT 1 FROM public.camp_join_requests r
          WHERE r.camp_id = _camp_id
            AND r.user_id = _user_id
            AND r.status = 'accepted'
        )
        OR EXISTS (
          SELECT 1 FROM public.camp_invites i
          WHERE i.camp_id = _camp_id
            AND i.invited_user_id = _user_id
            AND COALESCE(i.uses_remaining, 1) > 0
        )
      )
  )
$$;

DROP POLICY "System can insert camp members" ON public.camp_members;

CREATE POLICY "Camp joins require approval" ON public.camp_members
FOR INSERT TO authenticated
WITH CHECK (
  (
    user_id = auth.uid()
    AND (
      -- creator bootstrapping their own camp's membership row
      EXISTS (
        SELECT 1 FROM public.camps c
        WHERE c.id = camp_members.camp_id AND c.firekeeper_id = auth.uid()
      )
      -- open camp / invite / accepted request; never as a privileged role
      OR (
        role IN ('member', 'scout')
        AND public.can_self_join_camp(camp_members.camp_id, auth.uid())
      )
    )
  )
  OR (
    -- firekeeper/trailblazer adding an approved or invited member
    public.has_camp_role(camp_members.camp_id, auth.uid(), ARRAY['firekeeper', 'trailblazer'])
    AND role <> 'firekeeper'
  )
);

-- ---------------------------------------------------------------------------
-- 2) campfire_participants: self-join only into a camp-linked campfire the
--    user is a camp member of; everything else goes through the campfire's
--    firekeeper (who adds participants at creation time).
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER because the joining user cannot yet read the campfires row
-- (participant-only SELECT).
CREATE OR REPLACE FUNCTION public.can_self_join_campfire(_campfire_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campfires cf
    WHERE cf.id = _campfire_id
      AND cf.is_active = true
      AND cf.camp_id IS NOT NULL
      AND public.is_camp_member(cf.camp_id, _user_id)
  )
$$;

DROP POLICY "Users can add participants" ON public.campfire_participants;

CREATE POLICY "Participants added by firekeeper or camp membership" ON public.campfire_participants
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campfires cf
    WHERE cf.id = campfire_participants.campfire_id AND cf.firekeeper_id = auth.uid()
  )
  OR (
    user_id = auth.uid()
    AND public.can_self_join_campfire(campfire_participants.campfire_id, auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- 3) design_ratings: rating requires a real purchase row (free purchases are
--    recorded too, so free designs stay ratable). UPDATE gets the same check
--    as WITH CHECK so a rating row cannot be re-pointed at an unpurchased
--    design, and both policies move from public to authenticated.
-- ---------------------------------------------------------------------------

DROP POLICY "Buyers can insert own rating" ON public.design_ratings;
DROP POLICY "Buyers can update own rating" ON public.design_ratings;

CREATE POLICY "Verified buyers can insert own rating" ON public.design_ratings
FOR INSERT TO authenticated
WITH CHECK (
  buyer_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.design_purchases p
    WHERE p.design_id = design_ratings.design_id AND p.buyer_id = auth.uid()
  )
);

CREATE POLICY "Verified buyers can update own rating" ON public.design_ratings
FOR UPDATE TO authenticated
USING (buyer_id = auth.uid())
WITH CHECK (
  buyer_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.design_purchases p
    WHERE p.design_id = design_ratings.design_id AND p.buyer_id = auth.uid()
  )
);
