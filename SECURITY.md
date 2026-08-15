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

### 2026-08-15 — Pines+ / Stripe removal (attack-surface reduction; edge deletions PENDING)
**Branch `claude/remove-pines-stripe-2f20pq`. No migration, no RLS change.**
Kevin retired the Pines+ subscription and all Stripe payments. Security-
relevant consequences:

- **11 edge functions removed from repo + `config.toml`** (the whole payment
  surface): `check-subscription`, `create-checkout-session`,
  `create-collection-checkout`, `create-collection-price`,
  `create-connect-account`, `create-connect-login-link`,
  `create-design-checkout`, `create-portal-session`,
  `process-monthly-payouts`, `stripe-connect-webhook`, `stripe-webhook`.
  ⚠️ **They stay deployed and callable until Lovable deletes them from the
  Supabase deployment** — do that with the publish. The 2026-08-14 deep-scan
  fixes to `create-checkout-session`/`stripe-webhook` (price allow-list,
  strict price→plan) are mooted by deletion; `send-trail-pass` +
  `triage-report` from that batch still need their deploy.
- **Pine-pet cost gating changed, not dropped:** `generate-pine-pet` and
  `regenerate-pine-pet-atmosphere` no longer require `is_pines_plus`, but the
  shared **3/day `pine_pet_generations` budget remains the sole spend cap on
  the paid Claude/Gemini calls** (the "rate-limit anything that costs money"
  rule). Do not remove that budget; both functions need redeploy.
- **`campfire-lifecycle` no longer destroys content:** the 6-month
  fade-to-null of non-Pines+ messages and its warning notifications are
  gone (they existed only as the free-tier limit). Needs redeploy, along
  with `send-annual-wrapped` (now all members) and
  `send-grove-weekly-report` (Pines+ stat removed).
- **Stripe secrets become dead** (`STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`,
  `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_ANNUAL_PRICE_ID`) — delete from
  function secrets once the functions are gone. pg_cron job #5
  (process-monthly-payouts, never armed — CRON_SECRET was never set) should
  be unscheduled.
- **DB untouched by design:** the Stripe/Pines+ tables and
  `profiles.is_pines_plus` remain with their existing RLS (already tightened
  2026-08-13/14: prices authenticated-scoped, ratings purchase-verified,
  `is_pines_plus` not self-writable). Nothing reads/writes them from the app;
  dropping them is optional future cleanup, not a hole.

**Verified:** tsc/eslint(changed)/187 vitest/build clean, signed-out Chromium
sweep green both themes. Nothing here loosens a policy; every change removes
surface or removes a paywall in front of an already-rate-limited path.

### 2026-08-14 — Personal link limits: 7-day expiry + 10-join cap — APPLIED & VERIFIED
**Migration:** `supabase/migrations/20260815110000_personal_link_limits.sql`
(applied via `query_database` — NOT in Lovable's ledger; repo file is source
of truth). Kevin's tightening of the same-day personal-links feature: each
link is now good for **7 days** and at most **10 joins** (both tunable via
`security_config`: `personal_link_expiry_days` / `personal_link_max_uses`),
on top of the unchanged per-join allowance spend. Email Trail Passes
untouched.

- New nullable `invites.expires_at` (only personal rows set it; legacy/root
  rows keep NULL = no expiry). The join cap reuses `uses_remaining` (personal
  rows previously bypassed it at 0/0); rows stay `is_infinite = true` so
  `validate-invite`'s per-IP rate limiting keeps applying.
- Enforced in BOTH places: `get_invite_landing` (expired/exhausted → plain
  invalid; `'resting'` stays reserved for frozen/out-of-passes) and the
  `handle_new_user` personal branch (checks before the allowance spend;
  decrements `uses_remaining` under the existing FOR UPDATE row lock with the
  legacy branch's atomic `is_active = (uses_remaining - 1) > 0` pattern — the
  final join self-retires the row).
- **Auto-renew:** `get_my_invite_link` lazily retires an expired/exhausted
  row and mints a fresh one (the self-deactivation frees the
  one-active-per-member partial unique index slot). Payload now returns
  `expires_at` + `uses_remaining` for the panel. This file supersedes
  20260815100000 as the newest source of `handle_new_user`,
  `get_invite_landing` and `get_my_invite_link`.
- **Review fix (same day, applied):** the landing's owner-side gate also
  checks `invite_eligible_at` — every owner condition the signup gate
  enforces is now mirrored at the landing, so a valid landing can never
  dead-end in a `signup_invalid_invitation` exception mid-funnel.

**Verified in production:** state checks (column present, live
`handle_new_user` contains the expiry + uses checks, `get_my_invite_link`
carries the 7/10 defaults, landing checks the cap), then the extended
23-assertion impersonated exploit test in a rolled-back transaction — new-link
budget is a week/ten, a signup spends one pass AND one join (10→9), expired
link lands invalid + rejects signup, auto-renew mints a fresh slug while the
old row stays retired, the final join retires the link and the retired id
rejects the eleventh, plus the full regression set (anon EXECUTE blocked,
resting at zero passes, rotation revokes old id, trail-pass email binding
both directions, `get_boot_state()` answers). All ok, zero FAIL, zero rows
persisted. **Deploy:** additive and harmless to the current client; ships in
the same pending Lovable publish as the rest of the branch.

### 2026-08-14 — Personal multi-use invite links — APPLIED & VERIFIED
**Migration:** `supabase/migrations/20260815100000_personal_invite_links.sql`
(applied via `query_database` — NOT in Lovable's ledger; repo file is source
of truth). New feature with a deliberate authority design: each member gets
one reusable `/invite/<slug>` link, and **every signup through it spends one
pass from the owner's `invite_allowances`**, so a leaked link is bounded by
the balance, regenerates only through healthy maturation, and the existing
ranger freeze (`invites_frozen_at`) kills it instantly — checked at both the
anon landing and inside the signup transaction.

- Rides the legacy `invites` pipeline (new `spends_allowance` flag +
  one-active-per-member partial unique index) rather than a new table, so the
  owner-only SELECT RLS, `validate-invite`'s per-invite/per-IP rate limiting
  (personal rows are `is_infinite`), and the `handle_new_user` row-locked
  redemption path all apply unchanged. `uses_remaining` is bypassed; the
  allowance is the only counter, decremented under `FOR UPDATE` inside the
  auth transaction.
- **Re-emitted from live prod bodies** (`pg_get_functiondef`, not repo
  copies): `handle_new_user` (new `spends_allowance` branch; legacy +
  trail-pass branches verbatim; personal links get their own
  `PERSONAL_LINKS_ENABLED` kill switch, default on, and are NOT subject to
  `LEGACY_LINK_REDEMPTION_ENABLED` draining), `accept_invite_create_circle`
  (lineage `source_kind` CASE gains `'personal_link'`; CHECK widened), and
  `rotate_invite_link` (admin rotation now excludes `spends_allowance` rows —
  without that it renames both of the founder's infinite rows to one slug and
  dies on the UNIQUE constraint, the 2026-08-13 bug class).
- New definer RPCs `get_my_invite_link()` (lazy get-or-create; eligibility
  mirrors `create_trail_pass`: blocked/moderated/low-trust/frozen/ineligible
  members get no link) and `rotate_my_invite_link()` —
  **deactivate-and-recreate, never a slug rename**: `get_invite_landing`
  hands the row's `invite_id` to any visitor and signup validates by that id,
  so renaming would leave a captured id redeemable forever. EXECUTE revoked
  from PUBLIC/anon on both. `get_invite_landing` gains a `'resting'` branch
  (owner frozen or out of passes) that leaks nothing beyond what the link
  holder already knows.
- Known accepted gap: personal-link signups bypass the trail-pass
  EMAIL_DOMAIN_VELOCITY risk signal (no trail_passes row); the
  `evaluate-signup-risk` LIKE query is unaffected. Candidate follow-up: a
  low-severity signal on `user_lineage.source_kind='personal_link'` velocity.

**Verified in production:** independent state checks (column, partial index,
5-value CHECK, prosecdef + `search_path` + anon EXECUTE false on both new
fns, live `handle_new_user` contains the allowance branch, admin rotation
contains the exclusion), then a 24-assertion impersonated exploit test
(`docs/personal-link-exploit-test.sql`) in a rolled-back transaction — mint +
idempotent re-get, anon RPC EXECUTE blocked (42501), arbitrary-email signup
spends exactly one pass with lineage/circles/invite_uses/notification, zero
passes → landing rests + signup rejected, frozen → both rejected, attacker
cannot read or deactivate the owner's link, rotation kills old slug AND old
id while a fresh one works, trail-pass email binding regression-unchanged
both directions, founder's admin rotation leaves the personal link alone,
`get_boot_state()` answers. All ok, zero FAIL, zero rows persisted
(personal_links/profiles/users/passes all 0 after rollback).
**Deploy coordination:** migration is live and harmless to the old client
(nothing calls the new RPCs; `spends_allowance` defaults false everywhere).
The new /invites panel requires this migration — publish the frontend AFTER
(it is already applied, so publish is safe now). No edge deploys needed:
`validate-invite` passes personal rows through its existing infinite-link
path.

### 2026-08-14 — Deep-scan batch: notification send paths, Pines+ price allow-list, email escaping, triage injection, rating privacy — APPLIED & VERIFIED (edge deploys pending)
**Migration:** `supabase/migrations/20260814080000_notification_send_paths_and_rating_privacy.sql`
(applied via `query_database` — NOT in Lovable's ledger; repo file is source of
truth). Five real findings from the 2026-08-14 Lovable deep scan (two others —
`rotate_invite_link` and pine-pet paths — were stale: verified already fixed
in prod before triage).

Database (live now):

- **(Warning) notifications INSERT let any member target any recipient.**
  The `smoke_signal`/`camp_newsletter` self-send branch had no recipient
  constraint — a spam vector that also bypassed `notify_user()`'s block
  re-check, preferences and dedupe. Both flows moved server-side: the
  /invites nudge is now `send_smoke_signal(_recipient)` (SECURITY DEFINER,
  requires a `user_lineage` row proving the caller invited the recipient,
  routes through `notify_user`; EXECUTE revoked from anon), and the
  newsletter fan-out is an AFTER trigger on `camp_newsletters` firing on the
  →'sent' transition (the newsletter INSERT policy already requires author +
  firekeeper/trailblazer, so the trigger inherits an authorized write).
  Direct INSERT keeps only the admin-notice branch (NULL actor + is_admin —
  GroveDesigns). Client: `Invites.tsx` calls the RPC;
  `CampNewsletterComposer.tsx` fan-out deleted; a vitest pins the set of
  client insert sites and the policy shape.
- **(Warning) design_ratings SELECT was `USING (true)`** — every member could
  read `buyer_id` → who bought which cabin design. No client code reads the
  table at all, so reads scoped to buyer-own-rows + design creator (via new
  `created_design()` definer helper per the policy-subquery rule). UI loss:
  none.

Edge functions (**need deploy** — DB changes above are independent):

- **(Warning) `create-checkout-session` accepted any Stripe priceId** while
  the webhook granted `is_pines_plus` for ANY completed subscription,
  defaulting unknown prices to a full "annual" plan — e.g. a $1-collection
  price could buy Pines+. Checkout now resolves a client-sent `plan`
  (`monthly`/`annual`) against `STRIPE_MONTHLY_PRICE_ID`/
  `STRIPE_ANNUAL_PRICE_ID` server-side (legacy raw priceId accepted only if
  it equals one of the two; 503 fail-closed if unset), and `stripe-webhook`
  maps price→plan strictly, granting nothing on an unknown price.
- **(Warning) `send-trail-pass` HTML injection**: inviter `display_name` and
  `invitee_name` now escaped in the email HTML (personal_message already
  was); subject stays raw (plain text, not HTML).
- **(Warning) `triage-report` prompt injection**: reported content +
  reporter context are fenced as untrusted data with an explicit
  ignore-embedded-instructions clause (attempted manipulation = escalation
  signal), and the AI can no longer close a report — `clear` stays
  `pending_review` for a Ranger; only escalation (auto-hide) is applied
  automatically. AI free-text is escaped before landing in the critical
  alert email.

**Verified in production:** `pg_proc`/`pg_policy`/`pg_trigger` state checked
independently (definer + search_path on both new fns, anon EXECUTE false,
trigger present, INSERT policy exactly the admin branch, two scoped SELECT
policies on design_ratings), then the 12-case impersonated exploit test
(`docs/notification-send-paths-exploit-test.sql`) in a rolled-back
transaction — all 12 ok, zero rows persisted. (First run had a harness bug in
case 3: the "stranger" pair chosen from prod was the founder + a real
invitee, and the count ran under the attacker's RLS; corrected in the checked
-in test. Not a prod hole.) `get_boot_state()` confirmed answering.
**Deploy coordination:** migration is live and safe against the old client
(the nudge shows its normal error toast until publish; newsletter sends fine
— the trigger writes what the dropped client fan-out no longer can). Publish
the frontend + deploy `create-checkout-session`, `stripe-webhook`,
`send-trail-pass`, `triage-report` promptly.

### 2026-08-14 — Notification system overhaul (server-side producers, RLS tightening) — APPLIED & VERIFIED
**Migration:** `supabase/migrations/20260815000000_notification_system_overhaul.sql`
(PR #23). **Applied to prod 2026-08-14 via Lovable** (the building sandbox was
denied DDL, so Kevin ran it through Lovable's agent; Lovable re-recorded it in
its ledger as `20260814060500_6eb130d5-…​.sql` — same SQL — and regenerated
`src/integrations/supabase/types.ts`). **Verified twice:** Lovable ran
`docs/notifications-exploit-test.sql` — all 12 cases green (21 ok-notices,
zero FAIL), rolled back cleanly with `exploit_test_complete_rollback` — plus
an independent read-only pass from the Claude session against `pg_policies` /
`pg_proc` / `pg_trigger` / `aclexplode`: 4 policies (UPDATE has WITH CHECK),
both new indexes, 10 triggers, `notify_user` prosecdef + not executable by
authenticated, zero reaction duplicates, 25/11 constraint vocabularies,
`is_read` the sole UPDATE-grantable column, `get_boot_state()` re-emitted
without the reaction_batch exclusion and answering with a full payload,
`handle_new_user` carrying the notify call. Frontend publish + edge deploy
(`send-daily-ember`) were still pending at entry time — see the runbook.

What it changes, security-wise:

- **Notification production moves server-side.** New `notify_user()`
  SECURITY DEFINER helper (blocks re-check, per-type preference enforcement,
  10-minute dedupe, exception-swallowing) + 10 AFTER triggers on
  `replies`/`reactions`/`circles`/`posts`/`camp_members`/`camp_join_requests`,
  plus one added notify call in the LIVE bodies of `handle_new_user()`,
  `redeem_trail_pass()` and `accept_invite_create_circle()` (re-emitted from
  `pg_get_functiondef` output, not repo copies). EXECUTE revoked from
  anon/authenticated on all new functions — clients cannot spoof through them.
- **INSERT policy narrowed** from "any type as yourself" to
  `smoke_signal`/`camp_newsletter` as yourself, or NULL-actor as admin
  (GroveDesigns). Everything else must come from triggers or service role.
- **UPDATE tightened**: real `WITH CHECK (recipient_id = auth.uid())` plus a
  column-scoped grant — authenticated can UPDATE only `is_read` (the
  `profiles` precedent). Previously a recipient could rewrite any column of
  their own rows.
- **DELETE policy added** (recipient-only) — enables per-item dismiss and
  Clear all.
- **Stale CHECK constraints fixed**: `notification_type` gains the six types
  live code already writes (incl. ranger `system` notices, which were ERRORING
  inside moderation RPCs) plus four camp types; `reactions.reaction_type`
  gains `relatable`/`eyeroll`/`moonstruck`, which the client offers but the
  constraint silently rejected.
- **Reaction aggregation**: partial unique index
  `(recipient_id, post_id) WHERE notification_type='reaction_batch'`, counts
  recomputed from the reactions table in the trigger (never incremented, never
  client-supplied).
- `get_boot_state()` re-emitted with one edit (reaction_batch exclusion
  removed from `unread_notifications`) — checklist item 5 must confirm it
  still answers for a normal member after apply.

Hostile-user walk: spoofed inserts blocked by the narrowed policy + revoked
EXECUTE; recipients can no longer forge row contents (column grant); deletes
are recipient-scoped; triggers derive recipient/actor entirely from the
underlying row and `auth.uid()`, never from client-supplied notification
fields. The exploit test exercises each of these plus the legit flows.

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
