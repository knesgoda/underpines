# Under Pines — agent handoff

**Every session reads this file first. Update the "Current handoff" section at the
bottom before you finish, so the next session starts where you left off.** The
rest is durable context that rarely changes.

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

---

## Current handoff

_Update this section as work lands. Keep it short: what shipped, what's open,
what the next session should know._

**As of 2026-08-10 — two parallel workstreams merged to `main`.**

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

**Verification at last handoff:** `tsc` clean, 64 vitest tests pass, `vite
build` clean on `main` (commit `5851190`). No GitHub Actions CI exists; Lovable's
scan + preview is the pipeline. Original 6 findings cleared; production live at
www.underpines.com with the gate and trust system.
