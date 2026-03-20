

# Under Pines — Phase 1 Implementation Plan

## Overview
Build the onboarding flow and Cabin (user profile) for an invite-only social platform with a warm, forest-inspired aesthetic. The app should feel like arriving at a place, not signing up for a product.

---

## 1. Foundation & Design System
- Set up Google Fonts (Playfair Display for headings, Plus Jakarta Sans for body)
- Implement the full pine/amber color palette as CSS custom properties
- Create base components: textured backgrounds (subtle noise/paper feel), soft-shadow cards, pill buttons, rounded inputs
- Build the loading state: an illustrated swaying pine tree (CSS animated SVG)
- Add Framer Motion for page transitions (slow fade + upward drift)

## 2. Database & Auth Setup (Supabase)
- Create all tables: `profiles`, `invites`, `invite_uses`, `seedling_periods`, `cabin_widgets`, `cabin_visits`
- Enable email+password auth
- Create trigger to auto-insert skeleton profile on signup
- Configure RLS policies (users read/write own profile, public read on other profiles)
- Set up Supabase Storage bucket for header images
- Generate initial founder invite

## 3. Onboarding Flow (8 Steps)

**Step 0 — Invite Landing** (`/invite/[slug]`)
- Dark forest background with weather scene at reduced opacity
- Glass-morphism card showing inviter's name and welcome copy
- Expired invite state with warm messaging

**Steps 1–5 — Account Creation** (`/onboarding`)
- Shared layout with pine-needle step indicator (5 icons, opacity-based progress)
- Step 1: Display name input
- Step 2: Handle with debounced (400ms) real-time availability check
- Step 3: Email input ("Daily Ember" framing)
- Step 4: Password with gentle 8-char minimum messaging
- Step 5: Phone verification with auto-advancing 6-digit code input
- Each step cross-fades into the next

**Step 6 — Walk Through the Woods**
- 40-second CSS/SVG animated scene: silhouette figure walks a forest path
- 3 parallax background layers (trees at different depths)
- 4 waypoints with fade-in captions about Cabin, Campfires, Camps
- Fireflies (random opacity pulses), dusk sky, stars
- Unskippable but brief; ends with "Step inside →"

**Step 7 — First Cabin View**
- User's Cabin with their name, default Morning Mist atmosphere, placeholder header
- Time-of-day awareness via browser/IP approximation
- Three floating suggestion cards (header image, pin song, write mantra) with staggered fade-in
- "I'll do this later" is a real, unjudged option

**Step 8 — The Human Moment**
- Full-screen gratitude moment acknowledging the inviter's trust
- "Enter the Pines" button with breathing pulse animation
- Forest scene brightens and dissolves into Cabin

## 4. The Cabin (Profile)

**Layout & Structure**
- Full-width header image (280px) with weather scene overlay
- Display name, handle, mantra, currently status, location
- Two-column layout below (posts placeholder + collections placeholder)
- Hearth (default) and Hollow layouts fully implemented; Trailhead/Canopy show "coming soon"

**Live Weather Scene**
- Zip code → lat/lon (Nominatim API) → weather data (Open-Meteo API)
- Sky gradient layer shifting by time of day (dawn through night, 6 periods)
- Stars layer at night (20-30 dots with twinkle animations)
- SVG pine tree silhouettes (3-5 trees) with wind-based sway animation
- Particle systems: rain (diagonal lines), snow (drifting circles), fog (opacity layer)
- Seasonal tree appearance based on current month
- All animations GPU-accelerated (transform/opacity only)

**Cabin Customization (Edit Drawer)**
- Slide-in drawer (380px, bottom sheet on mobile) with live preview
- **You tab**: name, handle, bio (200 chars), mantra (80 chars), currently, zip code
- **Appearance tab**: 8 atmosphere picker (3 free, 5 Pines+), layout picker, 12 preset accent colors, cabin mood icon grid (8 options), header image upload
- **Details tab**: pinned song (manual title/artist entry)
- **Widgets tab**: Pines+ only — Bookshelf (6 books) and Field Notes (5 entries)
- Auto-save with 800ms debounce, quiet "Saved" indicator
- Atmosphere changes with 600ms CSS transition

**Viewing Others' Cabins** (`/[handle]`)
- Full Cabin renders with their atmosphere and weather
- No edit controls; "Send a Campfire" button shows coming soon
- Anonymous visit count tracked (daily aggregate, no visitor identity)

## 5. Invite System
- Each user gets invite link: `underpines.com/invite/[handle]`
- Default 3 uses; founder gets infinite
- Invite management page showing remaining count and invitee list
- Warm empty/expired states

## 6. Pines+ Mock Upgrade
- Upgrade prompts in Widget Shelf lock state and Appearance tab
- Modal with pricing ($1/mo or $10/yr), equal visual weight
- Mock flow sets `is_pines_plus: true` in database
- "Maybe later" dismisses for 30 days

## 7. Navigation
- Minimal top bar: logo wordmark + avatar dropdown
- Dropdown: Visit Cabin, Edit Cabin, My Invites, Sign out

## 8. Responsive Design
- Mobile-first (375px base), tablet (768px), desktop (1280px)
- Edit drawer → bottom sheet on mobile
- Weather scene particle counts reduce on small viewports
- 44×44px minimum touch targets

