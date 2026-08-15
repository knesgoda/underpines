# Check in to a place

Add a lightweight place tag to posts — the Under Pines version of a Facebook/Instagram check-in. Search a real place by name, attach it, and it quietly drops a "Been here" pin on your Trail Map.

## What members get

- **Place tag on any post.** In the compose sheet (Spark and Photos), a small "Add a place" row. Tap it, type a few letters, pick from results, and the chosen place shows under your name on the post card as a quiet line: `at Point Reyes Station`.
- **Standalone check-in.** The compose picker gains a third option, "Somewhere new" — a check-in-first form: pick the place, add an optional line of text and an optional photo. It posts as an ordinary short post that happens to carry a place, so the feed, replies, and reactions all keep working as they do.
- **Privacy inherits the post.** A place is part of the post: whoever can see the post sees the place, nobody else. No separate control, no location history page, no live location, no background tracking.
- **Trail Map tie-in.** Checking in adds (or reuses) a "Been here" pin on your own Trail Map at that place. Duplicate check-ins to the same place don't stack pins.
- Tapping a place on a post opens your Trail Map centered on that spot (no global "who else is here" list — that would be a public metric).

## Notes on tone and scope

- Copy stays plain: "Add a place", "at <place>", "Been here".
- No check-in counts, no leaderboards, no "N people checked in" — consistent with the no-public-metrics rule.
- Coordinates are stored rounded to ~3 decimals (≈100 m) so a post never reveals a home address precisely.

## Technical outline

**Database (one migration)**
- New columns on `posts`: `place_name text`, `place_id text`, `place_lat numeric`, `place_lng numeric`. Same four on `camp_posts` so a place works inside Groups too.
- Reuse existing `trail_map_pins` for the map side; no new pin table.
- New `SECURITY DEFINER` RPC `attach_post_place(_post_id uuid, _place_name text, _place_id text, _lat numeric, _lng numeric, _kind text)`: verifies the caller authored the post, writes the columns (rounding coordinates), and upserts a `trail_map_pins` row of kind "been here" for that user + place. Clients never write these columns directly — column-scoped grants keep post place data going through the RPC, per the project's "clients render, they cannot mint" rule.
- RLS: place columns ride on the existing `posts` / `camp_posts` read policies, so visibility is automatically identical to the post.

**Place search (geocoding)**
- Use the Google Maps Platform connector via the Lovable gateway (Places API New `places:searchText`), called from a new edge function `search-places` — never from the browser, so the key stays server-side.
- The function authenticates the member with `_shared/auth.ts`, validates input (2–100 chars), caps results at 8, and returns only `id`, `displayName`, `formattedAddress`, `location`.
- Cost guardrails: 400 ms debounce in the UI, minimum 3 characters, in-memory cache per session, and a small per-member rate limit in the function.
- This needs the Google Maps connector connected to the project; I'll open the connect card during the build.

**Frontend**
- `src/components/places/PlacePicker.tsx` — search field + result list, themed with existing tokens, no autocomplete-on-keystroke beyond the debounce.
- `SparkComposer.tsx` / `EmberComposer.tsx`: optional place state, "Add a place" trigger, calls `attach_post_place` right after the post row is created (same pattern as media).
- `MobileComposerSheet.tsx`: new "Somewhere new" picker entry that opens the Spark form with the place step first.
- `HandoffPostCard.tsx` (and `PostCard.tsx` for search/detail): render the `at <place>` line under the author when present, linking to the Trail Map.
- `useFeedPosts.ts` and post detail queries: select the four new columns.

**Tests**
- Unit test for the place-picker debounce/cache and for coordinate rounding.
- A drift test pinning the RPC name and the place columns, matching how the other migrations are guarded.
- Post-migration verification per SECURITY.md: policy/function state check plus an impersonated exploit test in a rolled-back transaction proving one member cannot attach a place to another member's post or write a pin for someone else.
