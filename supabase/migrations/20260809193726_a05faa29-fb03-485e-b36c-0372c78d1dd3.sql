-- Phase 3, batch B — Photo albums.
--
-- Photos currently exist only as post_media rows hanging off a post. The
-- handoff wants a Photos surface with named albums ("Albums, not content
-- dumps"), so albums group existing media rather than replacing it: a photo
-- stays attached to the post it was shared in, and also appears in an album.
-- Nothing is moved, so nothing can be lost.

CREATE TABLE IF NOT EXISTS public.albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Photos',
  description text,
  cover_media_id uuid REFERENCES public.post_media(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT albums_title_length CHECK (char_length(title) BETWEEN 1 AND 80)
);

CREATE INDEX IF NOT EXISTS albums_owner_idx ON public.albums (owner_id, position);

CREATE TABLE IF NOT EXISTS public.album_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  post_media_id uuid NOT NULL REFERENCES public.post_media(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS album_media_unique_idx
  ON public.album_media (album_id, post_media_id);
CREATE INDEX IF NOT EXISTS album_media_album_position_idx
  ON public.album_media (album_id, position);

ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Albums are readable"
  ON public.albums FOR SELECT USING (true);

CREATE POLICY "Users manage their own albums"
  ON public.albums FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Album contents are readable"
  ON public.album_media FOR SELECT USING (true);

CREATE POLICY "Users manage media in their own albums"
  ON public.album_media FOR ALL
  USING (EXISTS (SELECT 1 FROM public.albums a WHERE a.id = album_media.album_id AND a.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.albums a WHERE a.id = album_media.album_id AND a.owner_id = auth.uid()));

-- ------------------------------------------------------------------- backfill
-- Give everyone who already has photos a default album containing them, so the
-- new Photos surface is populated the moment it ships rather than looking
-- broken to existing members.
INSERT INTO public.albums (owner_id, title, description)
SELECT DISTINCT p.author_id, 'Photos', 'Everything shared so far.'
FROM public.post_media pm
JOIN public.posts p ON p.id = pm.post_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.albums a WHERE a.owner_id = p.author_id AND a.title = 'Photos'
);

INSERT INTO public.album_media (album_id, post_media_id, position)
SELECT a.id, pm.id, COALESCE(pm.position, 0)
FROM public.post_media pm
JOIN public.posts p ON p.id = pm.post_id
JOIN public.albums a ON a.owner_id = p.author_id AND a.title = 'Photos'
ON CONFLICT (album_id, post_media_id) DO NOTHING;