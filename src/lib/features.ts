/**
 * Features waiting on something before they can ship.
 *
 * Both of these were gated on the Phase 3 migration, which is now applied — so
 * the constraint has moved from the schema to the code.
 *
 * - **Bulletins** are on. `posts_post_type_check` accepts 'bulletin', the
 *   composer writes it, and PostCard and PostDetail render it as what it is:
 *   a spark with a label.
 *
 * - **Events** stay off one more commit. The tables exist and the surface
 *   reads them, but there is no composer, and turning the flag on would put a
 *   "Plan one" link on screen pointing at `/events/new` — a route that does
 *   not exist. Shipping a link to a 404 is the exact bug this codebase just
 *   spent several commits removing.
 *
 * Delete each flag once it has been true for a release.
 */
export const BULLETINS_ENABLED = true;
export const EVENTS_ENABLED = false;
