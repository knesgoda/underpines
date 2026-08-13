import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logMediaFailure } from '@/lib/mediaTelemetry';


/**
 * The `post-media` bucket is private. Everything stored in it — post images,
 * ember media, campfire photos, collection covers, newsletter images — has to
 * be read through a short-lived signed URL.
 *
 * Historically we stored the *public* URL in the database, so this module
 * accepts either shape: a legacy `/object/public/post-media/<path>` URL or a
 * bare object path. That means no data migration is needed.
 *
 * Two things keep the signing round trips off the critical path:
 *  - a screen that already knows every image it is about to render calls
 *    `primeSignedMediaUrls` once, and all of them are signed in ONE request
 *    instead of one request per <img>
 *  - signatures persist in sessionStorage, so a reload inside the TTL paints
 *    images without re-signing anything
 */

const BUCKET = 'post-media';
const PUBLIC_MARKER = `/object/public/${BUCKET}/`;
const SIGNED_MARKER = `/object/sign/${BUCKET}/`;
const TTL_SECONDS = 3600;
// Re-sign a little before the real expiry so a long-lived tab never shows a 400.
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
const STORAGE_KEY = 'underpines-signed-media';

/** Pull the storage object path out of whatever we were handed. */
export const extractPostMediaPath = (input: string | null | undefined): string | null => {
  if (!input) return null;

  const publicAt = input.indexOf(PUBLIC_MARKER);
  if (publicAt !== -1) {
    return decodeURIComponent(input.slice(publicAt + PUBLIC_MARKER.length).split('?')[0]);
  }

  // Some other host (an external image, a blob: preview) — not ours to sign.
  if (/^(https?:|blob:|data:)/i.test(input)) return null;

  return input.replace(/^\/+/, '');
};

/** True when the URL is already a signed post-media URL we can use as-is. */
const isAlreadySigned = (input: string) => input.includes(SIGNED_MARKER);

type CacheEntry = { url: string; expiresAt: number };

/**
 * Session-scoped, not local: a signed URL is a bearer capability, so it lives
 * no longer than the tab. The browser's HTTP cache holds the images themselves.
 */
const readPersisted = (): Map<string, CacheEntry> => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const now = Date.now();
    const entries = (JSON.parse(raw) as [string, CacheEntry][]).filter(
      ([path, entry]) =>
        typeof path === 'string' &&
        typeof entry?.url === 'string' &&
        typeof entry?.expiresAt === 'number' &&
        entry.expiresAt > now + REFRESH_MARGIN_MS,
    );
    return new Map(entries);
  } catch {
    return new Map();
  }
};

const cache = readPersisted();
const inflight = new Map<string, Promise<string | null>>();

const persist = () => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...cache]));
  } catch {
    // Storage full or disabled — the in-memory cache still works.
  }
};

const freshHit = (path: string): CacheEntry | null => {
  const hit = cache.get(path);
  return hit && hit.expiresAt > Date.now() + REFRESH_MARGIN_MS ? hit : null;
};

/**
 * Forget the cached signature for a stored reference.
 *
 * A signature can be minted successfully and still be refused by Storage later —
 * the clock ran past the expiry, or the viewer's access changed mid-session — in
 * which case the browser reports a 403 on the <img> itself. Dropping the cache
 * entry lets the next read mint a fresh signature instead of replaying a dead one.
 */
export const invalidateSignedMediaUrl = (input: string | null | undefined) => {
  const path = extractPostMediaPath(input);
  if (path) {
    cache.delete(path);
    persist();
  }
};

/**
 * Re-sign budget.
 *
 * A 403 on the media itself is usually a lapsed signature (re-signing fixes it)
 * but it can equally be a permanent "you may not see this" — and those two look
 * identical from the browser. So automatic re-signs are capped and spaced out:
 * at most MAX_RESIGN_ATTEMPTS per object path, with exponential backoff, after
 * which the object is considered unavailable until the viewer asks explicitly.
 * The ledger is per path and module-scoped, so remounting a component (scrolling
 * an image out of the feed and back) cannot buy a fresh budget.
 */
export const MAX_RESIGN_ATTEMPTS = 3;

const BASE_RESIGN_DELAY_MS = 500;
const MAX_RESIGN_DELAY_MS = 8000;
/** Forget the ledger for a path once it has been quiet this long. */
const RESIGN_LEDGER_TTL_MS = 5 * 60 * 1000;

const resignAttempts = new Map<string, { count: number; lastAt: number }>();

export const resignBackoffDelay = (attempt: number) =>
  Math.min(BASE_RESIGN_DELAY_MS * 2 ** Math.max(0, attempt - 1), MAX_RESIGN_DELAY_MS);

/**
 * Claim one automatic re-sign for this reference.
 * Returns the delay to wait before re-signing, or null when the budget is spent.
 */
export const claimSignedMediaResign = (input: string | null | undefined): number | null => {
  const path = extractPostMediaPath(input);
  if (!path) return null;

  const now = Date.now();
  const prior = resignAttempts.get(path);
  const count = prior && now - prior.lastAt < RESIGN_LEDGER_TTL_MS ? prior.count : 0;
  if (count >= MAX_RESIGN_ATTEMPTS) return null;

  resignAttempts.set(path, { count: count + 1, lastAt: now });
  return resignBackoffDelay(count + 1);
};

/** Give a reference a clean re-sign budget (a person pressed "Try again"). */
export const resetSignedMediaResigns = (input: string | null | undefined) => {
  const path = extractPostMediaPath(input);
  if (path) resignAttempts.delete(path);
};



export const getSignedMediaUrl = async (path: string): Promise<string | null> => {
  const hit = freshHit(path);
  if (hit) return hit.url;

  const pending = inflight.get(path);
  if (pending) return pending;

  const request = (async () => {
    try {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, TTL_SECONDS);
      if (error || !data?.signedUrl) {
        logMediaFailure(path, 'sign_failed');
        return null;
      }
      cache.set(path, { url: data.signedUrl, expiresAt: Date.now() + TTL_SECONDS * 1000 });
      persist();
      return data.signedUrl;
    } catch {
      logMediaFailure(path, 'sign_failed');
      return null;
    } finally {
      inflight.delete(path);
    }
  })();


  inflight.set(path, request);
  return request;
};

/**
 * Sign a whole screenful of media in one storage request.
 *
 * Call this the moment a query returns rows that carry media references — the
 * per-path promises are registered synchronously, so every <MediaImage> that
 * mounts afterwards joins the batch instead of firing its own request. Fire and
 * forget; failures degrade to the per-image path.
 */
export const primeSignedMediaUrls = (inputs: (string | null | undefined)[]) => {
  const paths = [...new Set(inputs.map(extractPostMediaPath).filter((p): p is string => !!p))]
    .filter(path => !freshHit(path) && !inflight.has(path));
  if (paths.length === 0) return;

  const batch = (async (): Promise<Map<string, string>> => {
    try {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, TTL_SECONDS);
      if (error || !data) return new Map();
      const expiresAt = Date.now() + TTL_SECONDS * 1000;
      const byPath = new Map<string, string>();
      for (const row of data) {
        if (row.path && row.signedUrl && !row.error) {
          byPath.set(row.path, row.signedUrl);
          cache.set(row.path, { url: row.signedUrl, expiresAt });
        }
      }
      if (byPath.size > 0) persist();
      return byPath;
    } catch {
      return new Map();
    }
  })();

  for (const path of paths) {
    inflight.set(
      path,
      batch
        .then(byPath => byPath.get(path) ?? null)
        .finally(() => inflight.delete(path)),
    );
  }
};

export interface SignedMedia {
  url: string | null;
  loading: boolean;
  failed: boolean;
  /**
   * True from the moment a re-sign is claimed (manually or automatically) until
   * the next signature resolves — including the backoff wait. Callers use it to
   * show a loading state and to keep "Try again" inert until the attempt lands.
   */
  resigning: boolean;
  /** Manual retry: clears the re-sign budget and mints a fresh signature now. */
  retry: () => void;
  /**
   * Automatic retry after a 403 on the media itself. Waits an exponentially
   * growing delay and re-signs; returns false when the budget is spent, which
   * is the caller's cue to show the unavailable state instead of looping.
   */
  resign: () => boolean;
}

type SignedMediaState = Omit<SignedMedia, 'retry' | 'resign' | 'resigning'>;



/**
 * Resolve a stored post-media reference to a usable src.
 * Non-post-media values (external URLs, blob previews) pass straight through.
 */
export const useSignedMediaUrl = (input: string | null | undefined): SignedMedia => {
  const [attempt, setAttempt] = useState(0);
  // True while a re-sign is pending: covers the backoff wait AND the request.
  const [resigning, setResigning] = useState(false);
  const [state, setState] = useState<SignedMediaState>(() => {
    if (!input) return { url: null, loading: false, failed: false };
    if (isAlreadySigned(input)) return { url: input, loading: false, failed: false };
    const path = extractPostMediaPath(input);
    if (!path) return { url: input, loading: false, failed: false };
    const hit = freshHit(path);
    if (hit) return { url: hit.url, loading: false, failed: false };
    return { url: null, loading: true, failed: false };
  });

  useEffect(() => {
    if (!input) { setState({ url: null, loading: false, failed: false }); setResigning(false); return; }
    if (isAlreadySigned(input)) { setState({ url: input, loading: false, failed: false }); setResigning(false); return; }

    const path = extractPostMediaPath(input);
    if (!path) { setState({ url: input, loading: false, failed: false }); setResigning(false); return; }

    const hit = freshHit(path);
    if (hit) {
      setState({ url: hit.url, loading: false, failed: false });
      setResigning(false);
      return;
    }

    let alive = true;
    setState({ url: null, loading: true, failed: false });
    getSignedMediaUrl(path).then((url) => {
      if (!alive) return;
      setState({ url, loading: false, failed: !url });
      // The attempt has landed — whatever its outcome, we're no longer waiting.
      setResigning(false);
    });

    // Refresh shortly before the signature lapses so long sessions keep working.
    const timer = window.setTimeout(() => {
      cache.delete(path);
      if (alive) getSignedMediaUrl(path).then((url) => {
        if (alive && url) setState({ url, loading: false, failed: false });
      });
    }, TTL_SECONDS * 1000 - REFRESH_MARGIN_MS);

    return () => { alive = false; window.clearTimeout(timer); };
  }, [input, attempt]);

  const backoffTimer = useRef<number | null>(null);

  // Any pending backoff belongs to the previous reference; drop it.
  useEffect(() => () => {
    if (backoffTimer.current !== null) window.clearTimeout(backoffTimer.current);
  }, [input]);

  const retry = useCallback(() => {
    if (backoffTimer.current !== null) {
      window.clearTimeout(backoffTimer.current);
      backoffTimer.current = null;
    }
    resetSignedMediaResigns(input);
    invalidateSignedMediaUrl(input);
    setResigning(true);
    setAttempt((n) => n + 1);
  }, [input]);

  const resign = useCallback(() => {
    // A backoff is already in flight — don't stack another.
    if (backoffTimer.current !== null) return true;

    const delay = claimSignedMediaResign(input);
    if (delay === null) return false;

    setResigning(true);
    backoffTimer.current = window.setTimeout(() => {
      backoffTimer.current = null;
      invalidateSignedMediaUrl(input);
      setAttempt((n) => n + 1);
    }, delay);
    return true;
  }, [input]);

  return { ...state, resigning, retry, resign };
};


