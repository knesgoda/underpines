REVOKE ALL ON FUNCTION public.is_waitlist_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_waitlist_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_waitlist_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.check_invite_rate_limit(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_invite_rate_limit(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.check_invite_rate_limit(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_invite_rate_limit(uuid, text) TO service_role;