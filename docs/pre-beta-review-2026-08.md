# Pre-beta platform review — August 2026

A full-platform review (functions + security) ahead of the weekend beta, plus
the signed-out lockdown / search de-indexing Kevin asked for. This doc records
what shipped, what a human still has to do, and everything found but not fixed
this pass so nothing is lost.

---

## ⚠️ CRITICAL: deploy coordination (read first)

**The three security migrations are already applied and verified on production**
(via `query_database`, so like the cabin/waitlist migrations they are NOT in
Lovable's ledger — the repo `.sql` files are the source of truth). The DB now
refuses direct client writes to the age, billing, and design columns.

**The frontend + edge-function changes on branch
`claude/platform-review-auth-seo-vytbcj` are NOT deployed yet.** Until they are,
the *currently-deployed* site is mid-cutover and three flows are degraded,
because the live frontend still does the old insecure direct writes the DB now
blocks:

| Flow | Live state until deploy | Why |
|---|---|---|
| **New-user onboarding** (age step) | **Broken** — signup can't write age columns | old client `profiles.update({is_age_verified,…})` now revoked; new client uses `set_age_verification` RPC |
| **Waitlist signup** (landing CTA) | **Broken** — `join_waitlist` revoked from anon | new client calls the `join-waitlist` edge function; old client called the RPC directly |
| **Apply a Cabin design** | **Broken** — `applied_design_id` now revoked | new client uses `apply_cabin_design` RPC |
| Age-gate audit log write | Degrades silently (wrapped in try/catch) | anon insert policy dropped; new client uses `record_age_gate_event` RPC |

This window is **inherent** to the fix — you cannot both block the client from
writing these columns and let the old client keep writing them. The resolution
is a coordinated deploy: **publish this branch and deploy the edge functions
now.** Nothing here is a rollback candidate; the fix is correct, it just has to
land on the client too.

**To close the window:**
1. Merge/publish branch `claude/platform-review-auth-seo-vytbcj` so the new
   frontend goes live (Lovable sync + `deploy_project`).
2. Deploy the new/changed edge functions: `join-waitlist` (new),
   `generate-pine-pet`, `regenerate-pine-pet-atmosphere`, `validate-invite`,
   `handle-parental-consent`, and the updated `supabase/config.toml`.
3. Smoke-test signed-in: complete an onboarding, join the waitlist, apply a
   design. (Sandbox can't reach Supabase, so this eyeball is yours.)

---

## What shipped this pass

### 1. Signed-out lockdown + search de-indexing (the explicit ask)

- **`public/robots.txt`** rewritten to a single hard-block group: `Disallow: /`
  with `Allow:` only for `/`, `/privacy`, `/terms`. Removed the per-bot
  Twitterbot/facebookexternalhit groups (a bare `Allow:` group overrides the
  wildcard) and closed the gaps where `/join/` (renders an invitee's email) and
  member routes were crawlable.
- **`index.html`** now carries `<meta name="robots" content="noindex, nofollow">`
  (+ `googlebot`). It's a single-page app with one static `<head>`, so this
  de-indexes every route — member profiles, cabins, posts, the app shell —
  matching the invite-only posture. **Verify live:** fetch
  `https://underpines.com/robots.txt` after deploy and confirm it matches the
  committed file (Lovable's SEO panel can serve its own robots.txt / inject its
  own meta and would override the repo). If the panel is populated, mirror the
  hard-block there too.
- **`AppLayout.tsx` gate ordering** fixed: the invite gate now also covers the
  `authLoading` window. Previously a logged-out deep-link to `/:handle` mounted
  the profile page and fired a pre-auth `profiles` query before the gate
  decided; now it holds on a loader, so "inaccessible when signed out" is true
  from first paint, not just after auth resolves. (RLS already returned nothing
  to anon, so this was a latent issue, not a live leak — but it's closed now.)

### 2. Security — P1 fixes, applied to production and verified

All four migrations live and independently verified (`pg_policies`,
`pg_proc.prosecdef/proconfig`, a live impersonated exploit test).

- **`profiles` UPDATE lockdown** (`20260813120000`). Revoked table-wide UPDATE
  from `authenticated`, re-granted column by column to everything except the
  server-owned set (`is_pines_plus`, `is_age_verified`, `age_bracket`,
  `birth_year`, `account_status`, `applied_design_id`, `seedling_ends_at`,
  location PII, timestamps). **Verified live:** an impersonated member's
  `UPDATE … SET is_pines_plus=true` is denied; `UPDATE … SET bio=…` still works.
  This was the single highest-value fix — it was a free paid tier, an age-gate
  bypass, and a parental-consent escape in one policy.
- **Age verification moved server-side** — `set_age_verification(birth_year,
  bracket)` definer RPC decides the bracket and `account_status` from birth
  year, hard-blocks anyone who can't be 13, and forces parental-consent for
  anyone who can't be 18. **Verified:** a client claiming `13_to_17` for an
  11-year-old is now rejected `under_13` by the server. The client can no longer
  self-activate past parental consent.
- **Cabin-design paywall** — `design_purchases` INSERT was
  `WITH CHECK (buyer_id = auth.uid())` with no price check, so a member could
  insert a `$0` purchase row for any paid design and own it free. Now restricted
  to `is_free` designs (paid purchases still flow through `stripe-webhook` on
  the service role). `applied_design_id` is set only through the ownership-
  checking `apply_cabin_design` RPC.
- **Waitlist per-IP throttle** (`20260813120100`) — `join_waitlist` gained a
  server-derived `ip_hash` (per-IP cap of 5/hour) and is now callable only by
  `service_role`, forcing signups through the new `join-waitlist` edge function
  that derives the IP. One flooder can no longer burn the global hourly budget
  and lock out real launch-day visitors.
- **`age_gate_audit_log`** (`20260813120200`) — dropped the
  `TO anon WITH CHECK (true)` INSERT (the only open-write policy in the schema);
  writes now go through the enum-validated `record_age_gate_event` RPC, so the
  COPPA trail can't be poisoned with arbitrary columns.

### 3. Security — edge-function + config fixes (code; deploy required)

- **Pine-pet cost abuse closed.** `regenerate-pine-pet-atmosphere` had no Pines+
  gate and no rate limit on its paid Claude+Gemini path — unbounded spend.
  Added the same `is_pines_plus` check + 3/day budget as generation, and it now
  records each generation. Also fixed `generate-pine-pet`, which checked a
  nonexistent `subscriptions` table (failing closed — no Pines+ member could
  ever generate); it now checks `profiles.is_pines_plus`.
- **`validate-invite`** no longer returns the `ip_hash` to the client, and the
  signup flow no longer round-trips `invite_ip_hash` through metadata. The
  meaningful per-invite caps (5/hr, 20/day) are unaffected and enforced
  server-side; the forgeable per-IP sub-limit on infinite invites is no longer
  fed by a client-controlled value. (Full server-side IP derivation at signup
  is a follow-up — see below.)
- **`handle-parental-consent`** — added to `config.toml` with `verify_jwt=false`
  (it authenticates a single-use token from an email link, not a JWT — it was
  absent from config, so the platform default of `true` would 401 the parent's
  click). Its two status UPDATEs now atomically claim the pending row
  (`.eq('status','pending')`), so a double-click / approve-vs-decline race can't
  flip the account twice.
- **`config.toml` now declares all 36 functions** with explicit `verify_jwt`, so
  the security-critical config is in version control and can't drift silently in
  the dashboard. (Was 16 of 34 — neither Stripe webhook was declared.)

### 4. Client bugs — the data-loss ones testers would hit this weekend

- **Posts now appear after posting.** The mobile/desktop composer sheet used a
  dead `ComposerStub` reference and never invalidated the feed query, so a
  posted Spark could be missing for up to 5 minutes. Composers now commit
  first, then signal, and the parent invalidates `['feed', uid]`. My Page's wall
  (which invalidated a query key that doesn't exist) now refreshes via a bump
  key on `CabinPostHistory`.
- **Messages no longer vanish on failure.** `CampfireView.sendMessage` didn't
  check the insert error — with the trust system's rate-limit/duplicate
  triggers that raise, a fast or repeated message just disappeared. It now
  restores the text and toasts.
- **Spark/bulletin text preserved on failure.** `SparkComposer` cleared the
  textarea before the insert; now it clears only after a confirmed commit.
- **Root `ErrorBoundary`** wraps the whole routed tree in `App.tsx`. Onboarding,
  login, `/grove/*`, the boot gates, and post-deploy stale-chunk 404s were
  white screens (the only boundary wrapped signed-in nav routes); they now show
  the fallback.
- **`.eyebrow` route-stylesheet trap** (third occurrence of this documented bug
  class) — moved from `onboarding.css` to `handoff-shell.css` so the feed's date
  line isn't unstyled on a fresh load.
- **`.env`** added to `.gitignore` (contents are the public anon key, so no live
  exposure — this just stops the next secret landing in history).

**Verification:** `tsc` clean, edited files lint-clean (the 2 documented
`CampfireView` baseline errors untouched), 85 vitest pass, `vite build` clean,
entry **192.1 kB** gzip (budget ~195), robots.txt + noindex confirmed in
`dist/`. Migrations verified against production rows. Edge functions verified by
reading (no Deno locally; they're validated on Lovable deploy). Signed-in
eyeball is Kevin's — the sandbox can't reach Supabase.

---

## Found but NOT fixed — recommended follow-ups

### Security (P2)

- **CORS is `*` on every function.** Not a hard boundary (bearer tokens, not
  cookies), but worth pinning to your own origins. Deliberately deferred: I
  can't verify the production + Lovable-preview origins from the sandbox, and a
  wrong allowlist would break the logged-out landing's function calls right
  before beta. **Ready implementation:** change `_shared/cors.ts` to reflect the
  request `Origin` against an allowlist:
  ```ts
  const ALLOWED = new Set([
    "https://underpines.com", "https://www.underpines.com",
    // + the Lovable preview origin(s)
  ]);
  export function corsHeaders(req: Request) {
    const origin = req.headers.get("Origin") ?? "";
    return {
      "Access-Control-Allow-Origin": ALLOWED.has(origin) ? origin : "https://underpines.com",
      "Vary": "Origin",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };
  }
  ```
  Then replace the inlined `corsHeaders` objects across the 34 functions. Do it
  as its own pass with the real origins confirmed.
- **`design_purchases` counter / creator stats.** The old client bumped
  `cabin_designs.purchases` from the buyer, which the creator-only UPDATE policy
  silently rejected — so the counter was already not incrementing. If you want
  accurate purchase counts, maintain them in a definer RPC or the Stripe webhook.
- **Full server-side IP at signup.** The invite per-IP sub-limit is only as good
  as the recorded hash. To make it real, route signup through an edge function
  (or a definer) that derives the IP server-side, instead of `supabase.auth.
  signUp` directly. Bounded issue today (infinite/founder invites only, capped
  at 20/day by the per-invite limits), so low urgency.
- **`get_trail_pass_status` returns the invitee's email to anon.** Architecturally
  necessary for the `/join` landing, but consider returning only validity +
  inviter name and confirming the email in the form instead of pre-filling it.
  Now that `/join/` is robots-blocked and noindexed, the search-exposure half is
  closed; this is about the link itself being forwarded.
- **`spotify-search`** is authenticated but unmetered per user — add a simple
  per-user rate limit so one member can't exhaust the app-wide Spotify quota.
- **`post-media` bucket is still `public=true`.** Direct storage URLs serve with
  no session, bypassing the new `can_read_post_media()` RLS (public buckets are
  served from an unauthenticated CDN path). The signed-URL client is on `main`
  but unpublished. **Left for Kevin** per the standing open item — the cutover
  needs a signed-in eyeball first, and flipping the bucket private without the
  signing client live causes an image outage. Do it as its own coordinated pass.
- **Declined-minor accounts.** `handle-parental-consent` sets
  `profiles.account_status='suspended'` on decline, but suspensions are enforced
  via the separate `suspensions` table / `get_boot_state`, not that column — so
  a declined minor may not actually be locked out. Confirm the enforcement path.
- **Duplicate migrations** (`20260809222455`≈`20260810120000`;
  `20260809221640`≈`20260810090100`) make the true schema state hard to read.
  Consider a squashed snapshot before launch.

### Client bugs (non-blocking, ranked)

- **Feed post-card actions are inert.** `HandoffPostCard`'s Reply/React/Share
  all call the same `onOpen`; on the home feed that's just a refetch, and on My
  Page's Likes tab `onOpen` is omitted so they do nothing. **There is currently
  no way to react to a post from the home feed** — `ReactionBar` is only
  reachable via `PostCard` on PostDetail/Search. Wire `onOpen` to
  `navigate('/post/:id')`, or add a real reaction affordance.
- **`CampfireView` realtime channel churn** — the `postgres_changes`
  subscription lists `autoScroll` in its deps, so scrolling tears down and
  rebuilds the channel and can drop messages in the gap. Make `autoScroll` a ref.
- **Feed swallows read errors** — `useFeedPosts` reads every sub-query as
  `data || []`, so a failed `posts` read shows the "It's quiet in here" empty
  state. Surface `isError` via `ErrorPanel` on Feed / MyPage / PostDetail.
- **`MyPage` shows a network blip as "Nobody here goes by that name"** — the
  profile query throws on error and the 404 branch catches everything.
- **Signed-media re-sign skipped on cache hit** (`signedMedia.ts`) — a component
  mounting on a cached URL never schedules the re-sign; images can 400 mid-session
  on a long-lived tab. (Relevant when the `post-media` cutover happens.)
- **Non-friend profiles read "Nothing posted yet."** `MyPage` passes `isInCircle`
  hardcoded true, so `CabinPostHistory`'s gated-preview branch is dead code and
  RLS just returns zero rows to non-friends. Not a leak; on a small network it's
  what most profile visits look like. Consider a friendlier "add them to see
  their posts" state.
- Dead code: `ComposerStub.tsx`, `useOfflineQueue.ts` (the latter would
  double-post if ever wired). `ReactionBar`'s change is a non-atomic
  delete-then-insert.
- `get_boot_state` returns `NULL` for a null `auth.uid()`, which
  `useBootState` maps to a *success* with `profile:null` — a session whose JWT
  no longer resolves renders the signed-in shell with every gate skipped. Narrow
  but worth a guard.

### Missing feature — worth adding early in beta

- **No password-reset flow anywhere.** No `resetPasswordForEmail`, no "Forgot
  password?" on `Login.tsx`. A tester who mistypes their password at signup is
  locked out with no self-serve path. High-priority for a beta with real users.

### Testing / CI

- Tests cover only pure functions (85 pass). No hook/component/RLS coverage;
  `@testing-library/react` is installed but unused. The most load-bearing logic
  — `useBootState` mapping and the `AppLayout` gate ladder — has none.
- No CI, no `typecheck` script, `tsconfig` is `strict:false`. The four-command
  verification bar is manual. The Chromium route sweep lives in a session
  scratchpad, not the repo, so the next session can't re-run it.

---

## What is correctly built (don't "fix" these)

`handle_new_user()` (invite validation inside the signup transaction, with row
locks and email binding), all ranger RPCs (server-side role re-checks + audit),
Stripe webhook signature verification, the SSRF guard in `_shared/net.ts`,
`requireCronSecret` (fail-closed), `internal_secrets` (deny-all), and the
`waitlistAdmin` founder gate. 102/102 tables have RLS; every definer function
sets `search_path`.
