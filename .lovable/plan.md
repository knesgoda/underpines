# My Page redesign — the scrapbook front porch

A non-destructive visual and structural redesign of `/:handle` and `/me`. No routes, tables, columns, or features are removed. Everything currently on the page keeps its data and behavior; some of it moves.

## What the page becomes

Mobile, top to bottom:

1. **Profile header** — one wide paper sheet: avatar, name, `@handle`, the mantra as a pull quote, faint pencil pine at the edges.
2. **At a glance** — city (respecting the existing show-city setting), member-since, owner-only view count, plus the real `Edit my page` and `Step into your cabin` buttons. Faint cabin illustration behind. Visitors see the Add-to-circle button instead of owner controls.
3. **Friends** — featured friends with a `Top 4 / 8 / 12` selector, avatars linking to each person's page, `See all friends →` to `/friends`.
4. **Albums corkboard** — four featured albums as polaroids/taped prints on cork, using each album's real cover photo and real photo count, with varied pins/clips/tape. `See all albums →` to the existing Photos page. Tapping an album opens it there.
5. **Wall** — a share composer ("Share something with your Under Pines…") that creates a real post, then their posts chronologically as paper entries.

Desktop: left navigation stays. Two columns — main column (~58%) holds the header, a subtle editorial tab strip, composer and posts; right column (~42%) holds At a glance, Friends, and a larger corkboard. Tablet widens the friends grid and corkboard before the sidebar splits off.

## Tabs

The tab strip on the main column: **Wall · Photos · Journal · Likes**.

- Wall — posts (default).
- Photos — links to the existing Photos page.
- Journal — their long-form story posts, filtered from the existing posts they already write.
- Likes — posts they've reacted to, read through the existing reactions.

Journal and Likes are new views over existing data; no new content types.

## Things that move rather than disappear

- **Wall notes** (the guestbook visitors write in) becomes its own smaller section below the posts, keeping its composer and RLS behavior.
- **About me / Currently / custom page modules / pinned song / Listening now** move into the desktop right column (below the corkboard) and into the mobile flow after the wall. All still read the same rows.
- The **Full 2006 theme** and the owner's custom page colors still apply, scoped to the page wrapper as today.

## Editing the page

`Edit my page` gains two sections in the existing customizer:

- **Featured friends** — pick 4, 8, or 12; choose people from the real friends list; reorder.
- **Featured albums** — choose which albums appear on the corkboard, reorder them, and pick one photo from an album as its cover.

Existing customizer sections (basics, colors, modules, song) are untouched.

## Technical notes

Migration (additive only, no drops):

- `profiles.featured_friends_count smallint default 4` with a check for 4/8/12.
- New `public.featured_albums (id, owner_id, album_id, position, cover_media_id)`, unique on `(owner_id, album_id)`, with GRANTs to `authenticated`/`service_role`, RLS enabled: owner full control; readers gated through the existing blocks-aware `can_view_member_content(owner)` helper, matching the `albums` policies.

Client:

- `src/pages/MyPage.tsx` recomposed into small components under `src/components/profile/` (`ProfileHeader`, `AtAGlance`, `FriendsModule`, `AlbumCorkboard`, `WallComposer`, `ProfileTabs`, `WallNotes`).
- New styles in `src/styles/profile.css` (route-scoped, already imported by this page). Paper/tape/pin/cork treatments as CSS only — no new image assets beyond lightweight inline SVG pine and cabin line art. Pins, tape and cork are `aria-hidden` decoration.
- Reads: existing `usePageProfile`, `usePagePrivacy`, `useOwnVisitCount`, `useTopFriends`, `useWallNotes`, `useAlbums`, `useNowPlaying`, `useFriendLists`. New small hooks for featured albums, journal posts and liked posts.
- Writes: composer posts through the same path `/new/story` already uses; featured-friend count and album order through additions to `usePageEditor`.
- Existing `PostCard` and `HandoffPostCard` stay in use elsewhere; the paper post treatment is CSS on the post card already rendered by `CabinPostHistory`.
- Colors and type come from existing tokens only — no hardcoded hex.

Accessibility: single `h1` (the name), tabs as semantic buttons with a coral underline on the active one, 44px minimum tap targets, real alt text on album covers and avatars, visible focus rings, decorative flourishes hidden from screen readers.

Verification: typecheck, lint, tests, build, and a signed-out Chromium pass in both themes. A signed-in eyeball pass stays yours — the sandbox can't reach the backend.
