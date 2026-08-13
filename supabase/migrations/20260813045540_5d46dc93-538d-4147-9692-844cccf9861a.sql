ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS featured_friends_count smallint NOT NULL DEFAULT 4;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_featured_friends_count_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_featured_friends_count_check
      CHECK (featured_friends_count IN (4, 8, 12));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.featured_albums (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  position smallint NOT NULL DEFAULT 0,
  cover_media_id uuid REFERENCES public.post_media(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (owner_id, album_id)
);

CREATE INDEX IF NOT EXISTS featured_albums_owner_position_idx
  ON public.featured_albums (owner_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.featured_albums TO authenticated;
GRANT ALL ON public.featured_albums TO service_role;

ALTER TABLE public.featured_albums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage their featured albums" ON public.featured_albums;
CREATE POLICY "Owners manage their featured albums"
  ON public.featured_albums FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Featured albums follow member content visibility" ON public.featured_albums;
CREATE POLICY "Featured albums follow member content visibility"
  ON public.featured_albums FOR SELECT
  TO authenticated
  USING (public.can_view_member_content(owner_id));

DROP TRIGGER IF EXISTS update_featured_albums_updated_at ON public.featured_albums;
CREATE TRIGGER update_featured_albums_updated_at
  BEFORE UPDATE ON public.featured_albums
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();