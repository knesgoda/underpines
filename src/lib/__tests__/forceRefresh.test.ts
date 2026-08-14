import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const MARKER_KEY = 'up_force_refresh';

/**
 * Integration-style tests for the one-shot purge: they drive the real
 * runForceRefresh() against stubbed browser storage/cache/service-worker APIs
 * and assert every side effect a signed-in installed client depends on.
 */

type CacheStub = { keys: () => Promise<string[]>; delete: (n: string) => Promise<boolean> };

const setupEnv = () => {
  const deletedCaches: string[] = [];
  const unregistered: string[] = [];
  const deletedDbs: string[] = [];
  const replaced: string[] = [];

  localStorage.clear();
  sessionStorage.clear();

  const caches: CacheStub = {
    keys: async () => ['workbox-precache-v1', 'images'],
    delete: async (n: string) => {
      deletedCaches.push(n);
      return true;
    },
  };
  vi.stubGlobal('caches', caches);

  vi.stubGlobal('indexedDB', {
    deleteDatabase: (name: string) => {
      deletedDbs.push(name);
      return {} as IDBOpenDBRequest;
    },
  });

  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistrations: async () => [
        { unregister: async () => { unregistered.push('sw-1'); return true; } },
      ],
    },
  });

  const sessionClear = vi.spyOn(Storage.prototype, 'clear');

  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      href: 'https://underpines.com/messages?tab=1',
      replace: (url: string) => replaced.push(url),
    },
  });

  return { deletedCaches, unregistered, deletedDbs, replaced, sessionClear };
};

const load = async () => {
  vi.resetModules();
  return await import('../forceRefresh');
};

describe('forceRefresh purge', () => {
  let env: ReturnType<typeof setupEnv>;

  beforeEach(() => {
    env = setupEnv();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('runs once, marks the version, and reloads into the fresh build', async () => {
    const { runForceRefresh, FORCE_REFRESH_VERSION } = await load();

    expect(runForceRefresh()).toBe(true);
    expect(localStorage.getItem(MARKER_KEY)).toBe(FORCE_REFRESH_VERSION);

    // Let the async purge settle.
    await vi.waitFor(() => expect(env.replaced.length).toBe(1));

    const url = new URL(env.replaced[0]);
    expect(url.searchParams.get('_fr')).toBe(FORCE_REFRESH_VERSION);
    expect(url.pathname).toBe('/messages');
  });

  it('signs the user out by dropping every supabase auth token', async () => {
    localStorage.setItem('sb-dzwltzkakritkwrsikvb-auth-token', '{"access_token":"x"}');
    localStorage.setItem('sb-other-auth-token.1', 'chunk');
    localStorage.setItem('theme', 'dark');

    const { runForceRefresh } = await load();
    runForceRefresh();
    await vi.waitFor(() => expect(env.replaced.length).toBe(1));

    expect(localStorage.getItem('sb-dzwltzkakritkwrsikvb-auth-token')).toBeNull();
    expect(localStorage.getItem('sb-other-auth-token.1')).toBeNull();
    // Unrelated preferences survive.
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('clears cache storage, the service worker and the offline database', async () => {
    const { runForceRefresh } = await load();
    runForceRefresh();
    await vi.waitFor(() => expect(env.replaced.length).toBe(1));

    expect(env.deletedCaches).toEqual(['workbox-precache-v1', 'images']);
    expect(env.unregistered).toEqual(['sw-1']);
    expect(env.deletedDbs).toEqual(['under-pines']);
    expect(env.sessionClear).toHaveBeenCalled();
  });

  it('does not run again for the same version', async () => {
    const { runForceRefresh, FORCE_REFRESH_VERSION } = await load();
    localStorage.setItem(MARKER_KEY, FORCE_REFRESH_VERSION);

    expect(runForceRefresh()).toBe(false);
    expect(env.replaced).toEqual([]);
    expect(env.deletedCaches).toEqual([]);
  });

  it('runs again once the version is bumped', async () => {
    localStorage.setItem(MARKER_KEY, '1999-01-01-a');

    const { runForceRefresh, FORCE_REFRESH_VERSION } = await load();
    expect(runForceRefresh()).toBe(true);
    expect(localStorage.getItem(MARKER_KEY)).toBe(FORCE_REFRESH_VERSION);
    await vi.waitFor(() => expect(env.replaced.length).toBe(1));
  });

  it('still reloads when a purge step throws', async () => {
    vi.stubGlobal('caches', {
      keys: async () => {
        throw new Error('cache api blocked');
      },
      delete: async () => true,
    });

    const { runForceRefresh } = await load();
    expect(runForceRefresh()).toBe(true);
    await vi.waitFor(() => expect(env.replaced.length).toBe(1));
    expect(env.unregistered).toEqual(['sw-1']);
  });

  it('is inert when storage is unavailable (private browsing)', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    const { runForceRefresh } = await load();
    expect(runForceRefresh()).toBe(false);
    expect(env.replaced).toEqual([]);
    getItem.mockRestore();
  });

  it('does not loop when the marker cannot be written', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    const { runForceRefresh } = await load();
    expect(runForceRefresh()).toBe(false);
    expect(env.replaced).toEqual([]);
    setItem.mockRestore();
  });
});
