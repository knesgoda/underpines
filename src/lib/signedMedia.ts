import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * The `post-media` bucket is private. Everything stored in it — post images,
 * ember media, campfire photos, collection covers, newsletter images — has to
 * be read through a short-lived signed URL.
 *
 * Historically we stored the *public* URL in the database, so this module
 * accepts either shape: a legacy `/object/public/post-media/<path>` URL or a
 * bare object path. That means no data migration is needed.
 */

const BUCKET = 'post-media';
const PUBLIC_MARKER = `/object/public/${BUCKET}/`;
const SIGNED_MARKER = `/object/sign/${BUCKET}/`;
const TTL_SECONDS = 3600;
// Re-sign a little before the real expiry so a long-lived tab never shows a 400.
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

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

const cache = new Map<string, { url: string; expiresAt: number }>();
const inflight = new Map<string, Promise<string | null>>();

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
  if (path) cache.delete(path);
};


export const getSignedMediaUrl = async (path: string): Promise<string | null> => {
  const hit = cache.get(path);
  if (hit && hit.expiresAt > Date.now() + REFRESH_MARGIN_MS) return hit.url;

  const pending = inflight.get(path);
  if (pending) return pending;

  const request = (async () => {
    try {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, TTL_SECONDS);
      if (error || !data?.signedUrl) return null;
      cache.set(path, { url: data.signedUrl, expiresAt: Date.now() + TTL_SECONDS * 1000 });
      return data.signedUrl;
    } catch {
      return null;
    } finally {
      inflight.delete(path);
    }
  })();

  inflight.set(path, request);
  return request;
};

export interface SignedMedia {
  url: string | null;
  loading: boolean;
  failed: boolean;
  /** Drop the cached signature and mint a fresh one (used after a 403 on the media itself). */
  retry: () => void;
}

type SignedMediaState = Omit<SignedMedia, 'retry'>;

/**
 * Resolve a stored post-media reference to a usable src.
 * Non-post-media values (external URLs, blob previews) pass straight through.
 */
export const useSignedMediaUrl = (input: string | null | undefined): SignedMedia => {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<SignedMediaState>(() => {
    if (!input) return { url: null, loading: false, failed: false };
    if (isAlreadySigned(input)) return { url: input, loading: false, failed: false };
    const path = extractPostMediaPath(input);
    if (!path) return { url: input, loading: false, failed: false };
    const hit = cache.get(path);
    if (hit && hit.expiresAt > Date.now() + REFRESH_MARGIN_MS) {
      return { url: hit.url, loading: false, failed: false };
    }
    return { url: null, loading: true, failed: false };
  });

  useEffect(() => {
    if (!input) { setState({ url: null, loading: false, failed: false }); return; }
    if (isAlreadySigned(input)) { setState({ url: input, loading: false, failed: false }); return; }

    const path = extractPostMediaPath(input);
    if (!path) { setState({ url: input, loading: false, failed: false }); return; }

    const hit = cache.get(path);
    if (hit && hit.expiresAt > Date.now() + REFRESH_MARGIN_MS) {
      setState({ url: hit.url, loading: false, failed: false });
      return;
    }

    let alive = true;
    setState({ url: null, loading: true, failed: false });
    getSignedMediaUrl(path).then((url) => {
      if (!alive) return;
      setState({ url, loading: false, failed: !url });
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

  const retry = useCallback(() => {
    invalidateSignedMediaUrl(input);
    setAttempt((n) => n + 1);
  }, [input]);

  return { ...state, retry };
};

