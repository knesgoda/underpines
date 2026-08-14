-- Notification send paths move server-side; design_ratings reads scoped.
--
-- Scanner findings (2026-08-14 deep scan), triaged in SECURITY.md:
--
-- 1. The notifications INSERT policy let any member write a `smoke_signal` or
--    `camp_newsletter` row at ANY recipient_id — a spam vector that also
--    bypassed notify_user()'s block re-check, per-type preferences and
--    dedupe, since direct inserts never pass through the helper. The two
--    client flows that used that branch move behind server-side paths here,
--    and the branch is removed:
--      * the /invites nudge → send_smoke_signal() definer RPC, gated on the
--        recipient actually being someone the caller invited (user_lineage);
--      * the camp-newsletter fan-out → an AFTER trigger on camp_newsletters,
--        firing when a newsletter reaches status='sent'. The newsletter INSERT
--        policy already requires author + firekeeper/trailblazer role, so the
--        trigger inherits a properly authorized write.
--    Direct INSERT keeps only the admin-notice branch (NULL actor, is_admin)
--    that GroveDesigns uses.
--
-- 2. design_ratings SELECT was USING (true): every member could read
--    buyer_id → who bought which cabin design. No client code reads the
--    table at all today, so nothing is lost by scoping reads to the buyer
--    (their own rating) and the design's creator (ratings on their work).
--
-- SECURITY.md applies. Exploit test: docs/notification-send-paths-exploit-test.sql.

-- ---------------------------------------------------------------------------
-- 1a. The nudge RPC. Actor is always auth.uid(); the recipient must be
--     someone the caller brought into the network. notify_user() supplies
--     block/preference enforcement and the 10-minute dedupe.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.send_smoke_signal(_recipient uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR _recipient IS NULL THEN
    RETURN 'not_allowed';
  END IF;

  -- The one relationship the nudge UI expresses: "I invited this person."
  IF NOT EXISTS (
    SELECT 1 FROM public.user_lineage
    WHERE user_id = _recipient AND invited_by_user_id = auth.uid()
  ) THEN
    RETURN 'not_allowed';
  END IF;

  PERFORM public.notify_user(_recipient, auth.uid(), 'smoke_signal');
  RETURN 'sent';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_smoke_signal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_smoke_signal(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 1b. Newsletter fan-out trigger. Fires on INSERT-as-sent and on the
--     draft→sent transition; notify_user() skips the author (recipient =
--     actor) and anyone who blocks them.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_notify_camp_newsletter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'sent'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'sent') THEN
    PERFORM public.notify_user(cm.user_id, NEW.author_id, 'camp_newsletter',
                               _camp => NEW.camp_id)
    FROM public.camp_members cm
    WHERE cm.camp_id = NEW.camp_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_camp_newsletter ON public.camp_newsletters;
CREATE TRIGGER notify_camp_newsletter
  AFTER INSERT OR UPDATE ON public.camp_newsletters
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_camp_newsletter();

-- ---------------------------------------------------------------------------
-- 1c. Narrow the INSERT policy to the admin-notice branch only.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Members can only send notifications as themselves" ON public.notifications;
CREATE POLICY "Direct inserts are admin notices only"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (actor_id IS NULL AND public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. design_ratings reads: buyer sees their own rating, the design's creator
--    sees ratings on their designs. The creator check goes through a definer
--    helper per the SECURITY.md rule — a policy subquery against
--    cabin_designs would run through cabin_designs' own RLS.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.created_design(_design_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cabin_designs
    WHERE id = _design_id AND creator_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.created_design(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.created_design(uuid) TO authenticated;

DROP POLICY IF EXISTS "Members can read ratings" ON public.design_ratings;

CREATE POLICY "Buyers read their own ratings"
  ON public.design_ratings FOR SELECT TO authenticated
  USING (buyer_id = auth.uid());

CREATE POLICY "Creators read ratings on their designs"
  ON public.design_ratings FOR SELECT TO authenticated
  USING (public.created_design(design_id));
