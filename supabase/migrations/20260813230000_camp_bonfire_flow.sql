-- Fix the camp bonfire (group chat) flow — 2026-08-13
--
-- The campfires_campfire_type_check constraint only allowed
-- ('one_on_one','group','flicker'), but CreateCamp inserts
-- campfire_type = 'bonfire' — so every camp's bonfire creation has been
-- silently failing and camps have no chat room ("This group has no chat
-- room yet."). Additionally, the campfires SELECT policy was
-- participant-only, so a camp member who was not yet a bonfire participant
-- could not even discover the bonfire row to self-join it (CampView.join
-- and CampBonfire both select by camp_id + campfire_type).
--
-- Three parts:
--   1. Allow 'bonfire' as a campfire_type.
--   2. Let camp members read camp-linked campfires (message/log/reaction
--      visibility stays participant-gated; this only exposes the campfire
--      row itself, which is camp-scoped content). Pairs with
--      can_self_join_campfire from 20260813220000: a camp member can find
--      the bonfire and add themselves.
--   3. Backfill: create the missing bonfire for existing active camps and
--      enroll their current members (future joiners self-enroll in
--      CampView.join).

-- 1) Constraint
ALTER TABLE public.campfires DROP CONSTRAINT campfires_campfire_type_check;
ALTER TABLE public.campfires ADD CONSTRAINT campfires_campfire_type_check
  CHECK (campfire_type = ANY (ARRAY['one_on_one'::text, 'group'::text, 'flicker'::text, 'bonfire'::text]));

-- 2) Camp members can see their camp's campfires
CREATE POLICY "Camp members can read camp campfires" ON public.campfires
FOR SELECT TO authenticated
USING (camp_id IS NOT NULL AND public.is_camp_member(camp_id, auth.uid()));

-- 3) Backfill missing bonfires for active camps
DO $$
DECLARE
  cam record;
  bid uuid;
BEGIN
  FOR cam IN
    SELECT c.id, c.name, c.firekeeper_id
    FROM public.camps c
    WHERE c.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM public.campfires cf
        WHERE cf.camp_id = c.id
          AND cf.campfire_type = 'bonfire'
          AND cf.bonfire_sub_group_of IS NULL
      )
  LOOP
    INSERT INTO public.campfires (campfire_type, firekeeper_id, name, camp_id)
      VALUES ('bonfire', cam.firekeeper_id, cam.name || ' Bonfire', cam.id)
      RETURNING id INTO bid;

    INSERT INTO public.campfire_participants (campfire_id, user_id)
      SELECT bid, m.user_id FROM public.camp_members m WHERE m.camp_id = cam.id;
  END LOOP;
END
$$;
