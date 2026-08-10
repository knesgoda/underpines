-- Waitlist admin access, narrowed to the founder account. Kevin asked that
-- only kevin.nesgoda@gmail.com be able to read or manage the waitlist — a
-- tighter gate than is_admin(), so the generic admin policies from
-- 20260810230000 are replaced rather than extended. The email lives in one
-- definer function; change it here if the founder account ever moves.

CREATE OR REPLACE FUNCTION public.is_waitlist_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND lower(email) = 'kevin.nesgoda@gmail.com'
  )
$$;

DROP POLICY IF EXISTS waitlist_admin_select ON public.waitlist_signups;
CREATE POLICY waitlist_admin_select ON public.waitlist_signups
  FOR SELECT USING (public.is_waitlist_admin());

DROP POLICY IF EXISTS waitlist_admin_update ON public.waitlist_signups;
CREATE POLICY waitlist_admin_update ON public.waitlist_signups
  FOR UPDATE USING (public.is_waitlist_admin())
  WITH CHECK (public.is_waitlist_admin());

DROP POLICY IF EXISTS waitlist_admin_delete ON public.waitlist_signups;
CREATE POLICY waitlist_admin_delete ON public.waitlist_signups
  FOR DELETE USING (public.is_waitlist_admin());
