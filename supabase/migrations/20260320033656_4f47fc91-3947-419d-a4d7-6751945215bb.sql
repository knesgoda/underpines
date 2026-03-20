
-- Add feed preference columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS feed_show_sparks boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS feed_show_stories boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS feed_show_embers boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS feed_show_quotes boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS feed_show_camp_posts boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS feed_scroll_reminder boolean DEFAULT true;

-- Create post-media storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: anyone can read, authenticated users can upload to their own folder
CREATE POLICY "Anyone can read post media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-media');

CREATE POLICY "Users can upload their own post media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own post media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
