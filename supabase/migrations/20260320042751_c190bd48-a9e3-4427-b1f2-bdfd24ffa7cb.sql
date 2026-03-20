
-- Fix the permissive insert policy on inactive_nudges
DROP POLICY "System can insert nudges" ON public.inactive_nudges;

CREATE POLICY "Users can insert their own nudges"
ON public.inactive_nudges FOR INSERT
TO authenticated
WITH CHECK (inviter_id = auth.uid());
