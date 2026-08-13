DROP POLICY IF EXISTS "No client access to internal secrets" ON public.internal_secrets;
CREATE POLICY "No client access to internal secrets"
  ON public.internal_secrets
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON public.internal_secrets FROM anon, authenticated;
GRANT ALL ON public.internal_secrets TO service_role;

DROP POLICY IF EXISTS "Head Rangers can insert security config" ON public.security_config;
CREATE POLICY "Head Rangers can insert security config"
  ON public.security_config
  FOR INSERT
  TO authenticated
  WITH CHECK (public.ranger_level(auth.uid()) >= 3);

DROP POLICY IF EXISTS "Head Rangers can update security config" ON public.security_config;
CREATE POLICY "Head Rangers can update security config"
  ON public.security_config
  FOR UPDATE
  TO authenticated
  USING (public.ranger_level(auth.uid()) >= 3)
  WITH CHECK (public.ranger_level(auth.uid()) >= 3);

DROP POLICY IF EXISTS "Participants can read voice messages" ON storage.objects;
CREATE POLICY "Participants can read voice messages"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'voice-messages'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1
        FROM public.campfire_messages m
        JOIN public.campfire_participants cp ON cp.campfire_id = m.campfire_id
        WHERE cp.user_id = auth.uid()
          AND m.media_url = storage.objects.name
          AND (storage.foldername(storage.objects.name))[1] = m.sender_id::text
          AND (storage.foldername(storage.objects.name))[3] = m.campfire_id::text
      )
    )
  );