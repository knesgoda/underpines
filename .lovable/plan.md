# Clear way back from the picture editor to my page

Right now the editor page ("Edit my page") only has a small unlabeled arrow icon in the corner, and it fires a raw history step — so if you landed there from Settings, a friends module, or a fresh tab, "back" can take you somewhere unexpected and always drops you at the top of the page.

## What changes

- Replace the bare arrow with a labeled link: **"← Back to my page"**, placed above the "Edit my page" heading so it reads as a clear exit.
- The link returns you to the exact spot you left: when you arrived from a page on the site, it steps back in history and restores your previous scroll position; otherwise it goes to My Page.
- The links that lead into the editor (Settings > Edit my page, the "Edit my page" button on My Page, the friends module prompt) record where you were, so the return trip is accurate.
- Saving the page keeps its current behavior (returns to My Page) — no functional change to the editor itself.

## Technical notes

- `src/pages/PageCustomizer.tsx`: swap the icon-only `navigate(-1)` button for a labeled back control that reads a `from` route/scroll offset passed through router `state`; fall back to `/me` when there is no origin (direct link, refresh).
- Entry points get `state={{ from: pathname, scrollY: window.scrollY }}`: `src/pages/SettingsPage.tsx`, `src/components/profile/AtAGlance.tsx`, `src/components/profile/FriendsModule.tsx`.
- Restore scroll after navigating back by stashing the offset (sessionStorage, keyed per origin path) and applying it once on return; `ScrollToTop` already skips POP navigations, so nothing fights it.
- Styling uses the existing `.paper-button` / muted-link tokens in the customizer stylesheet — no new colors.
