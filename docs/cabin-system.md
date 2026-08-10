# The Cabin system

_The profile is a place. This doc covers what existed before the build, what was
reused, the data model, and where each piece lives. Product source of truth is
the Cabin/Profile spec (v1.0); this is the implementation record._

## Pre-build inventory (what existed, what we did with it)

| Existed | State found | Decision |
|---|---|---|
| `CabinScene` + 10-layer environment renderer | Deleted in PR #1 (boot perf); fully working in history | **Restored** — now lazy-loaded inside the `/u/:handle` route chunk, so it costs the entry bundle nothing |
| 9 biome scene sets (`src/components/biomes/*.jsx`) | Orphaned in tree | **Rewired** into the restored scene |
| 71-creature wildlife library incl. legendary Sasquatch (`src/components/creatures/**`) | Deleted in PR #1 | **Restored** — deterministic per-user-per-day scheduling (`creatureScheduler`) |
| `useSolarCycle` (Open-Meteo sunrise/sunset, sun/moon arcs) | Orphaned in tree | **Reused** as-is |
| `useWeather` (Open-Meteo current, WMO→condition mapping) | Deleted in PR #1 | **Restored** as-is |
| `wheelOfTheYear` + seasonal scenes/overrides | Deleted in PR #1 | **Restored** — seasonal color overrides per biome |
| `locationResolver`, `config/biomes`, `biomeMapping` | Deleted in PR #1 | **Restored** |
| Pine Pets (`pine_pets`, `pine_pet_generations` tables; creation flow + 3 edge functions) | Tables live; UI + functions deleted in PR #1 | **Restored** UI + functions; extended with traits/story/visibility columns |
| `cabin_companions` table + `useCompanions` | Live table, orphaned hook | **Reused** — companions render in the restored scene |
| `cabin_widgets`, `wall_notes`, `top_friends`, `cabin_visits` | Live, used by My Page | **Untouched** — My Page keeps them; the Cabin links to the page |
| `cabin_suggestions` table | Live, orphaned | **Reused** as the "Leave a note" record |
| `blocks`, `mutes`, `circles`, `reports`, `notifications` | Live | **Reused** — all cabin social RPCs check blocks; knock/gift/guestbook notify through `notifications` |
| `seasonal_events` + `activate-seasonal-events` fn | Live table; fn deleted | Function restored |

New (nothing existed): cabin config, item catalog/inventory/placements,
guestbook, knocks, porch gifts, ingredients/recipes/cookbook, trades,
environmental event ledger, cabin history. All in
`supabase/migrations/20260810210000_cabin_system.sql`.

## Routes

- `/u/:handle` — the Cabin. Owner sees home mode; anyone else sees visit mode.
- `/u/:handle` is **not** a public route: logged-out visitors hit the Gate,
  same as `/:handle`.
- `/cabin` redirects to your own cabin. `/:handle` (My Page) remains and the
  two cross-link; the Cabin is the place, the page is the reading surface.

## Data model (all tables RLS'd, all writes through RPCs where trust matters)

- `cabins` — 1:1 with profiles. Theme, biome, weather source
  (`account` | `cabin_location` | `default`), curated `cabin_location_key`,
  window style, curtain state, lighting/audio/presence toggles, and the
  privacy knobs (cabin/guestbook/notes/gifts/knock/pets visibility).
  Created lazily by `get_cabin_view` on first visit.
- `cabin_item_definitions` — the data-driven catalog. `valid_zones text[]`
  constrains placement (spec §7); `rarity` uses the Under Pines ladder
  (everyday/unusual/hard-to-find/strange/very-strange); `enabled` is the kill
  switch; `interaction` JSON declares `ownerActions`/`visitorActions`.
- `user_cabin_items` — inventory with provenance: `acquisition_source`,
  `gifted_by`, `provenance_note`, `acquired_at`, `custom_name`.
- `cabin_placements` — item ↔ zone. Zones are a fixed vocabulary
  (`porch_left…pet_area`, see `src/lib/cabin/zones.ts`); a DB trigger
  validates the zone against the definition's `valid_zones`.
- `guestbook_entries`, `cabin_knocks`, `porch_gifts`, `cabin_suggestions`
  (notes) — social surface. All written via SECURITY DEFINER RPCs
  (`cabin_sign_guestbook`, `cabin_knock`, `cabin_leave_gift`,
  `cabin_leave_note`) that enforce blocks, the owner's privacy setting,
  and rate limits; each warm-notifies through `notifications`.
- `ingredient_definitions`, `user_ingredients`, `recipes`, `user_recipes` —
  campfire. `cook_recipe(text[])` is server-authoritative: verifies pantry,
  decrements, matches the combination, grants the discovery, writes history.
  Secret recipes never appear in silhouettes.
- `trades` + `trade_items` — atomic. `respond_trade` locks both users'
  rows, re-verifies ownership of every line item, transfers, stamps
  provenance (`acquisition_source='trade'`), and marks the trade immutable.
  No currency anywhere; `tradable`/`giftable` flags gate what can move.
- `environmental_events` + `event_witnesses` — server-configurable rarity
  for reward-granting moments (discoveries like the strange pinecone) and
  witness records for rare sightings. Ambient wildlife stays client-side
  (deterministic scheduler, no rewards — spec §98 split). Every event row
  has `enabled` (kill switch, §105) and `secret` (kept out of any UI list,
  §64).
- `cabin_history` — owner-visible timeline (cabin created, pet added, gift
  kept, recipe discovered, trade completed, rare sighting). Appended by the
  RPCs, never by the client.
- `pine_pets` gains `personality_traits text[]`, `story`, `visibility`,
  `interaction_mode`, `memorial_years`. Active roamers capped at 3
  (`is_resting` beyond that).

## Server/client authority split (spec §94–98)

Server owns: inventory, gifts, trades, recipe discovery, event rewards,
privacy enforcement, provenance, history. Client owns: animation timing,
ambient wildlife, pet behavior states, presentation. A visitor can watch a
raccoon without a network round-trip; nobody can mint a marshmallow.

## The page (`src/pages/CabinPage.tsx` + `src/components/cabin2/*` + `src/styles/cabin.css`)

Layout: exterior scene banner (restored `CabinScene` — sky, sun/moon, weather,
biome, seasonal wash, wildlife, companions, pets) with presence overlays
(porch light / chimney smoke, owner-disableable) and clickable discoveries;
below it the interior room — window (curtains toggleable, persisted),
fireplace, and the placement zones rendering each placed item; identity strip
(avatar, name, relationship, message) for §24 accessibility; and the
"Things in this Cabin" drawer listing every interactive object as a real
button (§76). Owner mode gets Fix Up Cabin 🛠️ (zone-based editor), pantry,
cookbook, mailbox (notes + trades), history. Visitor mode gets guestbook,
leave-a-note, knock, porch gift, trade, pet petting per the owner's settings.
`prefers-reduced-motion` collapses scene animation.

## Weather sources & location privacy (spec §12–13, §90–91)

`weatherFor(cabin, profile)`: `cabin_location` reads coordinates from the
curated list in `src/lib/cabin/locations.ts` (Olympic Peninsula, Reykjavík,
Tahoe, …); `account` uses the profile's existing lat/lng/zip;
`default` is the PNW fallback. Visitors are never shown coordinates or the
source — only the weather itself. `location_visibility` controls whether the
cabin's chosen locale name is displayed.

## Verification

`npx tsc --noEmit -p tsconfig.app.json` · `npx eslint <changed>` ·
`npx vitest run` · `npx vite build` · entry gzip budget ~195 kB (everything
cabin loads in the route chunk). Signed-in paths can't be exercised from the
sandbox — verified via Lovable `query_database` after applying the migration.

## Deliberately not built (spec §127)

No 3D, no avatars, no voice, no free placement, no marketplaces/loot
boxes/gacha, no streaks or leaderboards, no pet death/health, no visitor
analytics, no paid memorials, no synchronous multiplayer. The shared-campfire
and neighborhood ideas remain extension points only.
