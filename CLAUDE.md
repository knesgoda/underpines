# Under Pines — agent handoff

**Every session reads this file first. Update the "Current handoff" section at the
bottom before you finish, so the next session starts where you left off.** The
rest is durable context that rarely changes.

**⚠️ SECURITY GATE: read `SECURITY.md` before ANY schema, RLS, edge-function,
or auth-adjacent change — no exceptions.** It holds the hard rules (the
"self-insert" RLS class of bug has shipped three times), the mandatory
verification checklist (impersonated exploit test in a rolled-back
transaction), and the security changelog. Every security-relevant change gets
an entry in its Part 2 changelog before the session ends. Lovable's project
knowledge carries the same rules, so both agents are held to them.

---

## How the backend actually works

**This is a Lovable-managed project, not a self-administered Supabase one.** The
distinction changes how you apply schema changes and how you verify them.

- **Migrations are applied through Lovable, not on deploy.** The
  `.sql` files under `supabase/migrations/` are the source of truth for *intent*,
  but committing them does nothing on their own. They reach production only when
  Lovable's agent runs them — via `mcp__Lovable__send_message` with the SQL, or
  by a human in the Lovable editor. **"Merged" is not "applied."** Always verify
  a migration landed rather than assuming a merge deployed it.
- Lovable re-records applied migrations under its own timestamped filenames, so
  the repo can end up with two copies of the same migration. Lovable's are the
  ones its ledger references; a filename-vs-database diff is not a reliable gate.
- **The Supabase MCP connector points at a different org and cannot see this
  project.** `mcp__Supabase__*` tools list `ayukvhzmlysqfklmvxez` (a Solera
  project), not this one. To query or migrate this database, use the **Lovable**
  MCP: `mcp__Lovable__query_database` and `mcp__Lovable__send_message`, project
  id `b069179b-6fbf-4019-88a0-aa016bb53b73`.
- The database **auto-grants** `anon`, `authenticated` and `service_role` on
  every new `public` table (via `ALTER DEFAULT PRIVILEGES`). You do **not** need
  a GRANT migration for new tables. RLS is the only real gate; if a tool reports
  "no grants," it is almost certainly querying `information_schema.role_table_grants`
  as a role that cannot see them — check `pg_class.relacl` instead.

## Verifying migrations (the pattern that has worked)

1. Write the `.sql` file and commit it.
2. Send the SQL to Lovable verbatim with `send_message`, asking it to apply
   exactly as written and to **stop and report rather than improvise** on any
   mismatch. Give expected row/policy counts so the result is checkable.
3. **Verify independently** with `mcp__Lovable__query_database` — do not take the
   apply report on trust. Check `pg_proc.prosecdef/provolatile/proconfig` for
   functions, `pg_policies` counts for RLS, and the actual payload shape against
   a real row.

## The sandbox cannot reach Supabase

Outbound egress to `*.supabase.co` is blocked here. Consequences:

- **The Chromium route sweep runs signed out.** It catches crashes and verifies
  the pre-paint theme class, but it cannot exercise any signed-in path. Do not
  describe a signed-in feature as "tested" on the strength of the sweep.
- To verify signed-in / data-dependent behaviour, either use
  `mcp__Lovable__query_database` to assert against real rows after acting, or
  say plainly that it is unverified. Both are fine; implying browser coverage
  you don't have is not.

## Per-commit verification bar

```
npx tsc --noEmit -p tsconfig.app.json
npx eslint <changed files>
npx vitest run
npx vite build
```

Then the Chromium route sweep in both themes (script lives in the session
scratchpad, not the repo). **Entry JS must stay ~195 kB gzip** — measure with
`grep -o 'assets/[^"]*\.js' dist/index.html | sort -u | while read f; do gzip -c "dist/$f" | wc -c; done`
and sum. A jump means something got pulled into the entry graph that should be
in a route chunk.

## Conventions worth knowing

- **Branch:** work happens on `claude/app-load-performance-nomenclature-3b4v1n`,
  restarted from `origin/main` after each PR merges. A merged PR is done — start
  follow-up work fresh from `main`, never stack on merged history.
- **Nomenclature is deliberate.** The product was renamed away from opaque
  metaphors: Campfires→Messages, Cabin→My Page, Circles→Friends,
  Lantern→Updates, Camps→Groups, Firekeeper/Trailblazer/Scout→
  Owner/Moderator/Settling in. **Table and column names and stored enum values
  are unchanged** (`camps`, `circles`, `post_type='ember'`, role `'firekeeper'`).
  Rename labels, never data. Old routes redirect rather than break.
- **CSS is token-based** (shadcn HSL role tokens in `index.css`, light/dark via
  `.theme-light`/`.theme-dark`). Shared primitives (`.panel`, `.module`,
  `.tab-strip`, `.state-panel`, buttons) live in `src/styles/handoff-shell.css`
  because it loads on every route; screen-specific CSS goes in a route-scoped
  file imported by the page. A shared class in a route stylesheet silently loses
  its styling on routes that don't import it — this has bitten us twice.
- **Empty/missing/error states** use `src/components/StatePanel.tsx`. On a
  network this small, empty is the common state; write it properly.
- **`get_boot_state()` is a hard dependency of the entire signed-in app.** One
  RPC returns profile, theme, roles, admin flag, suspension, age flag,
  onboarding state and unread counts. There is **no fallback** — if it is
  dropped or altered, nothing renders. Anyone touching auth, `is_admin`, or the
  `profiles` policies must confirm the definer path still returns.

## Reference docs (read when relevant, keep updated)

- `docs/spotify-integration.md` — Listening ships working via manual sharing;
  live Spotify needs an OAuth app + extended-API review (external, weeks-long).
  This doc is the exact seam where the live path plugs in.
- `docs/human-trust-system.md` — Trail Passes, invite gating, Ranger Station.
- `docs/lovable-migrations.md` — the migration handover process.
- `docs/competitive-brief.md` — competitive intelligence + positioning (v1.0,
  Aug 2026): the "human-scale social" category, competitor map (Yope,
  Friendster, SocialHuman, SpaceHey, Retro, PI.FYI, Lyvio, Myspace), the seven
  must-not-lose bets, and the never-copy list. Consult before positioning copy,
  landing pages, or feature bets that touch engagement mechanics.
- `docs/cabin-system.md` — the Cabin (the profile-as-place at `/u/:handle`):
  pre-build inventory, data model, authority split, zone contract, privacy
  rules. Read before touching anything under `src/components/cabin/`,
  `src/lib/cabin/`, the cabin tables, or the environment/creature engine.

---

## Current handoff

_Update this section as work lands. Keep it short: what shipped, what's open,
what the next session should know._

**As of 2026-08-14 (LATEST) — Cabin hidden, member Ranger Station (feedback
board), Settings/Invites access restored (branch
`claude/cabin-ranger-station-settings-yovcme`, pushed, not merged).**

Four asks from Kevin, all shipped:

- **Cabin hidden behind a flag.** New `src/lib/flags.ts`
  (`CABIN_ENABLED = false`). `/u/:handle` + `/cabin` redirect home (routes
  kept so `/u/foo` never falls into the `/:handle` catch-all); sign-in now
  lands on `/` (was `/cabin`); collection publish/delete return to `/me`;
  marketplace "Preview on my Cabin" gated; PWA shortcut → My Page. All cabin
  code untouched — re-enable is one flag flip.
- **Member-facing Ranger Station at `/ranger-station`** (`/ranger` repoints
  here; the ADMIN area under /grove is now labeled **"Moderation"**, and
  member copy says "the Rangers" — ReportSheet, Suspended, GroveAppeals).
  Any member files feature requests / bug reports and votes items up the
  board; Rangers get an inline status select + note per row. Migration
  `20260814000000_ranger_station_feedback.sql` — **applied LIVE via
  `query_database` (NOT in Lovable's ledger; repo file is source of truth)**:
  `feedback_items` + `feedback_votes`, SELECT-only RLS, all writes through 5
  definer RPCs (submit 5/day rate limit + auto-self-vote, idempotent vote
  toggle, author edit/delete only while `open`, `set_feedback_status` gated
  `ranger_level >= 1`). Verified per SECURITY.md: pg_policies/pg_proc + an
  18-case impersonated exploit test in a rolled-back transaction (all green,
  zero rows persisted — see SECURITY.md changelog). Client:
  `src/lib/feedbackApi.ts`, `src/hooks/useFeedback.ts`,
  `src/pages/RangerStation.tsx` (+ route-scoped `ranger-station.css`), drift
  tests keep client status/type vocab matching the migration CHECKs.
- **Settings reachable again** (orphaned since the 601b785 UI port): the
  topbar avatar is now a hand-rolled dropdown — My Page / Settings /
  My Invites / Ranger Station / Sign out — visible on ALL viewports
  (`.mini-me` un-hidden on desktop, panel styles in handoff-shell.css);
  feed left rail gains Ranger Station/Invites/Settings; My Page owners get
  a Settings paper-button. TabBar stays at its designed 5 slots.
- **Invites resurfaced:** `Feed.tsx` no longer hardcodes
  `<RightRail inviteUrl={null} />` (which showed every member "No invites
  left right now") — the rail now reads the real balance via
  `refresh_my_invites` (5-min staleTime) and shows the pass count;
  `useInviteeCount` now counts `user_lineage` rows instead of the legacy
  `invites`/`invite_uses` pair, so the "Invited" stat includes Trail Pass
  invitees.

**Verified:** tsc clean; eslint clean on changed files (7 pre-existing `any`
errors in MarketplaceDetail at baseline, untouched); 134 vitest pass (4 new);
build clean; entry 197.2 kB gzip (196.8 baseline — the +0.4 kB is the topbar
dropdown + flag, all board code rides in its route chunk); signed-out
Chromium sweep green on 12 routes × both themes.

**Kevin's signed-in eyeball list** (sandbox can't reach Supabase):
1. Sign-in lands on the feed; `/cabin` + `/u/<handle>` redirect home; My Page
   has no cabin button; publishing a collection returns to `/me`.
2. `/ranger-station`: file a feature + a bug; 6th same-day submit politely
   refused; vote/unvote moves the count; tabs/status filter/sort work; as
   admin the status select + note appear — move something to Planned; a
   second account sees status+note but no control.
3. Avatar dropdown desktop + phone; feed left rail shows the three new links.
4. Feed right rail shows the real pass count (matches `/invites`); the
   "Invited" stat is no longer 0 for Trail Pass inviters.
5. `/grove` nav reads "Moderation"; report sheet says "Send to the Rangers";
   `/ranger` lands on the member board.

**Deploy note:** the migration is live and additive (harmless to the current
frontend). The UI changes need this branch merged + published via Lovable to
reach underpines.com.

---

**Previously (2026-08-13) — invite-rotation + price-table + pine-pet path
fixes (branch `claude/security-issues-review-26w33x`, merged to main).**

Three more scanner findings fixed — migration
`supabase/migrations/20260813240000_invite_rotation_and_price_visibility.sql`,
**applied LIVE to prod via `query_database`** (NOT in Lovable's ledger):

- **(Critical) `rotate_invite_link`** now requires the caller to BE the
  `_user_id` it rotates (was: any member could pass an admin's id and kill
  that admin's founder invite link). Also fixed a pre-existing breakage found
  by the exploit test: rotation was updating BOTH of the founder's infinite
  invites (personal + the root `open-trail` link) into the same slug →
  unique-constraint error, i.e. rotation never worked. Now excludes
  `is_root`; `GroveSettings.tsx` founder-link fetch also excludes root (its
  `maybeSingle()` was erroring on two rows, blanking the panel).
- **(Warning) `collection_stripe_prices`** SELECT no longer `USING(true)` to
  anon — authenticated-only, published-or-author scoped. INSERT → authenticated.
- **(Warning) pine-pet edge fns** (`generate-pine-pet`, `finalize-pine-pet`,
  `regenerate-pine-pet-atmosphere`) now reject storage paths outside
  `${userId}/` — they service-role-read/wrote client-supplied paths.
  **⚠️ Needs edge-function deploy** (rides with the already-pending pine-pet
  deploys). DB + policy changes are live; client change is cosmetic-safe
  either way.
- Two "ignored" linter findings (anon/authenticated-executable definer fns)
  reviewed — ignore reasons still accurate, left as-is.

**Verified:** 7-case impersonated exploit test in a rolled-back transaction
(all pass, slugs unchanged after rollback), `pg_policies`/`pg_proc` state
checked, tsc clean, eslint clean on changed files, 130 vitest pass, build
clean, entry 196.8 kB gzip (unchanged). Signed-in eyeballs for Kevin: rotate
the founder link once from `/grove/settings` (should finally work), and a
pet creation round-trip after the edge deploy.

**Previously (2026-08-13) — join-approval RLS hardening + SECURITY.md
(branch `claude/security-issues-documentation-ri5yme`, pushed, not merged).**

Three database-schema-review findings fixed — migration
`supabase/migrations/20260813220000_rls_join_and_rating_hardening.sql`,
**applied LIVE to prod via `query_database`** (NOT in Lovable's ledger; repo
file is source of truth):

- **camp_members (critical):** self-join now requires open+active camp, an
  accepted join request, or an invite naming the user (new definer fn
  `can_self_join_camp`); never as firekeeper. Creators still bootstrap;
  firekeepers/trailblazers still add others (but can't mint firekeepers).
- **campfire_participants (critical):** self-join only into active
  camp-linked campfires the user is a camp member of (new definer fn
  `can_self_join_campfire`); otherwise only the campfire's firekeeper adds
  participants. Private DM/group history is no longer self-serve readable.
- **design_ratings (warning):** INSERT and UPDATE now require a matching
  `design_purchases` row; policies moved to `authenticated`.

**Verified:** `pg_policies`/`pg_proc` state + 9-case impersonated exploit
test in a rolled-back transaction (exploits blocked 42501, all legit client
flows pass — CreateCamp bootstrap, open-camp join, camp-bonfire join,
invited join, campfire creation, verified rating). Zero test rows persisted;
zero client-code changes needed, so no frontend deploy is required for this
one.

**Also fixed same session: the camp bonfire flow was entirely broken.**
Migration `20260813230000_camp_bonfire_flow.sql` (applied live via
`query_database`, NOT in Lovable's ledger): the `campfires` type CHECK never
allowed `'bonfire'`, so CreateCamp's chat-room insert silently failed —
prod had ZERO camp campfires. Also camp members couldn't SELECT a bonfire
they weren't yet participants of (so CampView.join and CampBonfire came up
empty even with the constraint fixed). CHECK now includes `'bonfire'`; new
campfires SELECT policy lets camp members read camp-linked campfires
(messages stay participant-gated); backfilled "Return of the Sonics
Bonfire" with all 4 members enrolled. 10-case impersonated test verified
the full CreateCamp + join→discover→self-enroll chains plus regressions
(all green, rolled back). tsc clean, 130 vitest pass, build clean — still
no client-code changes.

**Process change:** `SECURITY.md` created at repo root — hard RLS/edge rules
+ mandatory pre-change checklist + the running security changelog (see the
security gate note at the top of this file). Same rules pushed into
Lovable's project knowledge via `set_project_knowledge`, so Lovable's agent
reads them on every turn too. Keep both in sync: SECURITY.md is canonical;
the project knowledge is the enforcement copy for Lovable.

**Previously (2026-08-13) — runtime load-speed pass (branch
`claude/app-performance-optimization-in6h1o`, pushed, not merged).**

Entry bundle was already at target (196.8 kB gzip, +91 B over baseline), so
this pass attacked the network waterfalls that remained after the bundle work:

- **Feed collapsed from 3 serial round trips to 2 (1 on revisits).**
  `useFeedPosts` now embeds `author`, `reactions` and `post_media` directly in
  the posts query via PostgREST FK embedding (`profiles!posts_author_id_fkey`
  etc. — FKs verified against prod), and embeds `author` + camp name in the
  camp_posts query. The social graph (circles/mutes/camp memberships) moved to
  its own `['feed-graph', uid]` query with a 5-minute staleTime, so feed
  refetches inside that window skip it entirely.
- **Media signing batched + persisted.** `post-media` is now PRIVATE in prod
  (confirmed via `query_database` — the Aug 13 "403 fallback" commits were the
  other half of that cutover), so every image needs a signed URL. Previously
  each `<MediaImage>` fired its own `createSignedUrl` round trip before the
  browser could even start the image download. New `primeSignedMediaUrls()`
  signs a whole screenful in ONE `createSignedUrls` batch request; per-path
  promises register in the inflight map synchronously so mounting components
  join the batch. The signature cache also persists in sessionStorage (tab-
  scoped, TTL-checked on hydrate), so a reload inside the 1-hour TTL paints
  images with zero signing requests. Feed primes on data arrival; other
  screens (Photos, collections, campfires) still use the per-image path and
  could adopt priming later.
- **Likely-next route chunks prefetch on idle.** Once a signed-in member's
  first screen settles, AppLayout warms the HomePage/Campfires/MyPage chunks
  (requestIdleCallback, module-flag guarded), so tapping Feed/Messages/My Page
  is a cache hit instead of a chunk fetch.
- **Verified:** tsc clean, eslint clean on changed files (and the 6 pre-
  existing `any` errors in useFeedPosts are gone), 114 vitest pass (6 new
  batch/persistence tests), build clean, entry 196.8 kB gzip, signed-out
  Chromium sweep green on 10 routes × both themes. Signed-in feed against real
  data is Kevin's eyeball (sandbox can't reach Supabase) — specifically: feed
  renders with authors/reactions/images, a camp post shows its camp name, and
  images appear after a hard reload without new `/storage/v1/object/sign`
  requests in the network tab.
- **Possible follow-up:** a `get_feed()` definer RPC (the `get_boot_state`
  pattern) would take the feed to one round trip flat, but needs a migration +
  coordinated deploy; deliberately not started here.

**Previously (2026-08-13) — pre-beta review + signed-out lockdown + P1
security (branch `claude/platform-review-auth-seo-vytbcj`, pushed, not merged).
Full writeup: `docs/pre-beta-review-2026-08.md`.**

⚠️ **Migrations are LIVE on prod but the frontend/edge changes are NOT deployed.**
Three flows (new-user onboarding age step, waitlist signup, apply-a-design) are
degraded on the live site until this branch is published + edge functions
deployed — inherent to the fix (the DB now blocks the direct column writes the
old client still does). **Deploy this branch + the edge functions to close the
window.** See the "CRITICAL: deploy coordination" section of the review doc.

What shipped:
- **Search lockdown:** `robots.txt` hard-blocks all but `/`, `/privacy`,
  `/terms`; `noindex` meta added to `index.html`; `AppLayout` gate now covers
  the auth-loading window so no protected page mounts/fetches for a logged-out
  visitor. Verify the live `robots.txt` matches the repo (Lovable's SEO panel
  can override it).
- **P1 security (4 migrations, applied via `query_database` — NOT in Lovable's
  ledger — and verified against prod incl. a live impersonated exploit test):**
  `profiles` UPDATE revoked + column-scoped (killed self-serve Pines+, age-gate
  bypass, consent escape, free paid designs, seedling escape); age verification
  moved to `set_age_verification` definer RPC (server rejects a client that lies
  about a minor's age); `apply_cabin_design` RPC + free-only `design_purchases`
  INSERT; `join_waitlist` per-IP throttle (now service-role-only, fronted by the
  new `join-waitlist` edge fn); `age_gate_audit_log` anon-insert dropped for the
  `record_age_gate_event` RPC.
- **Edge/code (need deploy):** pine-pet cost abuse closed
  (`regenerate-pine-pet-atmosphere` Pines+ + rate limit; `generate-pine-pet`
  fixed to check `is_pines_plus` not a nonexistent table); `validate-invite`
  stops handing the ip_hash to the client; `handle-parental-consent` auth +
  atomic status claim; **all 36 functions declared in `config.toml`**.
- **Client data-loss bugs:** posts now appear after posting (feed + My Page);
  campfire messages restore + toast on failure; Spark keeps text on failure;
  root `ErrorBoundary`; `.eyebrow` moved to `handoff-shell.css`; `.env`
  gitignored.
- **Verified:** tsc/eslint(changed)/85 vitest/build clean, entry 192.1 kB gzip.

Open (from the review doc): CORS still `*` (ready impl in doc — needs real
origins); `post-media` bucket still public (Kevin's coordinated cutover);
no password-reset flow (add early in beta); server-side signup IP; several
non-blocking client bugs (inert feed reaction buttons, realtime channel churn).

---

**As of 2026-08-13 — retro messenger skins made period-faithful
(branch `claude/retro-messenger-skins-mgrjir`, pushed, not yet merged).**

Kevin's ask: ICU should look exactly like ICQ 2001b, Bullseye exactly like
AIM, Emessen exactly like MSN/WLM — real look-and-feel, not a palette
overlay, no extra buttons, on desktop AND mobile. What shipped:

- **`src/styles/messenger-skins.css` rewritten** (~800 lines): dead handoff
  CSS deleted (`.chat-window` grid + friends never matched any markup), then
  one consolidated section per skin covering both vocabularies (desktop
  stage classes + `.msg-skin-*`). Win9x chrome is drawn with explicit
  98.css-style box-shadow bevels (documented at the top of the file) because
  `outset`/`inset` border keywords render washed out. On mobile the
  `.msg-skin-surface` becomes the period window itself; no media queries
  needed since those hooks only render on mobile layouts.
- **Component hook pass (skin-agnostic, Pines pixel-identical):** the sender
  name now renders on *every* message with `is-mine`/`is-group`/`is-repeat`
  state classes — base CSS reproduces the old group-incoming-only
  visibility via `:where()` at 0,1,0 specificity, and each skin overrides it
  to build its transcript grammar (`Nick:` red/blue for ICU, bold
  blue/red `ScreenName:` with black text for Bullseye, grey "Name says:"
  lines for Emessen). The send button carries an icon + hidden "Send" label
  so skins can become labelled period buttons (tall AIM button, silver XP
  button) with CSS alone. ~20 previously unhooked surfaces got classes
  (dividers, banners, pills, faded, kebab menu, chip, sheets, voice bubble,
  cross-post card, mobile tabs/FAB, buddy `is-online`/`is-offline`), plus a
  decorative `.msg-skin-dp` display-picture slot in the thread header that
  only Emessen shows.
- **Trap discovered and fixed:** `.messenger-page` re-declares the full
  `--msg-*` token set on itself, which **masks any skin token block inside
  the desktop stage** — skin palettes must target
  `.skin-X, .skin-X .messenger-page`. Also the old forced-white header rule
  (`color:#fff !important` on all children) is gone, replaced by an
  inheritable `--msg-header-fg` (+ `--msg-chip-*`) so light header strips
  (ICU/Bullseye grey info band, Emessen "To:" banner) can go dark.
- **SkinThumb.tsx redrawn** per skin (flower+nick lines, AIM tree,
  says-pair) with palettes synced to the real chrome.
- **Verified:** tsc clean, 85 vitest pass, build clean, entry 192.1 KiB gzip
  (baseline 191.8 — CSS growth rides in the messenger route chunk),
  signed-out Chromium sweep green on 10 routes × both themes, and a
  static-DOM mock harness (scratchpad, replicates the real component markup
  against the built CSS) screenshotted all 4 skins × desktop/mobile-list/
  mobile-thread × light, plus pines+icu dark. Dark-mode bug found and fixed
  that way: cross-post text was `text-foreground/80` on the skins' white
  cards. Two pre-existing eslint errors in CampfireView (any + unused
  expression at baseline) left untouched.
- **Still Kevin's eyeball:** signed-in pass on real data (sandbox can't
  reach Supabase) — flip through all four skins on `/messages` desktop +
  phone, check a group campfire (sender names show per-line in retro skins,
  ICQ colors incoming nicks red), voice message, cross-post, and the
  Settings page picker. No backend/data changes whatsoever; skin previews in
  Settings update automatically.

**Previously (2026-08-10) — My Page / Cabin layout fix (branch
`claude/cabin-persons-profile-layout-4ayajv`).**

Kevin flagged the profile as "too wide and the bulletin board is a mess."
What changed:
- `.profile-layout` main column capped at 600px and centered (was an
  uncapped 1fr sprawling across the 1180px shell); `.cabin-page` capped at
  880px for the same reason.
- The Posts section of My Page now renders `HandoffPostCard` (the feed's
  card language) instead of the old pre-port Tailwind `PostCard`; the post
  card CSS moved from `feed.css` to `handoff-shell.css` since two routes now
  share it (the known route-stylesheet trap). Bulletins get their
  `.bulletin-label` chip + their `image_url` now renders (HandoffPostCard
  ignored row-level images before — feed benefits too). Drafts show as a
  "Draft — only you see this" meta note.
- Fixed a real crash: `CabinPostHistory`'s empty state dereferenced
  `atmosphere.cardBg` while MyPage passed `atmosphere={null}` — any profile
  with zero posts threw. The prop is gone.
- Verified: tsc/eslint/vitest/build clean, entry 191.8 kB gzip, signed-out
  Chromium sweep green both themes, plus a mock-data harness screenshot of
  the new profile layout in both themes (real signed-in eyeball still
  Kevin's — sandbox can't reach Supabase). Old `PostCard` still used by
  PostDetail / Search / CollectionView, untouched.

**Previously (2026-08-10) — coming-soon homepage + waitlist (PR #13, merged & published).**

The logged-out landing at `/` is now a coming-soon page: hero + email waitlist,
then a "what we're all about" section (five principles rendered from
`docs/competitive-brief.md`'s human-scale positioning). Signed-in users still
get their feed; `HomePage.tsx` untouched — only `src/pages/Index.tsx` changed.

- **Migration `20260810230000_waitlist_signups.sql` is APPLIED and verified**
  (via `query_database` directly, so like the cabin migration it is NOT in
  Lovable's ledger). `waitlist_signups` has RLS with admin-only SELECT/UPDATE
  and no INSERT path; the only write is the `join_waitlist(_email)` definer
  RPC — normalizes/dedupes, always answers success on duplicates (no
  membership probing), 500/hour insert cap. Functionally verified against
  production (insert, dedupe, invalid reject; probe row deleted).
- **Published via `mcp__Lovable__deploy_project`** after the squash-merge
  (Lovable synced commit `aeb23cb` before deploy). The sandbox cannot reach
  underpines.com (egress blocked, same as Supabase), so the live-page eyeball
  is Kevin's; local Chromium sweep was green in both themes and entry stayed
  191.6 kB gzip.
- **Waitlist admin UI shipped (same day):** `/grove/waitlist` lists signups
  with status management (waiting/invited/declined, remove, copy email).
  **Founder-only by Kevin's request** — migration
  `20260811000000_waitlist_admin.sql` (applied via `query_database`, NOT in
  Lovable's ledger) replaced the is_admin policies with
  `is_waitlist_admin()`, which only answers to kevin.nesgoda@gmail.com's
  auth account. Verified in production by role impersonation: Kevin's uid
  sees rows and can update; any other authenticated uid sees zero. The
  client email constant in `src/lib/waitlistAdmin.ts` is cosmetic (nav
  visibility); RLS is the gate. "Mark invited" is bookkeeping only — no
  email goes out (still blocked on `RESEND_API_KEY`).

**As of 2026-08-10 (later) — the Cabin system shipped (PR #11).**

### Stream C — the Cabin: profile-as-place (PR #11, branch `claude/under-pines-cabin-system-5i9ez5`)

Full Cabin/Profile spec (v1.0) implemented, all ten phases. Design +
inventory in `docs/cabin-system.md`. The short version:

- **`/u/:handle` is a place, not a page.** Exterior scene (the PR #1-deleted
  CabinScene/creatures/weather/seasons engine, resurrected wholesale and
  lazy-loaded in the route chunk — entry stays 191.6 kB gzip), interior room
  with 23 placement zones, fixtures with per-role actions, accessible
  "Things in this Cabin" drawer. `/:handle` (My Page) is untouched; the two
  cross-link. `/cabin` goes home.
- **Migration `20260810210000_cabin_system.sql` is APPLIED and verified** —
  applied directly via `mcp__Lovable__query_database` (it accepts DDL; no
  send_message round-trip needed), so it is NOT in Lovable's own migration
  ledger — the repo file is the source of truth. Verified: seed counts
  (53 items / 27 ingredients / 19 recipes / 16 events), RLS on all 17 new
  tables, 19 definer functions, plus a full functional pass (cook/discover,
  knock + rate limit, gift → provenance, atomic trade, event roll, zone
  trigger rejection) executed as real users inside a rolled-back
  transaction. Zero production rows persisted; `cabins` fills lazily as
  people visit their own cabin (starter kit auto-seeds).
- **Authority split:** all ownable state (inventory, pantry, trades, gifts,
  recipe discovery, event rewards, history) moves only through
  `cabin_*` SECURITY DEFINER RPCs that re-check blocks, privacy modes, and
  rate limits. Clients render; they cannot mint.
- **Contract to not break:** `src/lib/cabin/zones.ts` and the migration's
  zone CHECK are the same vocabulary — a vitest reads the .sql and fails on
  drift. `get_cabin_view` is the cabin's `get_boot_state`: one RPC paints
  the whole page.

**Open items from this stream:**
1. **Pine-pet edge functions may need redeploy.** `generate-pine-pet`,
   `finalize-pine-pet`, `regenerate-pine-pet-atmosphere` were restored to
   the repo (PR #1 deleted them; repo deletion ≠ undeploy) but the sandbox
   can't check deployment. If pet creation 404s, have Lovable deploy the
   three from `supabase/functions/`. They also need `LOVABLE_API_KEY` (or
   the AI key they read) present in function secrets.
2. **Signed-in eyeball pass** (sandbox can't do it): visit `/u/<handle>`
   as a member — starter cabin renders, Fix Up Cabin places/removes items,
   cook a s'more, visit someone else's cabin and knock/sign/gift/trade.
   The RPC layer is verified against production; this is about the pixels.
3. **Identity links still default to `/:handle`.** Spec §109 wants "Visit
   Cabin" as the default identity navigation; it's a per-link-site change
   left deliberate until Kevin decides the order (page vs. cabin).
4. **Supabase types are stale** — new tables/RPCs ride on the rangerApi-style
   `as any` cast in `src/lib/cabinApi.ts`. Regenerate types when convenient
   and the casts come out.

### Previously (same day): two parallel workstreams merged to `main`.

_Docs update (2026-08-10, branch `claude/under-pines-competitive-brief-5svnmi`):
added `docs/competitive-brief.md` — Kevin's v1.0 competitive intelligence +
positioning brief ("human-scale social"). Docs-only; no code changes._

> Two Claude sessions worked this repo concurrently. This handoff covers both.
> Branch note: the app-load/nomenclature stream used
> `claude/app-load-performance-nomenclature-3b4v1n`; the trust/security stream
> below used `claude/under-pines-human-trust-g05j5u`. Both restart from `main`
> after each merge.

### Stream A — boot performance, UI port, Listening (PRs #1, #6, #8)
- Boot performance: 456 kB → 195 kB entry gzip; boot collapsed from 9 requests
  to 1 via `get_boot_state()`.
- The full nostalgia UI port across every screen, with the vocabulary rename.
- Phase 5 Listening: working now via manual track sharing; Spotify live path is
  scaffolded but dormant (`docs/spotify-integration.md`).
- All Phase 2/3/4/5 migrations applied and independently verified.
- Added this `CLAUDE.md` (PR #8).

### Stream B — Human Trust / Bot Defense / Ranger Station + security (PRs #2, #3, #4, #5, #7)
Full design in `docs/human-trust-system.md`. What shipped:
- **Trust system (PR #2):** email-bound single-use **Trail Passes** replacing
  reusable slug links; **signup is now gated inside `handle_new_user()`** (a
  missing/invalid invite aborts account creation in the auth transaction — the
  old `/onboarding` was only soft-gated); trust/lineage/risk tables
  (`user_trust`, `user_lineage`, `trust_events`, `risk_signals`,
  `trail_passes`, `invite_allowances`, `moderation_cases`, `appeals`,
  `account_verifications`, versioned `security_config`, append-only
  `admin_audit_log`); ranger/senior_ranger/head_ranger roles + `ranger_level()`;
  the **Ranger Station** admin UI under `/grove/*` (cases, account review with
  "why flagged" signals, Trail Map, appeals, audit log); server-side signup
  risk edge function + `send-trail-pass`; behavioral rate-limit + duplicate-
  message triggers. Fixed two live bugs: `minor_safety` report reason (CHECK
  rejected it) and the missing `increment_reporter_count` RPC. Also fixed the
  self-clearing suspension hole (`suspended_until = null` holds no longer
  delete themselves) and added an appeal flow to the suspended page.
- **PR #3 (grants):** turned out **redundant** — this DB auto-grants new tables
  (see "How the backend actually works"). Harmless/idempotent; left in history.
- **Security hardening (PR #4) — all 6 pre-publish scanner findings FIXED, zero
  accepted** (verified in Lovable): `invites.secret_token` public read →
  owner-only + `get_invite_landing()` definer RPC for the pre-auth landing;
  `post_media`/`reactions` → `can_see_post()`; `profiles` PII → authenticated-
  only SELECT (the only pre-auth reader was the invite landing, now via RPC —
  and `get_boot_state` does not depend on that policy); `voice-messages` bucket
  → participant-scoped; `realtime.messages` → topic-scoped policies (this
  backend allowed the managed-schema DDL).
- **Edge-function auth (PR #5):** the six open functions now authenticate.
  `triage-report`, `fetch-og-metadata` (+ SSRF hardening), `send-parental-consent`
  verify a real member via `_shared/auth.ts` — **deployed & verified live**.
  `process-monthly-payouts`, `check-block-thresholds`, `send-push-notification`
  are gated on a `CRON_SECRET` with `verify_jwt=false` in `config.toml` —
  **NOT deployed** (see open item 1).
- **Logged-out gate (PR #7) — live & verified.** `AppLayout` shows a
  "sign in or get an invite" Gate to any logged-out visitor on a non-public
  route, so a shared/indexed profile link (`/:handle`) leads to the gate, never
  the page. Public routes: `/`, `/login`, `/onboarding`, `/privacy`, `/terms`,
  `/invite/*`, `/join/*`. Lovable confirmed logged-out `/kevin`→gate, `/feed`→
  gate, `/`→landing, `/login`→sign-in on production.

**Open, and owned by a human:**
1. **Three cron edge functions await `CRON_SECRET`.** `process-monthly-payouts`
   (pg_cron job #5, monthly), `check-block-thresholds` (pg_cron job #7, daily),
   and `send-push-notification` (no caller yet) refuse to run until
   `CRON_SECRET` is set (they return 503 if it's unset — fail-closed by design).
   To finish: `openssl rand -hex 32` → save as `CRON_SECRET` in Supabase
   secrets; add header `"x-cron-secret": "<value>"` to pg_cron jobs #5 and #7
   (`cron.alter_job`); then deploy those three. No DB webhook calls them.
2. **post-media bucket lockdown — committed but reverted; needs a clean
   cutover.** The signing client (`src/lib/signedMedia.ts`,
   `src/components/MediaImage.tsx`, converted render sites, markdown `![]()`
   support) is on `main` but **unpublished**. An attempt to flip the bucket
   private caused a brief live-image outage (private bucket vs. old public-URL
   client) and was reverted: **bucket is public again, images serve (200),
   `main` is consistent.** `createSignedUrl` works against a public bucket, so
   the cutover is: (a) get a **signed-in** Lovable preview and verify images
   render through `MediaImage` on feed / post detail / campfire photo /
   collection cover / newsletter (the sandbox can't do signed-in checks — this
   is the one thing a human must eyeball); (b) flip the bucket private; (c)
   publish — all together. Flipping private raises a NEW error-level finding
   `post_media_bucket_open_to_all_authenticated` (authenticated-only read
   doesn't enforce per-post circle visibility). **Recommended: accept it** — the
   "hidden when logged out" goal is fully met, object paths are random UUIDs, and
   a per-content storage policy would be fragile/slow and risk the intentionally-
   broad images (collection covers, newsletters). Do NOT flip private without
   publishing the signing client in the same pass.
3. **Trail Pass emails need `RESEND_API_KEY`** in Supabase function secrets;
   until then the invite UI falls back to a copyable link. Turnstile
   (`TURNSTILE_SECRET_KEY`) and phone step-up stay dormant behind
   `security_config` flags until credentials + a provider are added.
4. **Spotify review clock is not started** (Stream A) — see
   `docs/spotify-integration.md`.

**Verification at last handoff:** `tsc` clean, 85 vitest tests pass, `vite
build` clean, entry 191.6 kB gzip, Chromium sweep green in both themes on
`main` (PR #11 merged). No GitHub Actions CI exists; Lovable's scan + preview
is the pipeline. Original 6 findings cleared; production live at
www.underpines.com with the gate, trust system, and the cabin schema applied.
