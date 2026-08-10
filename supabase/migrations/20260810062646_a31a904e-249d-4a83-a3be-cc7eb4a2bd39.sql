REVOKE ALL ON FUNCTION public.admin_profile_age_flags(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_profile_age_flags(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_profile_age_flags(uuid[]) TO authenticated;

REVOKE ALL ON FUNCTION public.record_cabin_visit(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_cabin_visit(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_cabin_visit(uuid) TO authenticated;