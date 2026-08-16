# Change your profile picture

Nothing broke — the feature was never built past onboarding. The welcome flow lets you pick one of the 24 woodland avatars, and its own code comment says photo upload was "left to the profile editor." That editor was later rebuilt as the page customizer, and the avatar step didn't come with it. So today the only way to set a face is during signup, and there is no way to change it afterward.

Everything underneath is already in place: the `avatars` storage bucket exists with per-member folder rules, and both the photo field and the creature choice are writable by the person who owns the profile. This is purely a missing screen.

## What members get

- **An "Your picture" section in the page customizer**, alongthe same page where you already edit your name, mantra, and bio.
- Two ways to show up, in one place:
  - **Upload a photo** — pick from your phone or computer, see a preview, save. 5 MB cap, JPEG/PNG/WebP/GIF.
  - **Pick a woodland avatar** — the same 24 illustrations from the welcome flow, in a tidy grid, with the current one marked.
- **Remove photo** puts you back on your chosen creature — no dead ends.
- The new picture shows up immediately everywhere: top bar, your page, posts, replies, friends lists.

## Notes on tone and scope

- Copy stays plain: "Your picture", "Upload a photo", "Or pick a woodland friend", "Remove photo".
- No cropping tool in this pass. Images are displayed as circles and centered, which is what every other avatar surface already does. If you want a crop/zoom step, say so and I'll add it as a follow-up.
- No header/banner image changes in this pass.

## Technical outline

- **No migration, no edge function.** `profiles.avatar_url` and `profiles.default_avatar_key` are both member-writable (verified against the live database), and the `avatars` bucket is public with an owner-scoped `userId/...` upload path policy.
- New `src/components/profile/AvatarEditor.tsx`: file input plus the `defaultAvatars` grid from `src/lib/default-avatars.ts`. Uploads to `avatars/{user.id}/{timestamp}-{uuid}.{ext}`, reads back the public URL.
- New mutation in `src/hooks/usePageEditor.ts` (`useSaveAvatar`) writing `avatar_url` / `default_avatar_key`, invalidating `['page-profile']`, `['profile']`, and the boot-state query so the top bar refreshes without a reload.
- Mounted in `src/pages/PageCustomizer.tsx` as its own section, styled with existing tokens in `src/styles/customizer.css` — no new hardcoded colors.
- Validation mirrors the existing composer rules (size cap, MIME allow-list, friendly HEIC message); failures keep the current picture and show a toast.
- Tests: unit coverage for the file validation and storage path shape, matching how the media helpers are guarded today.
