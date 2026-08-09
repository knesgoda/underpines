-- Phase 3, batch C — Events, bulletins, and a presence fallback.

-- --------------------------------------------------------------------- events
-- event_responses already exists (event_id, user_id, response_text) but has
-- nothing to point at — it was left orphaned. This gives it a parent and wires
-- up the foreign key it never had.
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  camp_id uuid REFERENCES public.camps(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  location text,
  -- Stored as an instant; the UI renders in the viewer's zone. Events can span
  -- timezones and "7:30pm" alone would be ambiguous.
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_title_length CHECK (char_length(title) BETWEEN 1 AND 140),
  CONSTRAINT events_ends_after_start CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS events_starts_at_idx ON public.events (starts_at);
CREATE INDEX IF NOT EXISTS events_camp_idx ON public.events (camp_id, starts_at);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are readable"
  ON public.events FOR SELECT USING (true);

CREATE POLICY "Hosts manage their own events"
  ON public.events FOR ALL
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

-- Adopt the orphaned responses table. Existing rows point at no event, so
-- clear them before adding the constraint — there is nothing meaningful to
-- preserve in a response to an event that never existed.
DELETE FROM public.event_responses
WHERE event_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_responses.event_id);

ALTER TABLE public.event_responses
  DROP CONSTRAINT IF EXISTS event_responses_event_id_fkey;

ALTER TABLE public.event_responses
  ADD CONSTRAINT event_responses_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.event_responses
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'going';

ALTER TABLE public.event_responses
  DROP CONSTRAINT IF EXISTS event_responses_status_check;
ALTER TABLE public.event_responses
  ADD CONSTRAINT event_responses_status_check
  CHECK (status IN ('going', 'interested', 'cannot'));

CREATE UNIQUE INDEX IF NOT EXISTS event_responses_unique_idx
  ON public.event_responses (event_id, user_id);

ALTER TABLE public.event_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event responses are readable"
  ON public.event_responses FOR SELECT USING (true);

CREATE POLICY "Users manage their own RSVP"
  ON public.event_responses FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------------ bulletins
-- A bulletin is a post with a label and a wider audience, so it is a post_type
-- rather than a table. posts.post_type is free-form text today; this widens any
-- constraint that might exist rather than assuming there is none.
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_post_type_check;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_post_type_check
  CHECK (post_type IN ('spark', 'story', 'ember', 'bulletin'));

-- ------------------------------------------------------------------- presence
-- Live presence runs over Realtime and stores nothing. This is the fallback
-- for "active 20m ago" when someone has no open session.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;