CREATE OR REPLACE FUNCTION public.is_camp_member(_camp_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.camp_members
    WHERE camp_id = _camp_id
      AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.has_camp_role(_camp_id uuid, _user_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.camp_members
    WHERE camp_id = _camp_id
      AND user_id = _user_id
      AND role = ANY (_roles)
  )
$$;

DROP POLICY IF EXISTS "Members can read camp members" ON public.camp_members;
CREATE POLICY "Members can read camp members"
ON public.camp_members
FOR SELECT
TO authenticated
USING (public.is_camp_member(camp_id, auth.uid()));

DROP POLICY IF EXISTS "Firekeeper can update members" ON public.camp_members;
CREATE POLICY "Firekeeper can update members"
ON public.camp_members
FOR UPDATE
TO authenticated
USING (public.has_camp_role(camp_id, auth.uid(), ARRAY['firekeeper']::text[]));

DROP POLICY IF EXISTS "Members can leave camp" ON public.camp_members;
CREATE POLICY "Members can leave camp"
ON public.camp_members
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_camp_role(camp_id, auth.uid(), ARRAY['firekeeper']::text[])
);

DROP POLICY IF EXISTS "System can insert camp members" ON public.camp_members;
CREATE POLICY "System can insert camp members"
ON public.camp_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.has_camp_role(camp_id, auth.uid(), ARRAY['firekeeper','trailblazer']::text[])
);

DROP POLICY IF EXISTS "Open camps visible to all authenticated" ON public.camps;
CREATE POLICY "Open camps visible to all authenticated"
ON public.camps
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (
    visibility = 'open'
    OR public.is_camp_member(id, auth.uid())
  )
);