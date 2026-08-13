# Bring the whole site up to the handoff look

The uploaded package is the same Under Pines UI handoff the shell was built from — its palette (cream/paper/sand/ink/navy/ember/sun/pine), Georgia serif headings, 3–5px radiuses, and hairline-bordered panels already live in `index.css` and `src/styles/handoff-shell.css`.

What hasn't caught up is roughly half the screens. Feed, My Page, Explore, Photos, Updates, Groups, Listening and the Cabin speak the handoff language (`.panel`, `.module`, `.tab-strip`, `.box-heading`, `.outline-button`). Messages, Settings, Login, onboarding/welcome, invites, marketplace, post detail, search, camps and the Grove admin screens are still on generic rounded-card Tailwind, so the site reads as two designs stitched together.

This is presentation only: no data, queries, mutations, routes, or component behavior change. Same props, same handlers, same states — different clothes.

## What changes

**1. Shared primitives first (biggest visual payoff)**
Align the shadcn base components to the handoff so every dialog, sheet, input, button, tab, select and toast inherits the look at once: hairline `--line` borders, paper surfaces, 3–4px radiuses, ember focus ring, Georgia titles, the handoff's flat two-layer shadow instead of soft blurred drop shadows. Done through `src/components/ui/*` variant classes and tokens — no API changes.

**2. Screen pass, in order of how often they're seen**
- Messages (Campfires): buddy-list and conversation chrome on the handoff panel language, keeping all four messenger skins intact.
- Login, Welcome/onboarding steps, Gate, Suspended: paper card on the cream radial ground, serif headline, ember primary button.
- Settings, Notification/Privacy settings, Page Customizer: `.panel` + `.box-heading` sections, dashed hairline dividers, small caps labels.
- Post detail, Search, Invites/Invite tree, Collections, Camps (Lodge/Firepit/Bonfire), Events, Marketplace, Subscription.
- Grove admin screens: same panel/table treatment, lower-key, so admin stops looking like a different product.

**3. Consistency sweep**
Replace remaining hardcoded color utilities (`bg-white`, `text-black`, raw hex) on touched screens with role tokens so both themes stay correct; keep the ember accent constant across light and dark as the handoff does.

## Technical notes

- Shared classes go in `handoff-shell.css` (loads on every route); screen-specific CSS goes in a route-scoped stylesheet imported by that page — a shared class placed in a route stylesheet silently loses styling elsewhere.
- Handoff literals are mapped onto the existing HSL role tokens rather than pasted as hex, so dark mode keeps working.
- Per-commit bar: `tsc`, eslint on changed files, vitest, `vite build`, and entry JS stays around 195 kB gzip (CSS-led work shouldn't move it).
- Signed-in screens (Messages, Settings, Grove) can't be eyeballed from here — the sandbox has no backend access — so those get a mock-data screenshot harness plus your review in the preview.

## Out of scope

No layout re-architecture, no new features or removals, no copy changes, no schema or RLS work.
