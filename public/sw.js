// Kill-switch service worker.
//
// Under Pines used to ship a Workbox app-shell worker that precached
// index.html and served built assets CacheFirst. That meant published updates
// never reached installed clients: the old shell was answered from cache and
// pointed at old asset hashes. This replacement worker lives at the same path,
// so returning browsers pick it up on their next navigation, it evicts its own
// Workbox caches, reloads open windows onto the live build, and unregisters
// itself.
//
// Keep this file deployed for at least one release cycle — removing it strands
// anyone who has not come back yet.

// Cache Storage is origin-scoped; only delete the app SW's own Workbox caches
// so unrelated workers (push/messaging) keep theirs.
function isWorkboxCacheForThisRegistration(name) {
  const hasWorkboxBucket = /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name);
  return hasWorkboxBucket && name.endsWith(self.registration.scope);
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const workboxCacheNames = cacheNames.filter(isWorkboxCacheForThisRegistration);
        await Promise.allSettled(workboxCacheNames.map((name) => caches.delete(name)));
        await self.clients.claim();
        const windowClients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(windowClients.map((client) => client.navigate(client.url)));
      } finally {
        // activate fires once — unregister must run even if a step above throws,
        // or the old registration lives forever.
        await self.registration.unregister();
      }
    })(),
  ),
);
