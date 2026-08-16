# Fix "publishing changes nothing for anyone"

## What I verified first

The live site is **not** stale. Checked just now against www.underpines.com:

- `index.html` is served with `cache-control: no-cache, must-revalidate` (no CDN staleness).
- The deployed bundle contains today's work — the live `PageCustomizer` chunk has
  "Your picture", "Remove photo", the woodland avatar picker, and the live `MyPage`
  chunk has the `your-picture` avatar shortcut added this morning.

So publishing works. What people see is their **own browser's service worker**
still serving the old app.

## Why nobody updates

1. The Workbox service worker precaches `index.html`, so navigations are answered
   from the cache, not the network. The old shell keeps pointing at old asset
   hashes, which are themselves cached `CacheFirst`. A refresh — even a hard one —
   changes nothing.
2. The only escape hatch is the "A new version is ready / Update now" banner
   (`UpdatePrompt`). Because that component consumes the `needRefresh` flag and
   waits for a tap, the automatic reload that `registerType: "autoUpdate"` would
   normally do never fires. The banner is also lazy-mounted and easy to miss, and
   dismissing it means never updating.
3. The one-shot purge in `src/lib/forceRefresh.ts` can't rescue anyone: it lives
   inside the bundle those clients never download. Bumping its version only
   affects people who are already up to date.
4. Separately, `index.html` has no `<link rel="manifest">` at all (the plugin is
   configured with `manifest: false` and nothing links `public/manifest.json`),
   so installed-app metadata is whatever the browser guessed at install time.

## The fix

Follow the PWA skill's cleanup path for an existing broken PWA, then keep the app
on manifest-only installability.

1. **Ship a kill-switch service worker at the same path (`/sw.js`).** On activate
   it deletes only its own Workbox caches, re-navigates open windows, and
   unregisters itself in a `finally` block. Returning browsers check `/sw.js` on
   their next navigation, take the replacement, drop the stale shell, and land on
   the current build. This is the piece that actually reaches phones and desktops.
2. **Remove the app-shell service worker machinery** so nothing re-registers a
   caching worker: drop `VitePWA` from `vite.config.ts`, delete
   `src/components/pwa/UpdatePrompt.tsx` and its mount in `AppLayout`, and remove
   the `virtual:pwa-register` type shim. Home-screen install, the install prompt,
   and the offline banner stay.
3. **Keep installability correct**: add `<link rel="manifest" href="/manifest.json">`
   to `index.html` (theme-color and apple-touch-icon are already there).
4. **Bump `FORCE_REFRESH_VERSION`** once, as a belt-and-braces purge for clients
   that reach the new bundle with leftover caches or a stale session.
5. Keep the kill-switch worker deployed for at least one release cycle — deleting
   it too early strands anyone who hasn't come back yet.

## Trade-off worth naming

This removes offline support (the cached app shell). Given that stale caching is
currently blocking every publish from reaching anyone, that's the right call now.
Once the fleet is clean, offline can be rebuilt properly with `vite-plugin-pwa`
under the skill's guarded rules (`NetworkFirst` for HTML, no registration in
preview/dev, `?sw=off` kill switch).

## What you'll see afterwards

Publish, then open the installed PWA (may take two launches: one to pick up the
replacement worker, one to load the fresh shell) and mobile/desktop Chrome. Each
should land on the new build without any banner tap. After that, every publish
takes effect on a normal reload.
