
-- Admin policies for managing cabin_companions
CREATE POLICY "Admins can insert companions"
ON public.cabin_companions FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update companions"
ON public.cabin_companions FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete companions"
ON public.cabin_companions FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));
