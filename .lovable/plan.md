# Keyboard and screen-reader pass on the picture-editor shortcut

The picture on My Page opens the editor in a modal. The modal itself already traps focus, closes on Esc, and returns focus to the picture when it closes (Radix handles that). The gaps are on the shortcut and inside the editor.

## What changes

- **Visible focus on the picture.** Tabbing to your picture currently shows no reliable ring — the round button clips the browser default. It gets a clear focus ring in the paper palette, and the "Change" hint shows on keyboard focus as it does on hover.
- **Clearer announcement.** The picture button announces itself as opening a dialog, and says whose picture and what happens ("Change your picture — opens the picture editor"), with its open/closed state exposed.
- **Esc-to-close, stated.** Esc already closes; the modal gets a short line so keyboard users know, and Done stays the explicit close.
- **Woodland friend buttons** get real labels ("Choose Hedgehog") instead of relying on a tooltip, and the currently-chosen one reads as selected. Their decorative images stop repeating the label to screen readers.
- **Saving is announced.** The spinner state is currently silent; uploading/saving gets a polite live announcement so screen-reader users hear "Saving your picture…" and the confirmation.
- **Tap/focus target** on the picture and the friend tiles hold at least 44x44.

## Technical notes

- `src/components/profile/ProfileHeader.tsx`: add `aria-haspopup="dialog"`, `aria-expanded={editing}`, richer `aria-label` on `.avatar-edit-link`; add a hint line inside `DialogHeader` (part of `DialogDescription`) mentioning Esc; keep `Dialog`/`DialogContent` as-is so Radix keeps owning focus trap, Esc, and focus restore.
- `src/styles/profile.css`: `.avatar-edit-link:focus-visible` outline using `hsl(var(--ring))` with offset (drop the clipping by keeping the ring outside `overflow: hidden`), and `:focus-visible` reveals `.avatar-edit-hint`.
- `src/components/profile/AvatarEditor.tsx`: `aria-label={`Choose ${label}`}` on each creature button, `alt=""` + `aria-hidden` on its image, `aria-pressed` retained; add an `aria-live="polite"` status region reflecting upload/save state; ensure the visually hidden file input stays reachable only via the labeled button (unchanged behavior).
- `src/styles/handoff-shell.css` (where the avatar-editor styles now live): min tap sizes and `:focus-visible` rings for the creature tiles.
- Verification: typecheck, vitest, and a Playwright keyboard pass on My Page (Tab to picture, Enter opens, Tab through editor, Esc closes, focus back on the picture) with a screenshot of the focus ring.
