-- Close the last security finding: post-media objects were world-readable, so a
-- direct object URL bypassed the row-level post visibility rules. The bucket is
-- now private; reads are authenticated-only and go through signed URLs.
DROP POLICY IF EXISTS "Anyone can read post media" ON storage.objects;
DROP POLICY IF EXISTS "Public can read post media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated members can read post media" ON storage.objects;

CREATE POLICY "Authenticated members can read post media"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'post-media');
