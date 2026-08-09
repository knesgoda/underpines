# Lovable prompt — apply the Phase 2 and Phase 3 migrations

Migrations reach production through Lovable's user-approved flow, not through
CI, so this is the handover. Paste the block below into Lovable.

The expected counts were measured against the live database on 2026-08-09.
Re-measure before pasting if significant time has passed — the point of the
numbers is that a mismatch is a signal, and stale numbers turn that signal into
noise.

---

## Prompt

Please apply four migration files that are already committed in this repo, in
this order:

1. `supabase/migrations/20260809060000_phase2_theme_skin_onboarding.sql`
2. `supabase/migrations/20260809070000_phase3_profile_social.sql`
3. `supabase/migrations/20260809070100_phase3_albums.sql`
4. `supabase/migrations/20260809070200_phase3_events_bulletins_presence.sql`

Apply them exactly as written. Please do not rewrite the SQL, and do not change
any application code — the client already handles both the before and after
shapes of the schema, so no code change is needed for these to take effect.

**These are additive.** Nothing is dropped, no column changes type, and no
existing row is deleted except where noted below. Together they add:

- `profiles.messenger_skin` (text, default `'pines'`, CHECK in pines / icu /
  bullseye / emessen)
- `profiles.onboarding_completed_at` (timestamptz), backfilled from `created_at`
- `profiles.last_seen_at` (timestamptz)
- `top_friends` and `wall_notes` tables, both with RLS
- `albums` and `album_media` tables, both with RLS, plus a backfill from
  `post_media`
- `events` table with RLS, and a foreign key + `status` column adopting the
  existing orphaned `event_responses` table
- a widened CHECK on `posts.post_type` to allow `'bulletin'` alongside
  `'spark'`, `'story'` and `'ember'`

### What the data should look like afterwards

I measured the current database so the result is checkable rather than assumed.
Please run the verification query at the end and tell me the actual numbers.

| Check | Expected |
|---|---|
| `profiles` rows backfilled with `onboarding_completed_at` | 18 (every profile) |
| `profiles` with `theme = 'evergreen'` updated to `'light'` | 0 — none exist, so that statement is a no-op |
| New rows in `albums` | 3 (three distinct authors currently have photos) |
| New rows in `album_media` | 25 (there are 25 `post_media` rows) |
| Rows deleted from `event_responses` | 0 — the table is empty, so the orphan cleanup removes nothing |
| Existing posts rejected by the widened `post_type` CHECK | 0 — only `spark` and `ember` are in use |

### Two things worth your attention

**In file 2**, the `top_friends` position uniqueness is a `UNIQUE CONSTRAINT`
declared `DEFERRABLE INITIALLY DEFERRED`, deliberately — not a unique index.
Reordering someone's top friends renumbers several rows in one transaction and
passes through a state where two rows briefly share a position. If it is
applied as a plain unique index instead, every reorder will fail. Please keep
it as a deferrable constraint.

**In file 4**, `event_responses` already exists in the database but has never
had a foreign key to any parent table. The migration deletes any response whose
`event_id` does not match a real event before adding the constraint. That table
is currently empty so nothing is actually removed, but please confirm the
delete count is 0 rather than assuming it.

### If anything does not match

Please stop and tell me what happened rather than adjusting the SQL to make it
pass. A mismatch means my understanding of the database is wrong, and I would
rather fix that than work around it.

### Verification query

```sql
SELECT
  (SELECT string_agg(table_name, ', ' ORDER BY table_name)
     FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('top_friends','wall_notes','albums','album_media','events')
  ) AS new_tables,
  (SELECT string_agg(column_name, ', ' ORDER BY column_name)
     FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name IN ('messenger_skin','onboarding_completed_at','last_seen_at')
  ) AS new_profile_columns,
  (SELECT pg_get_constraintdef(oid) FROM pg_constraint
    WHERE conname = 'posts_post_type_check') AS post_type_check,
  (SELECT pg_get_constraintdef(oid) FROM pg_constraint
    WHERE conname = 'top_friends_owner_position_key') AS top_friends_position_constraint,
  (SELECT count(*) FROM public.albums) AS albums,
  (SELECT count(*) FROM public.album_media) AS album_media,
  (SELECT count(*) FROM public.profiles WHERE onboarding_completed_at IS NOT NULL) AS onboarded;
```

Expected: all five tables listed, all three columns listed, a `post_type` CHECK
that includes `bulletin`, a top-friends constraint that reads
`UNIQUE (owner_id, "position") DEFERRABLE INITIALLY DEFERRED`, `albums = 3`,
`album_media = 25`, `onboarded = 18`.

---

## After it lands

Follow-up work in the app, not for Lovable:

1. Regenerate `src/integrations/supabase/types.ts` from the live database.
   Several `as never` / `as unknown as` casts exist only because the generated
   types do not know these tables yet — `MyPage.tsx` (wall notes),
   `usePhotos.ts` (albums), `Events.tsx`, `ThemeContext.tsx`.
2. Flip `BULLETINS_ENABLED` and `EVENTS_ENABLED` in `src/lib/features.ts`.
3. Delete the derived-album fallback in `src/hooks/usePhotos.ts`; it exists
   only to cover the window before `albums` was real.
4. Remove the defensive theme-only refetch in `src/contexts/ThemeContext.tsx`,
   which covers the window before `messenger_skin` existed.
5. Build the Top Friends ordering editor, which the deferrable constraint above
   is what makes possible.
