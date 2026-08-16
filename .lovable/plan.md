# Crop and rotate your photo before it becomes your picture

Right now an uploaded photo is sent up exactly as it came off the camera, and the
page just shows a circle of the middle of it. This adds a small step between
choosing a file and saving it: frame the photo in the circle, and turn it if it
came in sideways.

## What you'll see

1. In the picture editor (both the modal on My Page and the section on Edit my page),
   tap "Upload a photo" and pick a file.
2. A framing step appears with your photo in a round window:
   - Drag to move it, pinch or use the zoom slider to scale.
   - "Turn left" / "Turn right" buttons rotate in 90-degree steps, so a sideways
     phone photo can be set upright.
   - "Reset" puts position, zoom and rotation back to the start.
3. "Use this photo" uploads only the framed square; "Cancel" throws it away and
   leaves your current picture alone. The existing 5MB / JPEG-PNG-GIF-WebP check
   still runs before the framing step, with the same friendly messages.
4. After saving, the picture updates everywhere immediately as it does today.

Sizing and behavior on a phone: the framing window fills the width, controls sit
below it, and the whole step lives inside the same themed modal — no native
dialogs, no page navigation.

## Technical notes

- The project already depends on `react-easy-crop`, and `src/components/cabin/AvatarCropModal.tsx`
  already implements drag + zoom cropping for the (currently flag-disabled) cabin
  avatar. That component moves to `src/components/profile/AvatarCropModal.tsx` as
  the single shared crop step; the cabin import is repointed so nothing breaks.
- Additions to it: a `rotation` state passed to `Cropper`, turn-left/turn-right and
  reset controls, and a rotation-aware canvas export (draw onto a rotated offscreen
  canvas, then take the crop rectangle) so the saved pixels match what the circle
  showed. Output becomes a 512x512 JPEG at ~0.9 quality instead of PNG — photos get
  much smaller, which also helps first paint.
- Its styling is reworked onto semantic tokens (it currently hardcodes black/white)
  and it renders through the existing `Dialog` primitives with a real title, so it
  behaves like the rest of the app's modals.
- `AvatarEditor` gains a small amount of state: the chosen file becomes an object
  URL, the crop step opens, and its resulting `Blob` goes into the existing
  `supabase.storage.from('avatars').upload(...)` call at the same owner-scoped path
  (extension `.jpg`, `contentType: image/jpeg`). Object URLs are revoked on close.
  `useSaveAvatar` remains the only write path; no backend, storage-policy or schema
  change is needed.
- Tests: extend `AvatarEditor.test.ts` with pure-helper coverage for the rotation
  math (rotation normalizes to 0/90/180/270; output dimensions stay square) alongside
  the existing file-validation tests. Then typecheck, vitest, build, and a signed-out
  route sweep. Actually uploading a cropped photo is your eyeball, since the sandbox
  can't reach the backend.
