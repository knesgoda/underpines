import { supabase } from '@/integrations/supabase/client';

/**
 * Place lookup for post check-ins.
 *
 * Search runs server-side (edge function `search-places`) so the Maps key never
 * reaches the browser, and results are cached per session because Maps usage is
 * metered. Writes go through the `attach_post_place` RPC — the place columns on
 * posts are not client-writable.
 */

export interface Place {
  id: string | null;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export const MIN_QUERY_LENGTH = 3;
export const SEARCH_DEBOUNCE_MS = 400;

const cache = new Map<string, Place[]>();

const cacheKey = (query: string) => query.trim().toLowerCase();

/** ~100m of precision: a place, never a doorstep. Mirrors the RPC's rounding. */
export const roundCoord = (value: number): number => Math.round(value * 1000) / 1000;

export async function searchPlaces(query: string): Promise<Place[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return [];

  const key = cacheKey(trimmed);
  const cached = cache.get(key);
  if (cached) return cached;

  const { data, error } = await supabase.functions.invoke('search-places', {
    body: { query: trimmed },
  });
  if (error) throw error;

  const results: Place[] = Array.isArray(data?.results) ? data.results : [];
  cache.set(key, results);
  return results;
}

/** Test/utility seam — drops the session's cached searches. */
export const clearPlaceCache = () => cache.clear();

export async function attachPlaceToPost(
  postId: string,
  place: Place,
  opts: { isCampPost?: boolean } = {},
): Promise<void> {
  const { error } = await supabase.rpc('attach_post_place', {
    _post_id: postId,
    _place_name: place.name,
    _place_id: place.id,
    _lat: roundCoord(place.lat),
    _lng: roundCoord(place.lng),
    _is_camp_post: opts.isCampPost ?? false,
  });
  if (error) throw error;
}
