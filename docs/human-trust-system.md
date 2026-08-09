# Human Trust, Trail Passes, Bot Defense & the Ranger Station

How Under Pines' invite/trust/bot-defense system is wired, what an operator
needs to configure, and what is intentionally left dormant until credentials
exist.

The theme maps to conventional internals:

| Product name  | Internals |
|---------------|-----------|
| Trail Pass    | `trail_passes` row — single-use, email-bound invitation |
| Trail System  | `user_lineage` — invitation ancestry graph |
| Closed Trail  | `invite_allowances.invites_frozen_at` set (containment, not punishment) |
| Ranger Station| `/grove/cases` (+ `/grove/trails`, `/grove/appeals`, `/grove/audit`); `/ranger` redirects there |

## Architecture in one paragraph

Signup is gated **in the database**: `handle_new_user()` (trigger on
`auth.users`) validates the Trail Pass token or legacy invite id passed in
signup metadata, enforces single-use + email binding atomically, records
lineage, and aborts account creation otherwise. Invitation issuing,
revocation, redemption, and regeneration are `SECURITY DEFINER` RPCs that
never trust the client. Risk evaluation runs server-side
(`evaluate-signup-risk` edge function + `_shared/trust-core.ts`), writes
explainable `risk_signals`, and clients only ever see a UX state. Ranger
enforcement actions are RPCs that re-verify `ranger_level()` and append to
the tamper-guarded `admin_audit_log`.

## Roles

`app_role` gained `ranger`, `senior_ranger`, `head_ranger`. Existing roles
map onto the ladder — `moderator` → level 1, `admin`/`founder` → level 3 —
via `ranger_level(uuid)`; `is_admin()` now means "level ≥ 1" so existing RLS
keeps working. Grant roles by inserting into `user_roles` (only admins can,
per its RLS).

- **Level 1 (Ranger)**: mark safe, warn, require verification, restrict,
  freeze/unfreeze invites, security lock, open cases.
- **Level 2 (Senior Ranger)**: suspend, restore, revoke outstanding passes,
  close/reopen trails (incl. descendants), review appeals.
- **Level 3 (Head Ranger)**: permanent ban, reverse permanent bans, read the
  audit log and `security_config`.

## Configuration (`security_config`)

Versioned, one active row; every risk decision stores the `policy_version`
that produced it. **Change policy by inserting a new row and flipping
`active`, never by editing** — old decisions must stay reconstructible.
Clients cannot read it (`get_security_config()` is revoked from
`anon`/`authenticated`; only definer functions and the service role can).

Feature flags inside the config: `INVITE_ONLY_SIGNUP`,
`TRAIL_PASSES_ENABLED`, `LEGACY_PERSONAL_LINKS_ENABLED` (off — new accounts
no longer get slug links), `LEGACY_LINK_REDEMPTION_ENABLED` (on during the
transition; **flip off to retire slug links entirely**), `TURNSTILE_ENABLED`,
`EMAIL_RISK_ENABLED`, `PHONE_STEP_UP_ENABLED`, `BEHAVIOR_RISK_ENABLED`,
`AUTO_TRAIL_FREEZE_ENABLED`, `COMMUNITY_BOT_REPORTS_ENABLED`,
`RANGER_STATION_ENABLED`, `TRAIL_MAP_ENABLED` — plus numeric knobs
(eligibility days, expiry, maturation window, pass maxima, risk thresholds,
rate limits, report burst windows). Defaults are seeded in
`20260809210100_trail_trust_schema.sql`.

## Environment variables (edge functions)

| Variable | Used by | Behavior when missing |
|----------|---------|----------------------|
| `RESEND_API_KEY` | `send-trail-pass` | Pass is still created; UI falls back to a copyable link |
| `APP_BASE_URL` | `send-trail-pass` | Defaults to `https://underpines.com` for emailed links |
| `TURNSTILE_SECRET_KEY` | `evaluate-signup-risk` via `_shared/turnstile.ts` | Challenge reports `configured:false`; no one is blocked. Set the key **and** flip `TURNSTILE_ENABLED` (and add the site key + widget client-side) to activate |
| SMS provider (e.g. Twilio Verify) | *not yet integrated* | `PHONE_STEP_UP_ENABLED` stays `false`. The storage (`account_verifications.phone_hmac`/`phone_encrypted`, keyed HMAC via `internal_secrets`) and the step-up decision path already exist; wire an OTP function before enabling |

Nothing pretends to work: disabled providers degrade to documented fallbacks
(spec §120/§150).

## Invitation lifecycle

1. **Issue** — `create_trail_pass(email, name?, message?)`: checks
   eligibility (account age via `invite_eligible_at`, not suspended, clean
   `moderation_state`, trust floor, not frozen), locks the allowance row,
   decrements atomically, stores only the SHA-256 `token_hash`, returns the
   raw token exactly once. `send-trail-pass` emails it.
2. **Validate** — `get_trail_pass_status(token)` (anon-callable) for the
   `/join/:token` landing page; lazily expires overdue passes.
3. **Redeem** — inside `handle_new_user()` during signup (token in
   `options.data.trail_pass_token`). Email-bound, single-use under a row
   lock, lineage + inviter circle recorded in the same transaction.
   `redeem_trail_pass(token)` also exists as a standalone RPC.
4. **Regenerate** — `process_invite_maturation_for(inviter)`: a redeemed
   pass whose invitee stays healthy past `invite_maturation_days` credits
   the inviter one pass (once, `matured_credited_at`), capped at
   `maximum_passes`. Runs lazily via `refresh_my_invites()` whenever the
   invites page opens; optionally schedule it globally (see Operations).
5. **Accountability** — a ban debits the inviter's `invite_trust_score` and
   records a `CONFIRMED_BAD_INVITEE` trust event. Relationships are context,
   never guilt: no automatic punishment of relatives (spec §153).

## Risk engine

`evaluate-signup-risk` (fire-and-forget after signup, authenticated as the
new user) gathers signals — email syntax/disposable-domain/MX/domain-velocity,
inviter trust, sibling bans, root-link signups, Turnstile —, scores them with
`_shared/trust-core.ts` (unit-tested in `src/test/trust-core.test.ts`),
writes `risk_signals` rows with explanations + policy version and a 90-day
expiry, sets `user_trust.risk_level`, opens auto cases at HIGH/CRITICAL, and
applies the phone step-up or auto trail freeze when those flags are on.
Behavioral defenses live in DB triggers: new-account daily rate limits on
posts/circles/messages and duplicate-message detection (hashes only, never
content, spec §106).

## Operations

- **Scheduling**: `check-reporter-patterns` and `check-block-thresholds`
  were already cron-shaped with no scheduler; global invite maturation
  (`process_invite_maturation_for` per inviter) is likewise safe to run on a
  schedule. If you enable pg_cron or an external scheduler, run all three
  daily. Nothing breaks without it — maturation happens lazily.
- **Suspensions**: a row with `suspended_until = null, is_permanent = false`
  means *held pending review*. The old client deleted such rows on load
  (self-clearing hold); that is fixed — only genuinely lapsed dated
  suspensions self-clear.
- **Audit**: `admin_audit_log` is append-only (trigger raises on
  UPDATE/DELETE). System actions (auto-freeze) log with a null actor.
- **Account deletion**: `user_lineage` cascades with the profile;
  descendants keep their rows with `invited_by_user_id` nulled — abuse
  graphs degrade gracefully without keeping dossiers (spec §22).

## Known gaps / follow-ups

- **Legacy `invites` RLS is public-read** (pre-existing): every slug is
  enumerable. Redemption is now server-enforced and decremented atomically,
  but the right fix is flipping `LEGACY_LINK_REDEMPTION_ENABLED` off once
  outstanding links have drained, then dropping the public policy.
- **Turnstile client widget** is not rendered yet — server verification and
  flags are in place; add the widget + `VITE_TURNSTILE_SITE_KEY` when
  enabling.
- **Phone OTP flow** needs a provider integration before
  `PHONE_STEP_UP_ENABLED` can be turned on.
- **Suspension enforcement is still client-rendered**; the account hold
  pages are correct, but RLS predicates don't yet check `suspensions` on
  write paths. Server-side write-blocking for suspended accounts is the next
  hardening step.
- **Generated types** (`src/integrations/supabase/types.ts`) predate the new
  tables; `src/lib/trailApi.ts` / `rangerApi.ts` carry explicit interfaces
  and cast the client. Regenerate types after applying migrations and fold
  them in.
- **Admin-created users**: with `INVITE_ONLY_SIGNUP` on, dashboard-created
  accounts are rejected by the gate. Create service accounts via
  `auth.admin.createUser` with `app_metadata: { invite_bypass: 'true' }`
  (app_metadata is not client-settable, unlike user_metadata).

## Migration order

1. `20260809210000_ranger_roles_enum.sql` — enum values (own transaction)
2. `20260809210100_trail_trust_schema.sql` — tables, RLS, backfills, config
3. `20260809210200_trail_pass_rpcs.sql` — secrets, invite RPCs
4. `20260809210300_signup_gate_and_behavior.sql` — signup gate, report
   pipeline, behavioral triggers
5. `20260809210400_ranger_action_rpcs.sql` — ranger actions, lineage,
   appeals, grants
