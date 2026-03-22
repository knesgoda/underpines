
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS spotify_track_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS spotify_preview_url text DEFAULT NULL;
