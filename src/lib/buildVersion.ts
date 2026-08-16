/**
 * Knowing when a publish has happened, without a service worker.
 *
 * The app-shell worker was retired (it was serving stale HTML), so nothing
 * tells an open tab that a new build is live. Vite fingerprints the entry
 * script, so the hashed filename in index.html IS the build id: fetch the
 * server's index.html uncached and compare its entry script to the one this
 * document booted with. Different filename means a new build is deployed.
 */

const ENTRY_SCRIPT = /<script[^>]+type="module"[^>]+src="([^"]+)"/i;

/** The hashed entry script this tab is running. Null in dev (unhashed src). */
export const currentBuildId = (): string | null => {
  if (typeof document === 'undefined') return null;
  const scripts = Array.from(document.querySelectorAll('script[type="module"][src]'));
  const src = scripts
    .map(s => s.getAttribute('src') ?? '')
    .find(src => /\/assets\/.+\.js$/.test(src));
  return src || null;
};

/** The entry script the server is handing out right now, or null if unknown. */
export const fetchLatestBuildId = async (signal?: AbortSignal): Promise<string | null> => {
  try {
    const res = await fetch(`/index.html?ping=${Date.now()}`, {
      cache: 'no-store',
      signal,
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;
    const html = await res.text();
    return ENTRY_SCRIPT.exec(html)?.[1] ?? null;
  } catch {
    // Offline, or the request was aborted. Try again on the next tick.
    return null;
  }
};

/**
 * Both ids must be real, hashed asset paths before we call it an update — a
 * dev server, an error page or a captive-portal response must never trigger
 * the banner.
 */
export const isNewBuild = (current: string | null, latest: string | null): boolean => {
  if (!current || !latest) return false;
  if (!/\/assets\/.+\.js$/.test(latest)) return false;
  return current.split('?')[0] !== latest.split('?')[0];
};
