ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ask_me_about jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pinned_memory_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS featured_photos jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS moments jsonb DEFAULT '[]'::jsonb;