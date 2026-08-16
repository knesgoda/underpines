# Publish propagation test checklist

Goal: prove that a Lovable publish reaches every surface — installed PWA
(iOS + Android), Chrome mobile web, desktop Chrome, and desktop/iOS Safari —
without a manual cache wipe.

Reference tools shipped in the app:
- `/settings/troubleshooting` — running build vs. server build, service worker
  state, cache buckets, last purge report, copyable event log.
- Update banner — appears when the poller sees a newer build; "Reload" applies it.

---

## 0. Before you publish (baseline, ~2 min)

Do this on each device you plan to test, BEFORE publishing.

1. Open the app, go to `/settings/troubleshooting`.
2. Record **Running build** and **Server build** (they should match).
3. Record **Service worker**: script URL, state, "controls this page" yes/no.
   - Expected on the current architecture: either no worker, or the kill-switch
     worker at `/sw.js` that unregisters itself. A Workbox/precache worker that
     still controls the page is a finding — note it.
4. Record cache bucket names (expect none, or only non-app buckets such as
   Firebase Messaging).
5. Copy the event log into your notes.

Baseline table to fill in:

```text
Device / surface        Running build   Server build   SW state       Caches
iOS installed PWA
Android installed PWA
Chrome mobile (tab)
Chrome desktop
Safari desktop
Safari iOS (tab)
```

---

## 1. Publish

1. Make one visible, unmistakable change (e.g. a temporary version string in the
   footer or the topbar) so propagation is verifiable by eye, not just by build id.
2. Publish from Lovable.
3. Note the publish time (UTC) and the new build id from any already-open
   `/settings/troubleshooting` tab after it refreshes its server build.

Do not clear anything anywhere yet. The whole point is to observe the
unassisted path.

---

## 2. Per-surface test

Run each surface independently. Never clear caches before the checks — clearing
is the last step and it is a diagnosis, not a pass.

### 2a. Installed PWA — iOS (Safari engine, Home Screen icon)

1. App is backgrounded, not force-quit. Foreground it.
   - [ ] Update banner appears within ~60s, OR the change is already visible.
2. Tap Reload on the banner.
   - [ ] Change visible.
   - [ ] `/settings/troubleshooting`: Running build == Server build.
3. Force-quit and relaunch twice.
   - [ ] Change persists on both launches (no flip back to the old build).
4. If step 1–2 failed: relaunch once more, then check troubleshooting.
   - [ ] Note whether a service worker controls the page and which caches exist.

### 2b. Installed PWA — Android (Chrome engine)

1. Foreground the installed app.
   - [ ] Banner appears or change is visible.
2. Reload via banner.
   - [ ] Change visible; builds match.
3. Swipe the app away, relaunch.
   - [ ] Change persists.

### 2c. Chrome mobile web (browser tab, not installed)

1. Return to an existing open tab (do not hard-refresh).
   - [ ] Banner appears or change visible.
2. Pull-to-refresh once.
   - [ ] Change visible; builds match.
3. Open a fresh tab to the site.
   - [ ] Change visible immediately.

### 2d. Chrome desktop

1. Existing tab, leave it idle 60s.
   - [ ] Banner appears.
2. Click Reload in the banner (not the browser button).
   - [ ] Change visible; builds match.
3. Normal browser reload (F5, no hard reload).
   - [ ] Change persists.
4. DevTools > Application > Service Workers.
   - [ ] No app-shell worker in "activated and running" controlling the page.
   - [ ] Cache Storage has no app precache buckets.

### 2e. Safari desktop

1. Existing tab: reload once (Cmd+R, not Cmd+Shift+R).
   - [ ] Change visible; builds match.
2. New tab to the site.
   - [ ] Change visible.

### 2f. Safari iOS (browser tab)

1. Reopen the tab from the tab switcher.
   - [ ] Banner appears or change visible after one reload.

---

## 3. Cold-visitor control

On one device, use a private/incognito window (no prior state):

- [ ] Change visible on first load.
- [ ] `/settings/troubleshooting` shows matching builds.

If this fails, the problem is hosting/CDN, not the client — stop and check the
published build rather than debugging caches.

---

## 4. If a surface fails

In order, recording results at each step:

1. `/settings/troubleshooting` > **Check for new version**.
   - [ ] Does it detect a newer server build? (If no: hosting/CDN issue.)
2. `/settings/troubleshooting` > **Clear caches and workers**.
   - [ ] Purge report lists deleted buckets/workers with no failures.
   - [ ] After the automatic reload, builds match and the change is visible.
3. Still stale on an installed iOS app: delete the Home Screen icon, re-add,
   relaunch.
   - [ ] Change visible. (Note this — it means a stale registration survived,
     which is a bug, not an acceptable outcome.)
4. Copy the event log from the troubleshooting page and paste it into the report.

---

## 5. Pass criteria

A publish is considered propagating correctly when, with no manual clearing:

- Every surface shows the change after at most one user-initiated reload.
- Running build == Server build on every surface.
- No app-shell service worker controls any page, and no app precache buckets
  remain in Cache Storage.
- Cold-visitor control passes on first load.
- Installed apps keep the new build across two relaunches.

Anything requiring step 4.2 or 4.3 is a FAIL for that surface; record the
device, OS version, browser version, both build ids, SW state, cache buckets
and the event log.

---

## 6. Report template

```text
Publish time (UTC):
New build id:
Marker change used:

Surface | OS/browser ver | Banner? | Visible after 1 reload? | Builds match? | SW/caches | Result
iOS PWA
Android PWA
Chrome mobile
Chrome desktop
Safari desktop
Safari iOS
Incognito control

Failures + event logs:
```

Cadence: run sections 0–2 on every publish that touches `index.html`, the
service worker, the manifest, or `src/lib/forceRefresh.ts`; run the full sheet
including 3–5 once per release week.
