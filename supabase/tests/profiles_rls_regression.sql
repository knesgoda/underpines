-- ============================================================================
-- RLS regression check: profiles column protection
-- ============================================================================
-- Read-only. Run it after ANY migration that touches `public.profiles`, its
-- grants, its policies, or the definer RPCs that expose profile data:
--
--   (Lovable)  supabase read_query  <- paste this file
--   (psql)     psql "$DATABASE_URL" -f supabase/tests/profiles_rls_regression.sql
--
-- Every row must come back passed = true. A false row means a migration has
-- re-opened access to sensitive profile data.
--
-- Why column grants and not policies: `profiles` intentionally has a broad
-- member-visible SELECT policy (the whole app reads handles, avatars, bios).
-- The real gate for sensitive fields is the *column-level* grant — SELECT is
-- revoked table-wide and re-granted column by column, deliberately skipping
-- geolocation and age. `GRANT SELECT ON public.profiles TO authenticated`
-- anywhere in a future migration silently undoes that, which is exactly what
-- these assertions catch.
--
-- Sensitive columns (readable only through SECURITY DEFINER RPCs that apply
-- their own scoping): latitude, longitude, zip_code, age_bracket, birth_year.
-- ============================================================================

with sensitive(col) as (
  values ('latitude'), ('longitude'), ('zip_code'), ('age_bracket'), ('birth_year')
), acl as (
  select a.attname as col,
         coalesce(a.attacl::text, '') as attacl
    from pg_attribute a
   where a.attrelid = 'public.profiles'::regclass
     and a.attnum > 0
     and not a.attisdropped
), tbl as (
  select coalesce(relacl::text, '') as relacl, relrowsecurity, relforcerowsecurity
    from pg_class where oid = 'public.profiles'::regclass
), checks(check_name, passed, detail) as (
  -- 1. Row level security must stay on.
  select 'RLS enabled on profiles', (select relrowsecurity from tbl),
         'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY'

  -- 2. No table-wide SELECT: that is what makes column grants meaningful.
  --    Matched with a regex, not LIKE — an ACL entry is `role=privs/grantor`,
  --    and the grantor name ("postgres") contains letters that would false-match.
  union all
  select 'table-wide SELECT revoked from authenticated',
         (select relacl from tbl) !~ 'authenticated=[^/]*r',
         'a table-level GRANT SELECT re-exposes every column, including geolocation and age'

  union all
  select 'table-wide SELECT revoked from anon',
         (select relacl from tbl) !~ '\manon=[^/]*r',
         'signed-out visitors must not read profiles at all'

  -- 3. No table-wide UPDATE: profile writes are column-scoped (this is what
  --    keeps is_pines_plus, seedling, consent and age fields non-forgeable).
  union all
  select 'table-wide UPDATE revoked from authenticated',
         (select relacl from tbl) !~ 'authenticated=[^/]*w',
         'a table-level GRANT UPDATE lets a member mint Pines+ / bypass the age gate'


  -- 4. Each sensitive column: no SELECT grant to authenticated or anon.
  union all
  select 'sensitive column not readable: ' || s.col,
         coalesce(
           (select attacl from acl where acl.col = s.col) !~ '(anon|authenticated)=[^/]*r'
         , false),
         'revoke SELECT (' || s.col || ') on public.profiles from anon, authenticated'
    from sensitive s

  -- 5. Each sensitive column: no UPDATE grant either (age/location are set via
  --    definer RPCs that validate, e.g. set_age_verification).
  union all
  select 'sensitive column not client-writable: ' || s.col,
         coalesce(
           (select attacl from acl where acl.col = s.col) !~ '(anon|authenticated)=[^/]*w'
         , false),
         'revoke UPDATE (' || s.col || ') on public.profiles from anon, authenticated'
    from sensitive s

  -- 6. The column still exists (a rename would make the checks above vacuous).
  union all
  select 'sensitive column still present: ' || s.col,
         exists (select 1 from acl where acl.col = s.col),
         'column renamed or dropped — update this test and confirm the new column is protected'
    from sensitive s

  -- 7. anon holds no column-level SELECT grant anywhere on profiles.
  union all
  select 'anon has no column-level read on profiles',
         not exists (select 1 from acl where attacl ~ 'anon=[^/]*r'),
         'a column grant to anon exposes profile data pre-auth'

  -- 8. The sanctioned readers stay definer + search_path-pinned, since they are
  --    the only path to the protected columns.
  union all
  select 'reader RPC is definer and pinned: ' || f.proname,
         bool_and(p.prosecdef and p.proconfig::text like '%search_path%'),
         'this RPC reads protected columns; it must be SECURITY DEFINER with a pinned search_path'
    from (values ('get_boot_state'), ('get_cabin_view'), ('admin_profile_age_flags'),
                 ('set_age_verification'), ('record_age_gate_event')) as f(proname)
    join pg_proc p on p.proname = f.proname and p.pronamespace = 'public'::regnamespace
   group by f.proname

  -- 9. Age verification cannot be done by a direct client write.
  union all
  select 'age verification goes through set_age_verification',
         exists (
           select 1 from pg_proc
            where proname = 'set_age_verification'
              and pronamespace = 'public'::regnamespace
              and prosecdef
         ),
         'the server-side age RPC is missing; a client could claim any age'

  -- 10. No read policy on profiles may be open to anon. (The INSERT/UPDATE
  --     policies are PUBLIC by design — column grants are their real gate.)
  union all
  select 'no anon-facing read policy on profiles',
         not exists (
           select 1 from pg_policy p
            where p.polrelid = 'public.profiles'::regclass
              and p.polcmd in ('r', '*')
              and (p.polroles = '{0}'::oid[]
                   or exists (select 1 from pg_roles r
                               where r.oid = any(p.polroles) and r.rolname = 'anon'))
         ),
         'the profiles read policy must name the authenticated role explicitly'

)
select check_name,
       coalesce(passed, false) as passed,
       case when coalesce(passed, false) then '' else detail end as detail
  from checks
 order by passed, check_name;
