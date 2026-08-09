-- Phase 3, batch A — Top Friends and Wall Notes.
--
-- Both are net-new. circles already models the friendship itself
-- (requester_id / requestee_id / status) but has no ordering, and replies is
-- post-scoped so it cannot carry profile-level comments.

-- ---------------------------------------------------------------- top_friends
-- Ordering belongs to the page owner, not to the friendship: a mutual circle
-- is one row shared by two people, and each of them orders their own page
-- independently. Hence a separate table rather than a column on circles.
CREATE TABLE IF NOT EXISTS public.top_friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT top_friends_no_self CHECK (owner_id <> friend_id),
  CONSTRAINT top_friends_position_range CHECK (position BETWEEN 1 AND 12)
);

-- Deferrable so a reorder can renumber several rows in one transaction
-- without tripping over itself mid-update.
CREATE UNIQUE INDEX IF NOT EXISTS top_friends_owner_position_idx
  ON public.top_friends (owner_id, position);
CREATE UNIQUE INDEX IF NOT EXISTS top_friends_owner_friend_idx
  ON public.top_friends (owner_id, friend_id);

ALTER TABLE public.top_friends ENABLE ROW LEVEL SECURITY;

-- A page's top friends are as public as the page itself.
CREATE POLICY "Top friends are readable"
  ON public.top_friends FOR SELECT USING (true);

CREATE POLICY "Users manage their own top friends"
  ON public.top_friends FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ----------------------------------------------------------------- wall_notes
CREATE TABLE IF NOT EXISTS public.wall_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wall_notes_content_length CHECK (char_length(content) BETWEEN 1 AND 1000)
);

CREATE INDEX IF NOT EXISTS wall_notes_profile_created_idx
  ON public.wall_notes (profile_id, created_at DESC);

ALTER TABLE public.wall_notes ENABLE ROW LEVEL SECURITY;

-- Readable unless either party has blocked the other.
CREATE POLICY "Wall notes are readable when not blocked"
  ON public.wall_notes FOR SELECT
  USING (
    NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = wall_notes.profile_id AND b.blocked_id = auth.uid())
         OR (b.blocker_id = auth.uid() AND b.blocked_id = wall_notes.profile_id)
    )
  );

-- You write as yourself, and not onto the wall of someone who blocked you.
CREATE POLICY "Users can post wall notes"
  ON public.wall_notes FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = wall_notes.profile_id AND b.blocked_id = auth.uid())
         OR (b.blocker_id = auth.uid() AND b.blocked_id = wall_notes.profile_id)
    )
  );

-- The page owner can clear anything off their own wall; authors can retract
-- their own note. Both matter — a wall you cannot moderate is a liability.
CREATE POLICY "Authors and page owners can delete wall notes"
  ON public.wall_notes FOR DELETE
  USING (author_id = auth.uid() OR profile_id = auth.uid());
