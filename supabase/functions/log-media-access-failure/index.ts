// Server-side sink for private post-media read failures.
//
// Members report a REDACTED reference only (see src/lib/mediaTelemetry.ts): no
// signed URL, no token, no raw object path. This function re-validates that
// before logging, so a malicious or outdated client cannot smuggle a capability
// into our log stream. Nothing is written to the database — these lines live in
// the edge function logs, which is the right retention for diagnostics.

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";

const REASONS = new Set(["sign_failed", "fetch_forbidden", "gave_up"]);
const KINDS = new Set(["photo", "video"]);

/** Rejects anything that looks like a URL, a token, or an unredacted path. */
const isRedactedRef = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 200 &&
  value.startsWith("post-media/") &&
  !/token=|jwt=|[?#]|https?:|\/object\//i.test(value);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const auth = await requireUser(req, corsHeaders);
  if ("response" in auth) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { reason, ref, attempt, kind } = body as {
    reason?: unknown;
    ref?: unknown;
    attempt?: unknown;
    kind?: unknown;
  };

  if (typeof reason !== "string" || !REASONS.has(reason)) {
    return jsonResponse({ error: "Unknown reason" }, 400);
  }
  if (!isRedactedRef(ref)) {
    // Deliberately does not echo the offending value back.
    return jsonResponse({ error: "ref must be a redacted post-media reference" }, 400);
  }
  if (kind !== undefined && (typeof kind !== "string" || !KINDS.has(kind))) {
    return jsonResponse({ error: "Unknown kind" }, 400);
  }
  const attemptNumber = typeof attempt === "number" && Number.isFinite(attempt)
    ? Math.min(Math.max(Math.trunc(attempt), 0), 20)
    : 0;

  // Viewer id is safe and essential (was it one member or everyone?).
  console.log(
    JSON.stringify({
      event: "media_access_failure",
      viewer: auth.user.id,
      reason,
      ref,
      attempt: attemptNumber,
      kind: kind ?? "photo",
      at: new Date().toISOString(),
    }),
  );

  return jsonResponse({ ok: true });
});
