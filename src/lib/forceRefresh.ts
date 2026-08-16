/**
 * One-shot cache purge + forced sign-out.
 *
 * Installed clients (especially the iOS PWA) can hold on to an old service
 * worker, old asset caches and an old session long after a publish. Bumping
 * FORCE_REFRESH_VERSION makes every browser, exactly once, drop its caches,
 * unregister the service worker, clear the local Supabase session and reload
 * into the current build.
 *
 * Bump this string (date-stamped) whenever everyone needs to be pushed onto a
 * fresh build and re-authenticated.
 */
export const FORCE_REFRESH_VERSION = '2026-08-16-a';

const MARKER_KEY = 'up_force_refresh';
const REPORT_KEY = 'up_force_refresh_report';

export interface ForceRefreshReport {
  version: string;
  startedAt: string;
  cachesDeleted: number;
  cachesFailed: number;
  workersUnregistered: number;
  workersFailed: number;
  /** Set on the boot that follows the reload — proof the reload landed. */
  reloadedAt?: string;
}

/** The last purge attempt, for the troubleshooting panel. */
export const readForceRefreshReport = (): ForceRefreshReport | null => {
  try {
    const raw = localStorage.getItem(REPORT_KEY);
    return raw ? (JSON.parse(raw) as ForceRefreshReport) : null;
  } catch {
    return null;
  }
};

const writeReport = (report: ForceRefreshReport) => {
  try { localStorage.setItem(REPORT_KEY, JSON.stringify(report)); } catch { /* ignore */ }
};

/**
 * Returns true when the page is about to reload — the caller should skip
 * rendering so the stale bundle never paints.
 */
export const runForceRefresh = (): boolean => {
  if (typeof window === 'undefined') return false;

  let done: string | null = null;
  try {
    done = localStorage.getItem(MARKER_KEY);
  } catch {
    // Storage disabled (private browsing). Nothing to purge, nothing to loop on.
    return false;
  }
  if (done === FORCE_REFRESH_VERSION) {
    confirmReload();
    return false;
  }

  // Write the marker first: if any step below throws, the reload still
  // happens only once.
  try {
    localStorage.setItem(MARKER_KEY, FORCE_REFRESH_VERSION);
  } catch {
    return false;
  }

  logClientEvent('force-refresh', `starting purge for ${FORCE_REFRESH_VERSION}`);
  void purgeAndReload();
  return true;
};

/**
 * On the boot after a purge, stamp the report so the panel can say the reload
 * succeeded rather than just that it was attempted.
 */
const confirmReload = () => {
  const report = readForceRefreshReport();
  if (!report || report.version !== FORCE_REFRESH_VERSION || report.reloadedAt) return;
  writeReport({ ...report, reloadedAt: new Date().toISOString() });
  logClientEvent(
    'force-refresh',
    `reload after purge ${FORCE_REFRESH_VERSION} completed (caches deleted ${report.cachesDeleted}, workers unregistered ${report.workersUnregistered})`,
    report.cachesFailed || report.workersFailed ? 'warn' : 'info',
  );
};


const purgeAndReload = async () => {
  // 1. Sign out: drop the persisted Supabase session (key is project-scoped,
  //    so match by prefix rather than importing the client).
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.includes('auth-token')) keys.push(key);
    }
    keys.forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }

  // 2. Session-scoped caches (signed media signatures live here).
  try { sessionStorage.clear(); } catch { /* ignore */ }

  // 3. Offline data cache.
  try {
    if ('indexedDB' in window) indexedDB.deleteDatabase('under-pines');
  } catch { /* ignore */ }

  // 4. Service worker + Cache Storage.
  try {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n)));
    }
  } catch { /* ignore */ }

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
  } catch { /* ignore */ }

  // 5. Reload into the fresh build, bypassing any HTTP cache for the shell.
  const url = new URL(window.location.href);
  url.searchParams.set('_fr', FORCE_REFRESH_VERSION);
  window.location.replace(url.toString());
};
