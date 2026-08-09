// Shared authorization helpers for edge functions.
//
// Two gates:
//   requireUser   — a real signed-in member (rejects the bare public anon key,
//                   which on its own satisfies verify_jwt but identifies no one)
//   requireCronSecret — a shared secret for scheduled/service-to-service calls
//                   that run with no user context
//
// Plus SSRF guards for functions that fetch attacker-supplied URLs.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { classifyHttpUrl, isPrivateIp } from "./net.ts";

export { isPrivateIp } from "./net.ts";

export interface AuthedUser {
  id: string;
  email: string | null;
}

/**
 * Verify the Authorization bearer token identifies a real user. Returns the
 * user, or a ready-to-send 401 Response. Uses the service-role client only to
 * validate the token; callers keep their own client for DB work.
 */
export async function requireUser(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<{ user: AuthedUser } | { response: Response }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { response: unauthorized(corsHeaders) };
  }
  const token = authHeader.replace("Bearer ", "");
  const admin: SupabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    return { response: unauthorized(corsHeaders) };
  }
  return { user: { id: data.user.id, email: data.user.email ?? null } };
}

/**
 * Gate for scheduled / internal callers. The request must present the shared
 * secret (header `x-cron-secret` or body `{ cron_secret }`). If CRON_SECRET is
 * not configured the call is refused rather than left open.
 */
export function requireCronSecret(
  req: Request,
  bodySecret: string | undefined,
  corsHeaders: Record<string, string>,
): Response | null {
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) {
    return new Response(
      JSON.stringify({ error: "CRON_SECRET not configured" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const provided = req.headers.get("x-cron-secret") ?? bodySecret ?? "";
  // Constant-time-ish comparison.
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return unauthorized(corsHeaders);
  }
  return null;
}

function timingSafeEqual(a: string, b: string): boolean {
  let mismatch = a.length === b.length ? 0 : 1;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function unauthorized(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "unauthorized" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ---------------------------------------------------------------------------
// SSRF protection
// ---------------------------------------------------------------------------

/**
 * Validate that a user-supplied URL is safe to fetch: http(s) only, a hostname
 * present, and every resolved address is public. Returns null when safe, or an
 * error string describing why it was rejected. The synchronous checks live in
 * net.ts; this adds DNS resolution of named hosts.
 */
export async function assertPublicHttpUrl(raw: string): Promise<string | null> {
  const classified = classifyHttpUrl(raw);
  if (!classified.ok) return classified.error ?? "invalid url";
  if (!classified.hostToResolve) return null; // IP literal, already checked

  try {
    const results = await Promise.allSettled([
      Deno.resolveDns(classified.hostToResolve, "A"),
      Deno.resolveDns(classified.hostToResolve, "AAAA"),
    ]);
    const addrs = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    if (addrs.length === 0) return "host does not resolve";
    if (addrs.some(isPrivateIp)) return "host resolves to a private address";
  } catch {
    return "host could not be resolved";
  }
  return null;
}
