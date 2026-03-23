DROP POLICY IF EXISTS "Users can upload their own post media" ON storage.objects;

CREATE POLICY "Users can upload their own post media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'post-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );