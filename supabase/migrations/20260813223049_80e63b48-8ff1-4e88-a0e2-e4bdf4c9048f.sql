REVOKE SELECT (hometown), UPDATE (hometown), INSERT (hometown) ON public.profiles FROM authenticated;
REVOKE SELECT (hometown), UPDATE (hometown), INSERT (hometown) ON public.profiles FROM anon;
REVOKE SELECT (latitude, longitude, zip_code, age_bracket, birth_year), UPDATE (latitude, longitude, zip_code, age_bracket, birth_year) ON public.profiles FROM authenticated, anon;