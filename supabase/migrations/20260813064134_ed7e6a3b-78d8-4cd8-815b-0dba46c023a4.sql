DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='profiles'
    AND column_name NOT IN ('latitude','longitude','zip_code','age_bracket','birth_year');

  REVOKE SELECT ON public.profiles FROM anon, authenticated;
  EXECUTE format('GRANT SELECT (%s) ON public.profiles TO authenticated', cols);
END $$;

GRANT ALL ON public.profiles TO service_role;

DROP POLICY IF EXISTS "Anyone can read post media" ON storage.objects;
CREATE POLICY "Members can read post media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'post-media');