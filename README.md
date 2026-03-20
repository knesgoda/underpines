# Under Pines

A quiet place on the internet.

---

## What's Built

- **Phase 1:** Onboarding + Cabin
  - Invite-only registration with slugged invite links
  - Walk Through the Woods onboarding flow
  - Cabin (profile) with weather scene, moods, layouts
  - Live weather via Open-Meteo API
  - Atmosphere and layout customization

- **Phase 2:** Feed, Circles, Campfires, Collections, Stripe, Notifications
  - Feed with Sparks, Stories, Embers, Quote posts
  - Circle (friendship) system with requests
  - Campfires (real-time messaging with expiration)
  - Voice messages in Campfires
  - Collections (curated post series)
  - Pines+ subscription ($1/mo or $10/yr via Stripe)
  - Daily Ember email digest via Resend
  - Lantern notification center
  - Push notifications (opt-in)

- **Phase 3:** Camps, Newsletters, Search, Voice, Paid Content, PWA
  - Camps (community groups) with Firepit, Lodge, Bonfire
  - Camp newsletters with scheduling
  - Full-text search across posts, camps, members
  - Paid Collections with Stripe Connect
  - Creator payouts (monthly, 5% platform fee)
  - PWA with offline support, install prompt

- **Phase 4:** Reporting + AI Triage, The Grove, Cabin Design Marketplace, Seasonal Events, Platform Polish
  - Report system with AI triage (Gemini 2.5 Flash)
  - Suspension enforcement (temporary + permanent)
  - Serial reporter detection + block threshold enforcement
  - The Grove (operator dashboard) at /grove
  - Review queue with moderation actions
  - Member/Camp/Revenue management
  - Weekly Grove report email
  - Cabin Design Marketplace at /marketplace
  - Design preview, purchase, and rating system
  - Seasonal events (solstice/equinox cards)
  - Annual Wrapped for Pines+ members
  - Platform polish (typography, focus states, reduced motion, error states)

---

## Environment Variables

### Supabase (auto-configured)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Edge Function Secrets (set in Lovable Cloud)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_WEBHOOK_SECRET`
- `STRIPE_MONTHLY_PRICE_ID`
- `STRIPE_ANNUAL_PRICE_ID`
- `RESEND_API_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_EMAIL`
- `LOVABLE_API_KEY` (for AI triage)

---

## Admin Setup

Admin roles are managed via the `user_roles` table. To grant admin access:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<your-user-id>', 'admin');
```

The Grove dashboard is accessible at `/grove` (direct URL only).

---

## Stripe Setup

### Products
- Pines+ Monthly ($1/mo)
- Pines+ Annual ($10/yr)
- Dynamic products for paid Collections and Cabin Designs

### Webhook Endpoints
- `/functions/v1/stripe-webhook` — Subscription events
- `/functions/v1/stripe-connect-webhook` — Connect account events

### Required Events
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `account.updated` (Connect)

---

## Edge Functions

| Function | Trigger | Schedule |
|---|---|---|
| `triage-report` | On report submission | — |
| `check-reporter-patterns` | Cron | Daily |
| `check-block-thresholds` | Cron | Daily |
| `send-daily-ember` | Cron | Hourly |
| `send-grove-weekly-report` | Cron | Monday 6am UTC |
| `send-camp-newsletters` | Cron | Hourly |
| `camp-health-check` | Cron | Daily |
| `campfire-lifecycle` | Cron | Hourly |
| `inactive-member-nudge` | Cron | Daily |
| `activate-seasonal-events` | Cron | Hourly |
| `send-annual-wrapped` | Cron | Daily |
| `check-subscription` | On demand | — |
| `create-checkout-session` | On demand | — |
| `create-portal-session` | On demand | — |
| `create-design-checkout` | On demand | — |
| `create-collection-checkout` | On demand | — |
| `create-collection-price` | On demand | — |
| `create-connect-account` | On demand | — |
| `create-connect-login-link` | On demand | — |
| `process-monthly-payouts` | Cron | Monthly |
| `save-push-subscription` | On demand | — |
| `send-push-notification` | On demand | — |
| `send-grove-weekly-report` | Cron | Weekly |
| `stripe-webhook` | Webhook | — |
| `stripe-connect-webhook` | Webhook | — |

---

## PWA Setup

The app is configured as a Progressive Web App with:
- Service worker for offline caching
- Web push notifications (VAPID keys)
- Install prompt for mobile

---

## Local Development

```bash
npm install
npm run dev
```

The app runs on Lovable Cloud with Supabase for backend services.
