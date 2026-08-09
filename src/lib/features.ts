/**
 * Features that are built but cannot ship until the schema catches up.
 *
 * The Phase 3 migrations are applied through Lovable rather than on deploy,
 * and they have not landed. Two features need them and fail differently
 * without them, so neither is left to "degrade gracefully":
 *
 * - **Bulletins** need `posts_post_type_check` widened to accept 'bulletin'.
 *   Until then the insert is *rejected* by Postgres — that is an error the
 *   user sees after writing something, not a missing section. Off.
 *
 * - **Events** need the `events` and `event_responses` tables, which do not
 *   exist. Reads return empty and creation is disabled. Off.
 *
 * Flip these to true in the same change that confirms the migration is
 * applied, and delete the flag once it has been true for a release.
 *
 * See supabase/migrations/20260809070200_phase3_events_bulletins_presence.sql.
 */
export const BULLETINS_ENABLED = false;
export const EVENTS_ENABLED = false;
