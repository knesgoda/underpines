CREATE POLICY "Firekeeper can read own camps"
  ON public.camps
  FOR SELECT
  TO authenticated
  USING (firekeeper_id = auth.uid());