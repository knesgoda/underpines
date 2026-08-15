# Disconnecting Stripe (post Pines+ removal)

`STRIPE_SECRET_KEY` is owned by the Stripe integration, not by the project's
secret store — the secrets tooling cannot delete it. It goes away when the
integration itself is disconnected, which only a human with dashboard access can
do. This is the runbook for doing that safely.

## Pre-flight (all verified green on 2026-08-15)

Everything below must hold before disconnecting, so nothing breaks at runtime:

1. **No edge function reads a Stripe secret.** All 11 payment functions
   (`check-subscription`, `create-checkout-session`, `create-collection-checkout`,
   `create-collection-price`, `create-connect-account`,
   `create-connect-login-link`, `create-design-checkout`,
   `create-portal-session`, `process-monthly-payouts`, `stripe-connect-webhook`,
   `stripe-webhook`) are deleted from the repo AND from the deployment — they
   return 404 from the functions host.
   Re-check: `rg -n "STRIPE_" supabase/functions` returns nothing.
2. **No client code starts a checkout.** Paid collections show the waitlist
   only; paid designs show a disabled button. Re-check:
   `rg -n "stripe" src --glob '!src/integrations/supabase/types.ts'` returns
   only unrelated matches (creature filenames, flags comment).
3. **No cron job calls a payment function.** pg_cron job 5
   (`process-monthly-payouts`) is unscheduled.
4. **The other Stripe secrets are already gone.** `STRIPE_WEBHOOK_SECRET`,
   `STRIPE_CONNECT_WEBHOOK_SECRET`, `STRIPE_MONTHLY_PRICE_ID`,
   `STRIPE_ANNUAL_PRICE_ID` were deleted.

If any check fails, stop — fix that first. Disconnecting with a live payment
path leaves the app failing on every call.

## Disconnect

1. Open the Payments dashboard.
2. Use the three-dot menu in the top-right corner.
3. Choose **Disconnect Stripe** and confirm.

That permanently deletes the stored Stripe API key for this project and removes
the integration data. It does **not** touch the Stripe account itself: products,
customers, and any historical payments stay exactly as they are at
dashboard.stripe.com.

## After

- Confirm `STRIPE_SECRET_KEY` no longer appears in the project's secrets.
- Nothing to redeploy — no function referenced it.
- The database is deliberately untouched: `pines_plus_subscriptions`,
  `collection_stripe_prices`, `collection_subscriptions`,
  `creator_stripe_accounts`, `creator_earnings`, `creator_payout_summaries` and
  `profiles.is_pines_plus` remain as idle, unread columns/tables. Dropping them
  is an optional future migration.

## Reconnecting

Reconnect any time by supplying a new Stripe secret key through the payments
setup. Note that disconnecting cancels nothing — active subscriptions and
refunds are managed in the Stripe dashboard directly.
