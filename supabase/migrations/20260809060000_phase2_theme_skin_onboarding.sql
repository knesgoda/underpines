-- Phase 2 foundation for the new UI.
--
-- 1. messenger_skin — the second theming axis. Page theme (profiles.theme)
--    and messenger skin are independent on purpose: a dark page can host an
--    ICU-green messenger. Only the selected id is stored; the skin itself is
--    CSS (src/styles/messenger-skins.css).
--
-- 2. onboarding_completed_at — the welcome flow writes display name and
--    handle *after* account creation, because handle_new_user() COALESCEs
--    both to placeholders ('user_<id prefix>' / 'New Arrival'). This column
--    is what the route guard uses to send anyone still carrying placeholders
--    back into the flow, and to resume a run that was abandoned partway.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS messenger_skin text NOT NULL DEFAULT 'pines';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_messenger_skin_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_messenger_skin_check
  CHECK (messenger_skin IN ('pines', 'icu', 'bullseye', 'emessen'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- Existing members have already been through onboarding, whatever it looked
-- like at the time. Without this backfill the new guard would drag every one
-- of them back through the welcome flow on their next visit.
UPDATE public.profiles
SET onboarding_completed_at = COALESCE(onboarding_completed_at, created_at)
WHERE onboarding_completed_at IS NULL;

-- 'evergreen' was retired when the palette moved to light/dark. The client
-- already falls back for unrecognised values, but leaving the rows behind
-- would silently reactivate the theme if the name were ever reused.
UPDATE public.profiles
SET theme = 'light'
WHERE theme = 'evergreen';
