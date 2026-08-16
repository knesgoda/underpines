# Change your picture without leaving the page

Tapping your picture on My Page currently navigates to `/me/edit#your-picture`,
which means losing your place and needing to come back. Instead, the same picture
editor opens in a themed modal right on the page.

## What changes

- Your picture on My Page becomes a button (not a link) that opens a modal titled
  "Your picture". The "Change" hover hint stays as it is today.
- The modal contains exactly the editor that already exists: current picture,
  Upload a photo, Remove photo (when you have one), and the grid of 24 woodland
  friends. Choices still save immediately, so the top bar and the page picture
  update behind the modal.
- Close with the X, Escape, or tapping outside. After a successful save the modal
  stays open so you can keep trying pictures, and a "Done" button closes it.
- On a phone the modal fills the width with the woodland grid scrollable inside it,
  so the whole thing fits without pushing the page around.
- `/me/edit` keeps its "Your picture" section unchanged, so nothing that links
  there breaks.

## Technical notes

- `AvatarEditor` gains a presentation prop (e.g. `chrome="panel" | "bare"`) so the
  same component renders as today's `panel module` section in the customizer and
  without the outer panel/heading inside the dialog. No logic or save behavior
  changes; `useSaveAvatar` stays the single write path.
- The modal uses the existing shadcn `Dialog` primitives (themed dialog, per
  project rule — never a native one) with a real `DialogTitle` and description so
  the accessibility warnings already seen in tests aren't repeated.
- `ProfileHeader` owns the open state and renders the dialog only when `isOwner`,
  so other people's pages are untouched; the owner path keeps the `avatar-edit-link`
  styling, moved onto a `<button>` in `src/styles/profile.css`.
- Verification: typecheck, existing vitest suite (the `AvatarEditor` validation
  tests still apply unchanged), build, and a signed-out route sweep. Actually
  saving a picture needs your eyeball since the sandbox can't reach the backend.
