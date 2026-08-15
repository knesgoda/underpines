-- ============================================================================
-- Automated check: feedback vote rows are private; only totals are public
-- ============================================================================
-- Read-only. Run whenever feedback_votes policies or get_feedback_vote_counts()
-- change. Every row must come back passed = true.
--
--   (Lovable) supabase read_query  <- paste this file
--   (psql)    psql "$DATABASE_URL" -f supabase/tests/feedback_votes_rls_regression.sql
--
-- Contract: an authenticated member reads only their own vote rows (plus the
-- author of the item, plus admins). Board totals come from the aggregate
-- SECURITY DEFINER function, never from counting readable rows.
-- ============================================================================

with pol as (
  select polname,
         polcmd,
         pg_get_expr(polqual, polrelid) as qual,
         (select string_agg(r.rolname, ',' order by r.rolname)
            from pg_roles r where r.oid = any(p.polroles)) as roles
    from pg_policy p
   where p.polrelid = 'public.feedback_votes'::regclass
), fn as (
  select prosrc, prosecdef, provolatile, proconfig,
         pg_get_function_result(oid) as result
    from pg_proc
   where proname = 'get_feedback_vote_counts'
     and pronamespace = 'public'::regnamespace
), checks(check_name, passed, detail) as (
  select 'RLS is enabled on feedback_votes',
         (select relrowsecurity from pg_class where oid = 'public.feedback_votes'::regclass),
         'without RLS every vote row is world-readable'

  union all
  select 'exactly one read policy',
         (select count(*) from pol where polcmd = 'r') = 1,
         'a second read policy would widen access silently'

  union all
  select 'read policy is authenticated-only',
         not exists (select 1 from pol where roles is null or roles like '%anon%'),
         'anon must have no read path'

  union all
  select 'no blanket-true read predicate',
         not exists (select 1 from pol where polcmd = 'r' and coalesce(qual, 'true') = 'true'),
         'USING (true) leaks the full voter list'

  union all
  select 'read predicate scopes to own vote',
         exists (select 1 from pol where polcmd = 'r' and qual like '%user_id = auth.uid()%'),
         'own-vote branch missing'

  union all
  select 'read predicate allows the item author',
         exists (select 1 from pol where polcmd = 'r' and qual like '%author_id = auth.uid()%'),
         'author branch missing'

  union all
  select 'read predicate allows admins',
         exists (select 1 from pol where polcmd = 'r' and qual like '%is_admin(auth.uid())%'),
         'admin branch missing'

  union all
  select 'aggregate function exists',
         exists (select 1 from fn), 'get_feedback_vote_counts() missing'

  union all
  select 'aggregate function is SECURITY DEFINER',
         (select prosecdef from fn), 'must bypass RLS to total all votes'

  union all
  select 'aggregate function is STABLE',
         (select provolatile from fn) = 's', 'volatility must be s'

  union all
  select 'aggregate function pins search_path',
         (select proconfig::text from fn) like '%search_path%',
         'search_path must be pinned'

  union all
  select 'aggregate returns no voter identity',
         (select result from fn) not like '%user_id%',
         'the result shape must only carry item_id and a count'

  union all
  select 'aggregate counts rather than lists',
         (select prosrc from fn) ilike '%count(%',
         'the function body must aggregate'
)
select check_name,
       coalesce(passed, false) as passed,
       case when coalesce(passed, false) then '' else detail end as detail
  from checks
 order by passed, check_name;
