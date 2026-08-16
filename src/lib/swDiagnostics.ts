import { logClientEvent } from '@/lib/clientLog';

/**
 * What the browser is actually running.
 *
 * The app-shell service worker was replaced with a kill-switch worker, so the
 * honest answer to "which version is active?" is usually "none, and that is
 * correct". This reports it either way, plus the Cache Storage buckets left
 * behind, so a stale client is recognisable instead of guessed at.
 */
export interface WorkerReport {
  supported: boolean;
  registrations: {
    scope: string;
    scriptUrl: string | null;
    state: 'installing' | 'waiting' | 'active' | 'none';
    controllingThisPage: boolean;
  }[];
  cacheNames: string[];
}

export const readWorkerReport = async (): Promise<WorkerReport> => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return { supported: false, registrations: [], cacheNames: [] };
  }

  let registrations: WorkerReport['registrations'] = [];
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    const controller = navigator.serviceWorker.controller;
    registrations = regs.map(reg => {
      const worker = reg.active ?? reg.waiting ?? reg.installing ?? null;
      const state: WorkerReport['registrations'][number]['state'] = reg.active
        ? 'active'
        : reg.waiting
          ? 'waiting'
          : reg.installing
            ? 'installing'
            : 'none';
      return {
        scope: reg.scope,
        scriptUrl: worker?.scriptURL ?? null,
        state,
        controllingThisPage: !!controller && !!worker && controller.scriptURL === worker.scriptURL,
      };
    });
  } catch {
    // Blocked (some private modes). Treated the same as "nothing registered".
  }

  let cacheNames: string[] = [];
  try {
    if ('caches' in window) cacheNames = await caches.keys();
  } catch { /* ignore */ }

  return { supported: true, registrations, cacheNames };
};

export interface PurgeResult {
  cachesDeleted: number;
  cachesFailed: number;
  workersUnregistered: number;
  workersFailed: number;
  ok: boolean;
}

/**
 * Clear Cache Storage and unregister every service worker, reporting exactly
 * what happened. Used by the troubleshooting panel; the caller decides whether
 * to reload afterwards.
 */
export const purgeCachesAndWorkers = async (): Promise<PurgeResult> => {
  let cachesDeleted = 0;
  let cachesFailed = 0;
  let workersUnregistered = 0;
  let workersFailed = 0;

  try {
    if ('caches' in window) {
      const names = await caches.keys();
      const results = await Promise.allSettled(names.map(n => caches.delete(n)));
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value) cachesDeleted += 1;
        else cachesFailed += 1;
      });
    }
  } catch {
    cachesFailed += 1;
  }

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      const results = await Promise.allSettled(regs.map(r => r.unregister()));
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value) workersUnregistered += 1;
        else workersFailed += 1;
      });
    }
  } catch {
    workersFailed += 1;
  }

  const result: PurgeResult = {
    cachesDeleted,
    cachesFailed,
    workersUnregistered,
    workersFailed,
    ok: cachesFailed === 0 && workersFailed === 0,
  };

  logClientEvent(
    'purge',
    `caches deleted ${cachesDeleted} (failed ${cachesFailed}), workers unregistered ${workersUnregistered} (failed ${workersFailed})`,
    result.ok ? 'info' : 'warn',
  );

  return result;
};
