# Under Pines — security rules & changelog

**This file is mandatory reading before any code, schema, RLS, or edge-function
change — for Claude sessions AND for Lovable's agent.** `CLAUDE.md` requires it
for Claude; Lovable's project knowledge requires it for Lovable. If a change
touches the database or an edge function and this file wasn't consulted, the
change isn't done.

Two purposes:

1. **Rules** — the checklist that stops the recurring classes of security bugs
   this project keeps finding in review.
2. **Changelog** — every security-relevant change lands here, so scanner
   findings can be checked against what's already fixed and the same hole is
   never re-opened by a rewrite.

---

## Part 1 — Rules

### The golden rule of RLS on this project

**`user_id = auth.uid()` is an identity check, not an authorization check.**
It proves who's writing the row — it says nothing about whether they're
*allowed* to. Every INSERT/UPDATE policy must also answer: *what grants this
user the right to create this relationship or content?*

This exact bug has now shipped three times (camp self-join, campfire
self-join, unverified design ratings). Before writing any INSERT policy on a
membership/participation/junction table, ask: **"can a hostile user self-insert
their way into someone else's private data with this policy?"**

### Membership & junction tables (camp_members, campfire_participants, and anything like them)

- Self-insertion must be gated on one of: the resource is explicitly open
  (`visibility = 'open'`), an accepted request row, an invite row naming this
  user, or the user owns/created the resource.
- Adding *other* users requires an owner/moderator role check
  (`has_camp_role`-style SECURITY DEFINER helper).
- Self-inserts must not be able to choose a privileged role (`role IN
  ('member','scout')`, never `'firekeeper'`).
- Remember: **read access on this app is participation-gated.** A single weak
  membership INSERT policy = full read access to private message history,
  member-only posts, lodge items, newsletters.

### Content-integrity writes (ratings, reviews, reactions, counters)

- Any row that *asserts a fact* ("I bought this", "I attended this") must
  verify the underlying fact with an EXISTS against the source-of-truth table
  (e.g. `design_ratings` → `design_purchases`), on INSERT **and** on UPDATE's
  `WITH CHECK` (otherwise the row can be re-pointed at a resource the check
  never ran against).

### Writing RLS policies — mechanics that have bitten us

- Policy subqueries against other tables **run through those tables' RLS**. If
  the acting user can't SELECT the row being checked (e.g. an invitee can't
  read `camp_invites`, a joiner can't read a `campfires` row they're not in
  yet), the check silently fails. Use a `SECURITY DEFINER` helper function
  (`STABLE`, `SET search_path TO 'public'`) — the established pattern:
  `is_camp_member`, `has_camp_role`, `is_campfire_participant`,
  `can_self_join_camp`, `can_self_join_campfire`.
- `TO authenticated`, not `TO public`, on every policy unless anon access is
  the explicit point.
- No client-controlled UPDATE on privileged columns — use column-scoped grants
  or a definer RPC (`profiles` is the precedent: self-serve UPDATE is revoked;
  writes go through RPCs like `set_age_verification`).
- Anything that mints value, consumes a quota, or claims a status must be a
  SECURITY DEFINER RPC that re-checks server-side (`apply_cabin_design`,
  `join_waitlist`, the `cabin_*` family). Clients render; they cannot mint.
- New tables auto-grant `anon`/`authenticated`/`service_role` in this database.
  **RLS is the only gate** — a new table without policies is world-writable to
  any signed-in user.

### Edge functions

- Every function authenticates: member-facing via `_shared/auth.ts`; cron/
  internal via `CRON_SECRET` header, fail-closed (503 when unset) with
  `verify_jwt=false` declared in `config.toml`.
- Every function is declared in `supabase/functions/config.toml`.
- Never return internal fields (ip_hash, tokens, service data) to the client.
  Validate outbound URLs (SSRF — `fetch-og-metadata` is the precedent).
- Rate-limit anything that costs money (AI generation) or sends anything.

### Client code

- The client is never the enforcement point. A UI guard (like "invite-only —
  ask a member") is UX, not security; the RLS policy must enforce it too.
- Never ship a flow that only works because RLS is loose. If a client write
  starts failing after a policy tightens, fix the flow (or add a proper
  approval path), don't loosen the policy.

### Mandatory checklist for ANY schema/RLS/edge change

1. Read this file (you're here) and the relevant policy history in Part 2.
2. For each new/changed policy: walk the hostile-user question above.
3. Apply via `mcp__Lovable__query_database` (or Lovable `send_message`),
   then **verify independently** — `pg_policies` / `pg_proc.prosecdef` /
   `proconfig`, never trust the apply report.
4. **Run an impersonated exploit test in a rolled-back transaction**: a DO
   block that `SET LOCAL ROLE authenticated` + sets `request.jwt.claims`,
   attempts the exploit (must fail, SQLSTATE 42501) and the legitimate flows
   (must succeed), then `RAISE EXCEPTION` to force rollback. The
   2026-08-13 session transcript and `supabase/migrations/20260813220000_*.sql`
   are the worked example.
5. Confirm `get_boot_state()` still returns for a normal member if the change
   is anywhere near auth, `profiles`, or roles.
6. Record the change in Part 2 below, and update `CLAUDE.md`'s handoff.

---

## Part 2 — Security changelog

_Newest first. Every security-relevant change gets an entry: date, what, why,
where (migration file / PR), verification._

### 2026-08-14 — Ranger Station feedback board (new tables, RPC-only writes)
**Migration:** `supabase/migrations/20260814000000_ranger_station_feedback.sql`
(applied via `query_database` — NOT in Lovable's ledger). New member-facing
feedback board: `feedback_items` (feature/bug + status + ranger_note) and
`feedback_votes` (PK item+user). Design follows the RPC-only write pattern:
both tables carry a single `SELECT TO authenticated USING (true)` policy and
**no INSERT/UPDATE/DELETE policies at all** — the self-insert bug class has no
policy to exploit. Writes go through five SECURITY DEFINER fns (actor always
`auth.uid()`): `submit_feedback` (validates type/length, 5/author/24h rate
limit, auto-votes own item), `toggle_feedback_vote` (idempotent, PK-bounded),
`update_own_feedback` / `delete_own_feedback` (author only, only while
`status='open'`), `set_feedback_status` (`ranger_level >= 1` only).
**Verified in production:** `pg_policies` (exactly 2 SELECT policies) +
`pg_proc` (5 fns, prosecdef, `search_path=public`), then an 18-case
impersonated exploit test in a rolled-back transaction — direct INSERT
blocked 42501 on both tables, direct UPDATE/DELETE match zero rows, non-ranger
status change → `not_allowed`, non-author edit/delete rejected, 6th same-day
submission → `rate_limited`, post-triage edits locked, anon reads zero rows
and cannot submit, `get_boot_state()` unaffected; legit submit/vote-toggle/
own-edit/ranger-status all pass. Zero test rows persisted.

### 2026-08-13 — Invite rotation caller check, price-table lockdown, pine-pet path pinning
**Migration:** `supabase/migrations/20260813240000_invite_rotation_and_price_visibility.sql`
(applied via `query_database` — NOT in Lovable's ledger). Three scanner
findings fixed:

- **(Critical) `rotate_invite_link(_user_id)` trusted its parameter.** It
  checked `is_admin(_user_id)` but never that the caller IS `_user_id`, so any
  authenticated member could pass an admin's id and invalidate/regenerate that
  admin's founder invite link (DoS on the founder's invite flow). Now the
  function requires `_user_id = auth.uid()` AND `is_admin(auth.uid())`, and
  operates only on `auth.uid()`'s rows; EXECUTE revoked from `anon`. Bonus bug
  fixed: the UPDATE hit *both* of the founder's infinite invites (personal
  link + the root `open-trail` open-signup link), which made rotation die on
  the slug UNIQUE constraint — it now excludes `is_root` rows, and
  `GroveSettings.tsx`'s founder-link fetch excludes them too (its
  `maybeSingle()` errored on two rows, blanking the panel).
- **(Warning) `collection_stripe_prices` SELECT was `USING (true)` TO public**
  — anonymous internet users could read `stripe_price_id`/`stripe_product_id`/
  `amount_cents` for every collection, drafts included. SELECT is now
  `TO authenticated`, scoped `EXISTS (collections … is_published OR author_id
  = auth.uid())` — mirroring the `collections` visibility policy; INSERT moved
  `public` → `authenticated` (same author check). Edge functions
  (`create-collection-price`, checkout, webhooks) use service role and are
  unaffected; the only client read (`CollectionView.handleSubscribe`) is
  signed-in.
- **(Warning) pine-pet edge functions trusted client storage paths.**
  `generate-pine-pet` (`photo_storage_path`) and `finalize-pine-pet`
  (`selected_sprite_path`, `original_photo_path`) service-role-read/write
  whatever path the client sent — any member could read another member's
  uploaded pet photo, or point their pet at someone else's original.
  All paths must now start with `${userId}/` (and contain no `..`);
  `regenerate-pine-pet-atmosphere` re-checks the stored
  `pet.original_photo_path` before downloading, as defense in depth for
  pre-fix rows (prod scan found zero foreign-path rows). ⚠️ **Requires
  edge-function deploy** to take effect; client upload path is already
  `${user.id}/…` so no frontend change.

**Verified in production:** function/policy state via `pg_policies`/`pg_proc`
+ acl, and a 7-case impersonated test in a rolled-back transaction — member
rotating the admin's link blocked, non-admin self-rotation blocked, anon
EXECUTE blocked (42501), anon price read sees 0 rows, member sees only
published-collection prices, author sees own draft price, and the legit
founder rotation succeeds with `open-trail` untouched. Slugs confirmed
unchanged after rollback.

### 2026-08-13 — Camp bonfire flow repaired (constraint + campfire visibility)
**Migration:** `supabase/migrations/20260813230000_camp_bonfire_flow.sql`
(applied via `query_database` — NOT in Lovable's ledger). The
`campfires_campfire_type_check` constraint never allowed `'bonfire'`, so every
camp's chat-room creation had been silently failing (prod had zero camp-linked
campfires). Also, the participant-only SELECT policy on `campfires` meant a
camp member could not discover the bonfire row to self-join it. Fixed: CHECK
now includes `'bonfire'`; new SELECT policy `Camp members can read camp
campfires` (`camp_id IS NOT NULL AND is_camp_member(...)` — row visibility
only; messages/logs/reactions stay participant-gated); backfilled the missing
bonfire + participants for the existing camp. **Verified:** 10-case
impersonated test in a rolled-back transaction — full CreateCamp flow,
non-member cannot see a camp's bonfire, CampView join → discover → self-enroll
chain works, DM self-insert and ember self-join still blocked (42501), bogus
campfire_type rejected (23514). Note: camp members can now also read (and
self-join) camp sub-bonfires — acceptable within the camp trust boundary since
sub-bonfires are splits of the camp chat, and message visibility remains
participant-gated.

### 2026-08-13 — Join-approval + rating-integrity RLS hardening
**Migration:** `supabase/migrations/20260813220000_rls_join_and_rating_hardening.sql`
(applied directly via `query_database` — NOT in Lovable's ledger). Fixes three
database-schema-review findings:

- **(Critical) camp_members self-join.** INSERT allowed `user_id = auth.uid()`
  unconditionally → anyone could join closed/invite-only camps and read
  member-only posts/lodge/newsletters. Now: self-join only into open+active
  camps (or with an accepted `camp_join_requests` row / a `camp_invites` row
  naming the user, via new definer fn `can_self_join_camp`), never as
  `firekeeper`; camp creators bootstrap their own membership; firekeepers/
  trailblazers add others but cannot mint new firekeepers (ownership transfer
  stays UPDATE-only).
- **(Critical) campfire_participants self-join.** INSERT allowed self-insert
  into ANY campfire → full read of private DM/group history. Now: the
  campfire's firekeeper adds participants (creation flow), and self-join is
  only allowed into active camp-linked campfires where the user is a camp
  member (new definer fn `can_self_join_campfire`).
- **(Warning) design_ratings without purchase.** INSERT/UPDATE now require a
  matching `design_purchases` row for that buyer+design (free purchases are
  recorded rows, so free designs stay ratable); policies moved from
  `public` to `authenticated`; UPDATE got a real `WITH CHECK`.

**Verified in production:** policy/function state via `pg_policies`/`pg_proc`,
plus a 9-case impersonated exploit test in a rolled-back transaction — ember
self-join, firekeeper role grab, DM self-insert, and no-purchase rating all
blocked (42501); open-camp join, camp-bonfire join, invited ember join,
creator bootstrap, firekeeper-adds-participant, and verified-buyer rating all
succeed. Zero test rows persisted. No client code changes needed — all
existing flows were already within the tightened policies.

### 2026-08-13 — P1 pre-beta security pass (branch `claude/platform-review-auth-seo-vytbcj`)
Four migrations applied via `query_database` (not in Lovable's ledger); full
writeup in `docs/pre-beta-review-2026-08.md`. `profiles` UPDATE revoked +
column-scoped (killed self-serve Pines+, age-gate bypass, consent escape, free
paid designs, seedling escape); `set_age_verification` definer RPC;
`apply_cabin_design` RPC + free-only `design_purchases` INSERT;
`join_waitlist` per-IP throttle (service-role-only, fronted by `join-waitlist`
edge fn); `age_gate_audit_log` anon INSERT dropped for `record_age_gate_event`
RPC. Edge: pine-pet cost abuse closed, `validate-invite` stops leaking
ip_hash, `handle-parental-consent` auth + atomic claim, all 36 functions in
`config.toml`. ⚠️ Frontend/edge deploy coordination required — see the review
doc.

### 2026-08-13 — Signed-out lockdown
`robots.txt` hard-block (all but `/`, `/privacy`, `/terms`), `noindex` meta,
`AppLayout` gate covers the auth-loading window.

### 2026-08-10/11 — Waitlist
`waitlist_signups` RLS admin-only; writes only via `join_waitlist` definer RPC
(normalize/dedupe, no membership probing, 500/hr cap). Founder-only admin via
`is_waitlist_admin()` (migrations `20260810230000`, `20260811000000`, applied
via `query_database`, not in Lovable's ledger). Verified by role
impersonation.

### 2026-08-10 — Cabin system authority split
All ownable cabin state moves only through `cabin_*` SECURITY DEFINER RPCs
re-checking blocks/privacy/rate limits (migration `20260810210000`, applied
via `query_database`, not in Lovable's ledger). 17 tables RLS'd, 19 definer
functions, functional pass in rolled-back transaction.

### 2026-08-09/10 — Trust system + scanner findings (PRs #2, #4, #5, #7)
Signup gated inside `handle_new_user()` (invalid invite aborts in the auth
transaction); email-bound single-use Trail Passes; all 6 pre-publish scanner
findings fixed, zero accepted (`invites.secret_token` owner-only +
`get_invite_landing()` RPC; `post_media`/`reactions` → `can_see_post()`;
`profiles` PII authenticated-only; `voice-messages` bucket participant-scoped;
`realtime.messages` topic-scoped). Edge-function auth for the six open
functions; cron functions fail-closed on `CRON_SECRET`. Logged-out Gate on
all non-public routes.

---

## Known accepted risks / open items

- **CORS is `*` on edge functions** — implementation ready in the pre-beta
  review doc; needs real origins at deploy.
- **`post-media` bucket is PRIVATE with signed URLs** (as of 2026-08-13).
  Authenticated-read finding on the bucket was accepted deliberately: paths
  are random UUIDs, per-post storage policy judged fragile. Do not re-open.
- **No password-reset flow yet** — add early in beta.
- **Invite-link (`invite_link`) camp invites have no RLS acceptance path** —
  only invites naming an `invited_user_id` can be self-accepted. A link-based
  accept needs a definer RPC that validates + decrements `uses_remaining`; do
  NOT loosen the INSERT policy for it.
- `uses_remaining` on user-named camp invites is not decremented on join
  (UNIQUE membership makes re-use harmless for the named user).
