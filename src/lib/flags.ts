/**
 * Feature flags. The Cabin (the profile-as-place at /u/:handle) is being
 * worked on behind the scenes — flip this back to true to re-open it.
 */
export const CABIN_ENABLED = false;

/**
 * The design economy — Marketplace and My Designs — is parked until after
 * beta. Flip back to true to re-open the surfaces (routes, Settings entries,
 * notification deep links). Stripe payments were removed entirely, so a
 * revived marketplace is free-designs-only until a new payment path exists.
 */
export const MARKETPLACE_ENABLED = false;
