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

**Always hand Kevin a Lovable prompt too (Kevin's standing request).** Any
time a session produces a migration — or anything else that needs Lovable to
act (apply SQL, publish the frontend, deploy an edge function) — end the
session by giving Kevin a ready-to-paste prompt for the Lovable agent in the
chat reply, even when the session already applied or requested the change
itself through the MCP. The prompt should state exactly what to run or
deploy, in what order, what NOT to improvise, and what a checkable success
looks like (row/policy/function counts), so Kevin can drive the handover
from the Lovable editor without reconstructing context.

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

**As of 2026-08-15 (LATEST) — posting fixed (compose sheet was never
mounted) + topbar now FIXED to the top edge (kills the iOS launch gap for
good) (branch `claude/post-creation-broken-m3y15n`; no migration, no edge
deploys — needs Lovable PUBLISH only).**

**Topbar (Kevin's round-2 report, same session):** the rest gap returned on
the installed PWA even after the 88936b2 sticky rework. His screenshot
proved the mechanism: the FIXED `::before` status strip sat correctly at the
physical top while the STICKY bar was parked ~180px down — iOS standalone
offsets the in-flow document until the first scroll, but fixed elements
don't ride it. Per Kevin's direction ("move the top bar up, don't widen
it"): `.topbar` is now `position: fixed; top: 0` and pads itself
`env(safe-area-inset-top)` (visible bar content stays exactly 64px;
border-box), `::before`/`::after` cover strips deleted, `.app` padding-top
becomes `calc(64px + inset)` so net content offset is unchanged (Campfires'
height calc unaffected). The standalone scroll nudge stays — any residual
launch offset now shows as a benign gap *below* the bar that the nudge
closes. Sweep asserts `.topbar` computes `fixed @ top:0 / 64px`.

Kevin's report: tapping Photos or the compose box on the feed did nothing.
Root cause: the feed composer is a trigger-only stub that flips
`composerOpen` on NavigationContext, and the only listener —
`MobileComposerSheet` — was lazy-imported in `AppLayout.tsx` but **never
rendered** (the JSX was dropped in the d3aa89a lazy-loading refactor and no
test covered the mount). My Page's `WallComposer` uses local state, which is
why posting still worked there. NOT the topbar CSS; no overlay involved.
Yesterday's Lovable publish put the broken build live, surfacing it.
(Lovable's own commits that evening — forceRefresh one-shot purge/sign-out +
tests + types regen — are benign and untouched.)

What shipped:
- `AppLayout.tsx`: `<MobileComposerSheet />` mounted in the signed-in shell
  (inside `Deferred`, after `TabBar`) — the one-line core fix.
- Intent plumbing: `NavigationContext` gains `composerIntent` +
  `openComposer(intent?)` (closing clears intent). Feed's **Photos** button
  now opens the photo composer directly, **Blog** navigates to `/new/story`,
  compose box/Post open the picker. Sheet seeds `activeType` from intent.
- Sheet labels renamed per nomenclature policy: "Ember Post"→"Photos",
  "Story"→"Something longer" (data values untouched).
- Hygiene: `pointer-events: none` on the decorative safe-area strips
  (`.topbar::before/::after`, `.fullscreen-shell::before`).
- Deleted dead `ComposerStub.tsx` (imported by nothing).
- New regression tests `AppLayout.composer.test.tsx` (4): sheet mounts in
  the authenticated shell, closed sheet renders nothing, ember/spark intent
  skips the picker.

**Verified:** tsc clean; eslint clean on changed files (2 pre-existing
NavigationContext warnings at baseline); 179 vitest pass (175 + 4 new);
build clean; entry 193.4 kB gzip (= this branch's baseline — the sheet stays
in its lazy chunk); signed-out Chromium sweep green 12 routes × both themes.
Signed-in flow is Kevin's eyeball after publish: feed compose box → sheet
opens; Photos → straight to the photo composer; post a Spark and see it land
in the feed; Blog → story editor.

**Remaining:** Lovable publish (this branch merged first). Still pending
from previous entries: the 4 deep-scan edge functions need deploy.

---

**Previously (2026-08-14) — Kevin's five UI fixes + personal invite links
(branch `claude/ui-fixes-feature-requests-r7hbtw`; migration APPLIED to prod
+ 24-assertion exploit test green; needs Lovable PUBLISH only — no edge
deploys).**

Kevin's asks from his iPhone, all shipped:

1. **Topbar fixed.** The 300px navy `::before` filler from the 8a9145d iOS
   safe-area fix painted the whole launch-offset gap navy → giant header at
   rest. Now: plain 64px sticky bar (`top: env(safe-area-inset-top)`), a
   thin FIXED status-bar strip, above-bar cover capped at one inset, `.app`
   gets matching top padding so sticky never displaces over content. The
   standalone scroll nudge retries while the doc is too short to scroll and
   re-fires on visualViewport resize. Sweep asserts `.topbar` computed
   height 64px.
2. **Personal multi-use invite links (textable).** Kevin chose multi-use
   over email-optional single-use (AskUserQuestion). One reusable
   `/invite/<slug>` per member; each signup spends one allowance pass;
   rotate = deactivate-and-recreate. Migration
   `20260815100000_personal_invite_links.sql` **APPLIED via query_database
   (NOT in Lovable's ledger)** — full detail + verification in SECURITY.md's
   2026-08-14 personal-links entry (read it before touching invites/signup).
   **Follow-up same day (Kevin's ask): links limited to 7 days + 10 joins,
   auto-renewing** — migration `20260815110000_personal_link_limits.sql`
   (also APPLIED + exploit-tested, own SECURITY.md entry; now the newest
   source of `handle_new_user`/`get_invite_landing`/`get_my_invite_link`).
   Panel shows "Good through <date> · N joins left"; expired/exhausted links
   retire themselves and a fresh one mints on the next /invites visit.
   Client: "Your personal link" panel on /invites (navigator.share → the
   iPhone share sheet is the "text it" path, copy fallback, rotate w/
   inline confirm), landing shows "resting" copy when the owner is out of
   passes. `handle_new_user`/`accept_invite_create_circle`/
   `rotate_invite_link` re-emitted from LIVE bodies — this migration file is
   now their newest source. No edge changes (validate-invite already rate-
   limits personal rows via its infinite-link path).
3. **Sign out discoverable:** avatar dropdown trigger gains a ▾ caret;
   Settings gets a "Your Session" section (signed-in email + full-width
   destructive Sign out row) replacing the buried ghost button.
4. **Design economy parked:** `MARKETPLACE_ENABLED = false` in
   `src/lib/flags.ts` gates the five routes (App.tsx, kept registered →
   Navigate replace), the three Settings items, and the three design
   notification deep links (degrade to `/`, cabin pattern). Flag flip
   re-opens everything. `/grove/designs` (admin) untouched.
5. **Feed reactions work in place:** `HandoffPostCard` embeds the working
   `ReactionBar` for regular posts (new `onReactionChange` prop); camp
   posts keep a plain button — their ids must never reach
   `reactions.post_id` (new `_isCampPost`/`_campId` tags in useFeedPosts +
   pure `feedPostTarget()` helper, unit-tested). `onOpen` now actually
   navigates (feed → post detail or camp; MyPage likes tab wired too;
   CabinPostHistory refetches counts without blanking).

**Verified:** tsc clean; eslint clean on changed files (pre-existing `any`
baselines untouched: PostCard ×1, InviteLanding ×2); 167 vitest pass (11 new:
3 feedPostTarget, 1 marketplace-degradation, 7 personal-link migration
drift incl. the limits shapes); build clean; entry 197.6 kB gzip (197.5 baseline — the caret + flag
are the only entry-graph additions); signed-out Chromium sweep green 12
routes × both themes + topbar-height assertion. Migration verified per
SECURITY.md (state checks + 24-assertion exploit test, all ok, rolled back
clean).

**Remaining:** Lovable publish (one publish covers all five — the migration
is already live and harmless to the old client). Kevin's signed-in eyeball:
topbar at rest/scrolled in Safari + installed PWA (relaunch twice), /invites
→ personal link create/share/rotate + a real signup through it on a fresh
email, avatar caret + Settings sign-out on the phone, Marketplace/My
Designs/Payouts gone from Settings (+ `/marketplace` redirects home), and
reacting straight from the feed. Note the still-pending items from the
previous entry below: 4 deep-scan edge functions still need deploy.

---

**Previously (2026-08-14) — deep-scan security batch (5 findings fixed;
migration APPLIED to prod + 12-case exploit test green; 4 edge functions
NEED DEPLOY + frontend publish).**

Kevin ran the fresh Lovable security scan after the deploy pass; 7 findings
triaged (2 stale — `rotate_invite_link` and pine-pet paths, verified already
fixed in prod). The 5 real ones are fixed — full detail in SECURITY.md's
2026-08-14 deep-scan entry (read it before touching any of this):

- Migration `20260814080000_notification_send_paths_and_rating_privacy.sql`
  (applied via `query_database`, NOT in Lovable's ledger): nudges go through
  new `send_smoke_signal()` RPC (lineage-gated, via `notify_user`),
  newsletter fan-out is now an AFTER trigger on `camp_newsletters`, direct
  notification INSERT is admin-notices-only, `design_ratings` reads scoped
  to buyer + creator (new `created_design()` helper). Client: `Invites.tsx`
  → RPC, `CampNewsletterComposer.tsx` fan-out deleted, new vitest pins the
  insert sites + policy shape.
- Edge (in repo, **not deployed**): `create-checkout-session` price
  allow-list vs `STRIPE_MONTHLY/ANNUAL_PRICE_ID` (503 if unset),
  `stripe-webhook` strict price→plan (no grant on unknown price),
  `send-trail-pass` HTML-escapes names, `triage-report` fences reported
  content + never auto-clears (escalation-only) + escapes AI text in the
  alert email.
- Verified: state checks + 12-case impersonated exploit test
  (`docs/notification-send-paths-exploit-test.sql`), all green, rolled
  back; tsc/vitest(144)/build/sweep clean, entry 197.5 kB gzip unchanged.
  Pre-existing 2 `any` errors in CampNewsletterComposer at baseline,
  untouched.
- **Remaining:** Lovable publish (nudge shows its error toast on the live
  site until then — migration-first ordering, same as the overhaul) + deploy
  the 4 edge functions. Kevin's signed-in eyeball: nudge an invitee from
  /invites, send a camp newsletter and see member Updates rows, and (if
  Stripe is configured) a Pines+ checkout round-trip.

---

**Previously (2026-08-14) — iOS PWA topbar gap fix + first-load trims
(branch `claude/mobile-header-sticky-fix-lmhdb2`).**

Kevin's report: on the installed iPhone PWA, a tan gap sits above the navy
topbar at rest; scrolling makes the bar stick, then the gap returns. Root
cause class: the page left the status-bar strip to iOS (no
`viewport-fit=cover`, no safe-area handling), and iOS standalone mode has a
long-standing bug where that OS-managed band opens a gap above the web view
until the first scroll. The fix takes the strip over:

- `index.html`: `viewport-fit=cover` + `apple-mobile-web-app-capable` +
  `apple-mobile-web-app-status-bar-style=black-translucent` (+ app title).
  The page now owns the full screen; white status text sits on our navy.
- `.topbar` pads itself `env(safe-area-inset-top)` (height goes to calc) and
  gains a `::before` that extends 300px of navy above it — rubber-band
  overscroll and the buggy launch offset can no longer show page background
  above the bar. `.tabbar`'s existing `env(safe-area-inset-bottom)` padding
  becomes active now that cover is set; mobile `.app` bottom clearance grows
  to match. Campfires' mobile list height calc subtracts the top inset.
- Full-screen routes (login/onboarding/legal/gates — everything without the
  topbar) render inside a new `.fullscreen-shell` (AppLayout): safe-area top
  padding + a fixed navy strip behind the status text. GroveLayout got the
  same padding inline.
- `src/lib/standaloneViewport.ts` (called from main.tsx): standalone-only,
  at-rest-only scroll nudge on launch/foreground — the documented
  self-correction for the iOS offset bug.
- First-load trims for the ~12s cold start Kevin saw: `<link rel=preconnect>`
  ×2 (CORS + plain) to the Supabase origin in index.html, and the HomePage
  chunk warms at App.tsx module scope (was: fetched only after React booted
  and the router rendered). The rest of the 12s is cold-start waterfall
  (entry → boot RPC → feed → signed media) + PWA process launch; the
  `get_feed()` RPC idea in the 2026-08-13 perf entry remains the next big
  lever.

**Follow-up (same day): home-screen icon.** Kevin's installed PWA showed a
generated green "U" tile instead of the badge. The repo's 192/512 icons were
already the badge, but they had transparent corners (iOS paints those black)
and the live install predated/never fetched them. Fixed: new
`public/apple-touch-icon.png` (180px, badge full-bleed on the black ground,
now referenced from index.html with `sizes`), and `pwa-icon-192/512.png`
regenerated opaque with the badge inside the maskable safe zone (~84%) so
Android's circle crop can't clip the ring. Composited via Chromium canvas
(no image tooling in the sandbox); the original transparent 512 badge is in
git history if ever needed as a source again. **Icon changes only show after
a Lovable publish AND deleting + re-adding the Home Screen icon** — iOS
snapshots the icon at install.

**Verified:** tsc clean; eslint clean on changed files; 142 vitest pass;
build clean; entry 197.5 kB gzip (197.2 baseline — the +0.3 kB is safe-area
CSS + the nudge module); signed-out Chromium sweep green 12 routes × both
themes. NOT verifiable here (no iOS device, no Supabase egress): the actual
notch behavior. **Kevin's eyeball after Lovable publish:** relaunch the
installed PWA (force-quit first; the service worker picks up the new
index.html on the second launch — if the status bar still looks off after
two launches, remove and re-add to Home Screen, since iOS snapshots those
metas at install), then check: no gap above the navy bar at rest, bar stays
put while scrolling, clock/battery readable over navy, tab bar clears the
home indicator, login page (signed out) shows a navy strip behind the clock,
and second-launch load time vs the ~12s first run.

---

**Previously (2026-08-14) — Notification system overhaul (PR #23, merged;
migration APPLIED to prod via Lovable and verified — exploit test 12/12
green + independent state checks. Lovable re-recorded it in its ledger as
`20260814060500_6eb130d5-….sql` and regenerated `supabase/types.ts`, so the
new tables/columns are in generated types now. Remaining: Lovable PUBLISH
(safe now — do it promptly, the badge already counts reactions the old UI
hides) + `send-daily-ember` edge deploy; Kevin's eyeball list in
`docs/notifications-deploy.md`).**

Kevin's ask: FB/IG-style notifications — "X commented", "X liked your post",
"X accepted my invite", click-through to the thing, clear-all. Decisions
(AskUserQuestion): reactions live + aggregated, Clear all = permanent delete,
in-app only (web push stays the known-broken scaffold, untouched).

- **Migration `20260815000000_notification_system_overhaul.sql` — the whole
  backend.** Production moves server-side: `notify_user()` definer helper
  (blocks, per-type preference enforcement — first time the `notify_*` prefs
  do anything — 10-min dedupe, exception-swallowing) + 10 AFTER triggers
  (replies incl. nested-reply parents, aggregated reactions, circles
  request/accept — fixing the 1-of-3-paths inconsistency — quote posts, camp
  member/join-request events) + one notify call added to the LIVE bodies of
  `handle_new_user`/`redeem_trail_pass`/`accept_invite_create_circle`
  (`invite_accepted` finally has producers). Stale CHECKs fixed: 6 live
  notification types were being rejected (ranger `system` notices ERRORED in
  moderation RPCs!) and 3 of the client's 9 reaction emoji (🫠🙄🌕) were
  silently dropped. RLS: DELETE policy (new), UPDATE column-scoped to
  `is_read` + WITH CHECK, INSERT narrowed to smoke_signal/camp_newsletter/
  admin-null-actor. `get_boot_state` re-emitted minus the reaction_batch
  exclusion. Reactions collapse to one row per (recipient, post) via a
  partial unique index; counts recomputed in-trigger, bump-to-unread only
  when the count grows (emoji-change dance doesn't re-notify).
- **⚠️ APPLY IS THE BLOCKING STEP.** This sandbox was denied DDL
  (`query_database` classifier-blocked, `send_message` needed interactive
  approval), so unlike previous migrations this one is NOT live.
  **`docs/notifications-deploy.md` is the runbook** — apply order (migration
  BEFORE frontend publish, or notifications silently stop), then
  `docs/notifications-exploit-test.sql` (12-case impersonated test, rolls
  itself back), then the state checks. SECURITY.md entry is written and
  marked NOT YET APPLIED — update both after the apply.
- **Client:** `src/lib/notificationsApi.ts` (all reads/writes centralized,
  keyset pagination), `src/lib/notificationCopy.ts` (all 25 types → copy +
  real route; cabin events degrade to actor profile while `CABIN_ENABLED`
  is false), `src/hooks/useNotifications.ts` (infinite query + mutations).
  `Lantern.tsx` overhauled: reactions live with "X and N others", per-row
  dismiss ✕, Clear all with inline confirm, "Show older" pagination, new
  Cabin section, no more "Something happened." rows. Six redundant client
  notification inserts deleted (ReplyThread, ReactionBar, QuoteComposer,
  CircleButton ×2, useFriends, WelcomePeople). NavigationContext badge stops
  excluding reaction_batch (recount + realtime). Mobile finally gets a door:
  🔔 + count in the topbar under 700px, "Updates (N)" row in the avatar
  dropdown everywhere (TabBar untouched at 5 slots). `send-daily-ember`
  sums `aggregate_count` (needs edge deploy; undercounts harmlessly until).
- **Verified:** tsc clean; eslint clean on changed files (2 pre-existing
  `any` errors in ReplyThread at baseline, untouched); 142 vitest pass
  (8 new: CHECK-constraint drift ×2, copy coverage of all 25 types,
  aggregated-copy boundaries, cabin-flag link degradation, pagination
  merge/dedupe); build clean; entry 197.2 kB gzip (= baseline, the bell rides
  free); signed-out Chromium sweep green 12 routes × both themes. NOT
  verifiable here: everything signed-in/data-dependent — that's the exploit
  test (post-apply) + Kevin's eyeball list in the runbook.

**Previously (2026-08-14) — Cabin hidden, member Ranger Station (feedback
board), Settings/Invites access restored (branch
`claude/cabin-ranger-station-settings-yovcme`, merged to main; live site
still needs a Lovable publish).**

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
