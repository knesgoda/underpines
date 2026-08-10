/**
 * The waitlist is founder-only by request: RLS on waitlist_signups (see
 * migration 20260811000000) only answers to this account, so this constant
 * is cosmetic — it decides whether to render the Grove nav item and page,
 * while the database enforces the actual gate.
 */
export const WAITLIST_ADMIN_EMAIL = 'kevin.nesgoda@gmail.com';

export const isWaitlistAdminEmail = (email?: string | null) =>
  (email ?? '').toLowerCase() === WAITLIST_ADMIN_EMAIL;
