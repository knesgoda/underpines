// search-places — place lookup for post check-ins.
//
// Members type a few letters; we ask Google Places (New) through the Lovable
// connector gateway and hand back only what a place tag needs. The key stays
// server-side, the caller must be a real member, and every call is rate
// limited because Maps usage is metered.

import { requireUser } from "../_shared/auth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";
const MAX_RESULTS = 8;

// Per-member throttle: 20 searches per rolling minute, in-memory (best effort
// per instance — enough to stop a runaway client loop).
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, number[]>();

function rateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(userId, recent);
  return recent.length > MAX_PER_WINDOW;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const auth = await requireUser(req, corsHeaders);
  if ("response" in auth) return auth.response;

  let query = "";
  let lat: number | null = null;
  let lng: number | null = null;
  try {
    const body = await req.json();
    query = typeof body?.query === "string" ? body.query.trim() : "";
    lat = typeof body?.lat === "number" ? body.lat : null;
    lng = typeof body?.lng === "number" ? body.lng : null;
  } catch {
    return jsonResponse({ error: "invalid body" }, 400);
  }

  if (query.length < 2 || query.length > 100) {
    return jsonResponse({ error: "Search for 2 to 100 characters." }, 400);
  }

  if (rateLimited(auth.user.id)) {
    return jsonResponse({ error: "Take a breath and try that again." }, 429);
  }

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  // Custom-domain key (own credentials) is linked as ..._1; the managed
  // connection uses the unsuffixed name. Either is fine for the gateway.
  const mapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY_1") ??
    Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!lovableKey || !mapsKey) {
    return jsonResponse({ error: "Place search isn't set up yet." }, 503);
  }

  const payload: Record<string, unknown> = {
    textQuery: query,
    maxResultCount: MAX_RESULTS,
  };
  if (lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    payload.locationBias = {
      circle: { center: { latitude: lat, longitude: lng }, radius: 50_000 },
    };
  }

  const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": mapsKey,
      "Content-Type": "application/json",
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const details = await res.text();
    console.error(`places:searchText failed [${res.status}]: ${details}`);
    return jsonResponse(
      { error: "Place search failed", status: res.status, details },
      res.status,
    );
  }

  const data = await res.json();
  const places = Array.isArray(data?.places) ? data.places : [];
  const results = places.slice(0, MAX_RESULTS).map((p: Record<string, any>) => ({
    id: typeof p?.id === "string" ? p.id : null,
    name: p?.displayName?.text ?? "",
    address: p?.formattedAddress ?? "",
    lat: p?.location?.latitude ?? null,
    lng: p?.location?.longitude ?? null,
  })).filter((p: { name: string; lat: number | null; lng: number | null }) =>
    p.name && typeof p.lat === "number" && typeof p.lng === "number"
  );

  return jsonResponse({ results });
});
