# Migrations through Lovable — what happened, and the shape to reuse

Migrations reach production through Lovable's user-approved flow, not through
CI. This records the Phase 2 and Phase 3 handover of 2026-08-09 and the pattern
that made it verifiable, because the next one will want the same shape.

## What was applied

Four files, in order: the Phase 2 theme/skin/onboarding columns, then Phase 3's
profile social tables, albums, and events/bulletins/presence. Together they
added `profiles.messenger_skin`, `profiles.onboarding_completed_at`,
`profiles.last_seen_at`, the `top_friends`, `wall_notes`, `albums`,
`album_media` and `events` tables, a foreign key and `status` for the
previously orphaned `event_responses`, and a widened `posts.post_type` CHECK
allowing `'bulletin'`.

Every predicted number matched: 18 profiles backfilled, 0 `evergreen` rows
(no-op), 3 albums, 25 `album_media`, 0 `event_responses` deleted, 0 posts
rejected by the widened CHECK.

## What made it checkable

**Predict the row counts before handing it over.** The prompt stated what each
statement should touch, measured from the live database beforehand. That turns
"it worked" into something with a truth value, and it means a partial apply
announces itself instead of being discovered weeks later.

**Say "stop and report rather than adjust the SQL".** A mismatch means the
model of the database is wrong; working around it hides the thing worth
knowing.

**Verify the load-bearing details yourself afterwards.** Two were worth
checking directly:

- `top_friends_owner_position_key` had to survive as a `UNIQUE CONSTRAINT`
  declared `DEFERRABLE INITIALLY DEFERRED`, not an index — reordering top
  friends renumbers several rows and passes through a state where two share a
  position. Confirmed via `pg_constraint`: `condeferrable`, `condeferred` both
  true.
- Lovable re-records applied files under its own generated versions. Diffed
  against the originals: identical apart from a trailing newline.

**Check warnings against the catalog before acting on them.** The handover came
back with a report that the new tables had no table-level `GRANT`s and would
need a follow-up migration. They did have them —
`information_schema.role_table_grants` and `pg_class.relacl` both showed the
full set for `anon`, `authenticated` and `service_role`, and `pg_default_acl`
showed why: this database has `ALTER DEFAULT PRIVILEGES` configured on the
`public` schema, so new tables inherit grants. A migration was written for a
problem that did not exist, and one query avoided it.

## A trap worth knowing about

Because Lovable re-records what it applies, the repo briefly held both copies
of each file. The DDL is idempotent — `CREATE TABLE IF NOT EXISTS`,
`DROP CONSTRAINT IF EXISTS` — but `CREATE POLICY` has no `IF NOT EXISTS` guard,
so bootstrapping a fresh environment would have run each policy twice and
failed on the second. The originals were deleted, keeping the versions
Lovable's ledger references. If a future handover leaves duplicates, delete
yours, not its.

If you ever do need a policy to be re-runnable, pair it with
`DROP POLICY IF EXISTS` rather than relying on the file never running twice.

## Verification query

Useful after any schema change here:

```sql
SELECT
  (SELECT string_agg(table_name, ', ' ORDER BY table_name)
     FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('top_friends','wall_notes','albums','album_media','events')
  ) AS new_tables,
  (SELECT pg_get_constraintdef(oid) FROM pg_constraint
    WHERE conname = 'posts_post_type_check') AS post_type_check,
  (SELECT pg_get_constraintdef(oid) FROM pg_constraint
    WHERE conname = 'top_friends_owner_position_key') AS top_friends_position,
  (SELECT count(*) FROM public.albums) AS albums,
  (SELECT count(*) FROM public.album_media) AS album_media;
```

And, before believing any permissions claim:

```sql
SELECT c.relname, c.relrowsecurity, array_to_string(c.relacl, E'\n') AS acl
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = ANY (ARRAY['top_friends','albums']);
```

## Post-migration verification, 2026-08-09

Sandbox egress to Supabase is blocked, so none of this is browser verification
of a signed-in session. It is SQL against production, which is a different and
weaker thing — it confirms the schema and the queries' assumptions, not that
the buttons work.

**Confirmed against live data**

- All five tables, all three `profiles` columns, and the widened `post_type`
  CHECK including `bulletin`.
- Sixteen RLS policies across the five new tables and `event_responses`.
- `top_friends_owner_position_key` genuinely defers: a transaction that
  inserted two rows and swapped their positions in place — leaving both at
  position 2 mid-statement — reached the end without violating. Rolled back
  deliberately; `top_friends` is back to 0 rows.
- The albums join the app issues returns 3 albums and 25 media rows, all
  joinable through `album_media -> post_media`.
- `post_media.media_type` holds `'photo'` (24) and `'video'` (1). This is what
  caught the `startsWith('image')` filter that would have emptied the Photos
  surface.
- A unique index on `event_responses (event_id, user_id)` exists, so the RSVP
  upsert's `onConflict` resolves.

**Not verified, and needs a real session**

Creating an event, RSVPing, saving a page theme, reordering top friends,
posting a wall note, and whether the block-aware wall-note policy hides notes
from the right people. All of these are writes behind auth.

**Noticed, not fixed**

`event_responses` carries two identical unique indexes on `(event_id, user_id)`
— `event_responses_event_id_user_id_key` predates the migration and
`event_responses_unique_idx` came with it. Harmless but redundant; worth
dropping the second next time something else needs applying, rather than
spending a migration on it alone.
