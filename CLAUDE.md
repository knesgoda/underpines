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

---

## Current handoff

_Update this section as work lands. Keep it short: what shipped, what's open,
what the next session should know._

**As of 2026-08-10 — Phases 1–5 complete and merged to `main`.**

Shipped (PRs #1 and #6):
- Boot performance: 456 kB → 195 kB entry gzip; boot collapsed from 9 requests
  to 1 via `get_boot_state()`.
- The full nostalgia UI port across every screen, with the vocabulary rename.
- Phase 5 Listening: working now via manual track sharing; Spotify live path is
  scaffolded but dormant (see below).
- All Phase 2/3/4/5 migrations applied and independently verified.

**Open, and owned by a human:**
1. **6 security findings block publish in Lovable.** A dedicated session is
   handling these. One is `profiles_public_pii_exposure` (`anon` reading
   `profiles` via a permissive policy). Note: `get_boot_state` deliberately does
   NOT depend on that policy, so tightening `anon`'s `profiles` access will not
   break the boot — but re-verify the definer path after any `profiles` policy
   change. Some hardening already landed on `main` (PR #5, migration
   `20260810120000_security_findings_rls_hardening.sql`); confirm which findings
   remain before acting.
2. **Spotify review clock is not started.** Live Listening is gated on it.
   `docs/spotify-integration.md` has the application wording and the three
   integration points (OAuth callback, poll worker, one client edit). Nothing
   here is buildable until an app is approved; don't scaffold against it blind.

**Not started / possible next work:** none queued. The product roadmap
(README "What's Built") is Phases 1–4; there is no Phase 6 defined.
