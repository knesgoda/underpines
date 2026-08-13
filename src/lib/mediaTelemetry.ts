import { supabase } from '@/integrations/supabase/client';

/**
 * Diagnostics for private post-media reads.
 *
 * Signed URLs are bearer capabilities: the query string IS the credential.
 * Object paths start with the owner's user id, so they are PII-adjacent too.
 * So nothing here ever logs a URL, a token, or a full path — only a redacted
 * reference that is stable enough to correlate reports:
 *
 *   post-media/u:1a2b/posts/<8-char digest>.jpg
 *
 * Same input always yields the same digest, so "these ten failures are all the
 * same object" is answerable, while the value cannot be turned back into a
 * readable path or a working URL.
 */

export type MediaFailureReason =
  /** Storage refused to mint a signature (no access, or the object is gone). */
  | 'sign_failed'
  /** A signature was minted but Storage answered 403/expired on the fetch. */
  | 'fetch_forbidden'
  /** Automatic re-sign budget exhausted; the viewer now sees the fallback card. */
  | 'gave_up';

export interface MediaFailureEvent {
  reason: MediaFailureReason;
  /** Redacted object reference — never a URL, never a token. */
  ref: string;
  /** How many automatic re-signs had been spent when this happened. */
  attempt: number;
  kind: 'photo' | 'video';
}

/** Non-cryptographic, stable, short. Enough to group; not enough to reverse. */
const digest = (value: string): string => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
};

const SIGNED_QUERY = /[?#].*$/;

/**
 * Reduce anything we might be handed (bare path, public URL, signed URL) to a
 * loggable reference. Tokens and query strings are dropped before hashing.
 */
export const redactMediaRef = (input: string | null | undefined): string => {
  if (!input) return 'post-media/<none>';

  const withoutQuery = String(input).replace(SIGNED_QUERY, '');
  const path = withoutQuery.split('/post-media/').pop()!.replace(/^\/+/, '');
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return 'post-media/<empty>';

  const owner = segments[0];
  const file = segments[segments.length - 1];
  const middle = segments.slice(1, -1).join('/');
  const extension = /\.([a-z0-9]{2,5})$/i.exec(file)?.[1]?.toLowerCase() ?? 'bin';

  return [
    'post-media',
    `u:${digest(owner).slice(0, 4)}`,
    middle,
    `${digest(path)}.${extension}`,
  ]
    .filter(Boolean)
    .join('/');
};

/** Assertable guard: true when a string still carries a credential or raw path. */
export const isSafeToLog = (value: string): boolean =>
  !/token=|jwt=|\?|https?:|\/object\/(sign|public)\//i.test(value);

// One report per reference+reason per session — a broken feed must not turn into
// a logging storm, and repeats add nothing diagnostically.
const reported = new Set<string>();

const post = (event: MediaFailureEvent) => {
  // Fire and forget, and swallow everything: a broken image is already a bad
  // moment for the viewer — telemetry must not add an exception on top of it.
  try {
    void supabase.functions
      .invoke('log-media-access-failure', { body: event })
      .catch(() => undefined);
  } catch {
    // No functions client (SSR, tests) — the console line is still recorded.
  }
};


/**
 * Record a signed-media failure: redacted line in the browser console (so a
 * member can screenshot it safely) plus one server-side report for aggregation.
 */
export const logMediaFailure = (
  input: string | null | undefined,
  reason: MediaFailureReason,
  { attempt = 0, kind = 'photo' }: { attempt?: number; kind?: 'photo' | 'video' } = {},
): MediaFailureEvent => {
  const ref = redactMediaRef(input);
  const event: MediaFailureEvent = { reason, ref, attempt, kind };

  const key = `${reason}:${ref}`;
  const firstTime = !reported.has(key);
  if (firstTime) reported.add(key);

  console.warn('[media] signed URL unavailable', event);
  if (firstTime) post(event);

  return event;
};

/** Test seam. */
export const __resetMediaTelemetry = () => reported.clear();
