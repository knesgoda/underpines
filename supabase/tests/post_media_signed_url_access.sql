-- ============================================================================
-- Automated check: post-media signed URLs are scoped to allowed viewer roles
-- ============================================================================
-- Read-only. Run it against the project database whenever storage policies,
-- can_read_post_media(), or can_see_post() change:
--
--   (Lovable)  supabase read_query  <- paste this file
--   (psql)     psql "$DATABASE_URL" -f supabase/tests/post_media_signed_url_access.sql
--
-- Every row must come back passed = true. A false row means signed URLs for the
-- `post-media` bucket can be minted (or refused) for the wrong viewer.
--
-- Signing itself is enforced by Storage: createSignedUrl only succeeds when the
-- caller passes the SELECT policy below, so these assertions are the server-side
-- half of the contract. The client half (clean failure, no public-URL fallback)
-- is covered by src/lib/__tests__/signedMedia.test.ts.
-- ============================================================================

with policy as (
  select pg_get_expr(polqual, polrelid) as qual,
         (select string_agg(r.rolname, ',' order by r.rolname)
            from pg_roles r where r.oid = any(p.polroles)) as roles
    from pg_policy p
   where p.polrelid = 'storage.objects'::regclass
     and p.polcmd = 'r'
     and pg_get_expr(p.polqual, p.polrelid) like '%post-media%'
), fn as (
  select prosrc, prosecdef, provolatile, proconfig
    from pg_proc
   where proname = 'can_read_post_media'
     and pronamespace = 'public'::regnamespace
), checks(check_name, passed, detail) as (
  -- The bucket must stay private: a public bucket serves objects with no policy
  -- evaluation at all, which makes every check below cosmetic.
  select 'bucket post-media is private',
         exists (select 1 from storage.buckets where id = 'post-media' and public is false),
         'storage.buckets.public must be false'

  -- Signed-out visitors get nothing: no anon-facing read policy on the bucket.
  union all
  select 'no anon read path',
         not exists (
           select 1 from policy
            where roles is null or roles like '%anon%'
         ),
         'read policy must be restricted to the authenticated role'

  union all
  select 'read policy delegates to can_read_post_media',
         exists (select 1 from policy where qual like '%can_read_post_media(%'),
         'the SELECT policy must call the per-object authorization function'

  union all
  select 'exactly one read policy for the bucket',
         (select count(*) from policy) = 1,
         'a second read policy would widen access silently'

  -- The function reads other people's rows, so it must be definer + pinned.
  union all
  select 'can_read_post_media is SECURITY DEFINER',
         (select prosecdef from fn), 'must bypass RLS to evaluate visibility'

  union all
  select 'can_read_post_media is STABLE',
         (select provolatile from fn) = 's', 'volatility must be s'

  union all
  select 'can_read_post_media pins search_path',
         (select proconfig::text from fn) like '%search_path%',
         'search_path must be set to avoid schema shadowing'

  -- Each allowed viewer role has to be represented in the predicate.
  union all
  select 'allows the uploading owner',
         (select prosrc from fn) like '%foldername(_name))[1] = (auth.uid())::text%',
         'owner branch missing'

  union all
  select 'gates post images on can_see_post',
         (select prosrc from fn) like '%public.posts%can_see_post(p.id, auth.uid())%',
         'post visibility branch missing'

  union all
  select 'gates post_media rows on can_see_post',
         (select prosrc from fn) like '%public.post_media%can_see_post(p.id, auth.uid())%',
         'post_media visibility branch missing'

  union all
  select 'gates message media on conversation participation',
         (select prosrc from fn) like '%campfire_participants%cp.user_id = auth.uid()%',
         'conversation participant branch missing'

  union all
  select 'gates group post media on group membership',
         (select prosrc from fn) like '%camp_members cm%cm.user_id = auth.uid()%',
         'group membership branch missing'

  -- Nothing in the predicate may hand out a blanket allow.
  union all
  select 'no blanket true in the predicate',
         (select prosrc from fn) not like '%OR true%'
     and (select prosrc from fn) not like '%OR TRUE%',
         'an unconditional branch would expose every object'

  -- can_see_post is the dependency the post branches lean on.
  union all
  select 'can_see_post exists and is SECURITY DEFINER',
         exists (
           select 1 from pg_proc
            where proname = 'can_see_post'
              and pronamespace = 'public'::regnamespace
              and prosecdef
         ),
         'post visibility helper missing or not definer'

  -- Writes stay owner-scoped so nobody can plant an object in someone's folder.
  union all
  select 'uploads and deletes stay owner-scoped',
         exists (
           select 1 from pg_policy p
            where p.polrelid = 'storage.objects'::regclass
              and p.polcmd = 'a'
              and coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') like '%post-media%'
              and coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') like '%auth.uid()%'
         )
     and exists (
           select 1 from pg_policy p
            where p.polrelid = 'storage.objects'::regclass
              and p.polcmd = 'd'
              and pg_get_expr(p.polqual, p.polrelid) like '%post-media%'
              and pg_get_expr(p.polqual, p.polrelid) like '%auth.uid()%'
         ),
         'INSERT/DELETE policies must pin the first folder to auth.uid()'
)
select check_name,
       coalesce(passed, false) as passed,
       case when coalesce(passed, false) then '' else detail end as detail
  from checks
 order by passed, check_name;
