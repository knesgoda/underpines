
-- Fix cabin_visits policies to require authentication
DROP POLICY "Anyone can record visits" ON public.cabin_visits;
DROP POLICY "Anyone can increment visits" ON public.cabin_visits;

CREATE POLICY "Authenticated users can record visits"
  ON public.cabin_visits FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can increment visits"
  ON public.cabin_visits FOR UPDATE USING (auth.uid() IS NOT NULL);
