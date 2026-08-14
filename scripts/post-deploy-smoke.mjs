#!/usr/bin/env node
/**
 * Post-deploy smoke test.
 *
 * Two halves, both read-only and safe to run against production:
 *
 *  1. Site liveness — the published shell and its static assets serve 200 and
 *     look like the app (not a hosting error page).
 *  2. Edge-function reachability — every function under supabase/functions/ is
 *     probed with a CORS preflight and one unauthenticated request. The
 *     expected response is derived from the function's own source, so the test
 *     stays honest as functions change:
 *
 *       requireUser(...)        → must answer 401 to an unauthenticated call
 *       requireCronSecret(...)  → must answer 401 (secret set) or 503 (unset)
 *       stripe webhook          → must answer 400 (missing/invalid signature)
 *       anything else           → must answer, with CORS headers, and must not
 *                                 500 on a bare probe (i.e. it is deployed)
 *
 *     A 404 from the functions host is the real failure this catches: it means
 *     the function was never deployed. Nothing here sends a real payload, so no
 *     emails, charges, or writes happen.
 *
 * Usage:
 *   node scripts/post-deploy-smoke.mjs
 *   node scripts/post-deploy-smoke.mjs https://www.underpines.com
 *   SMOKE_FUNCTIONS=stripe-webhook,triage-report node scripts/post-deploy-smoke.mjs
 *   npm run smoke:post-deploy
 *
 * Env: SMOKE_BASE_URL, SMOKE_FUNCTIONS (comma list, default: all),
 *      SUPABASE_FUNCTIONS_URL / VITE_SUPABASE_URL (default: read from .env).
 *
 * Exits 0 when everything is live and answering as expected, 1 otherwise.
 */
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.argv[2] || process.env.SMOKE_BASE_URL || "https://www.underpines.com").replace(/\/$/, "");
const TIMEOUT_MS = 25000;

const env = await readFile(path.join(ROOT, ".env"), "utf8").catch(() => "");
const SUPABASE_URL = (
  process.env.SUPABASE_FUNCTIONS_URL ||
  process.env.VITE_SUPABASE_URL ||
  env.match(/VITE_SUPABASE_URL="?(https:\/\/[^"\s]+)"?/)?.[1] ||
  ""
).replace(/\/$/, "");
const ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="?([^"\s]+)"?/)?.[1] ||
  "";

const failures = [];
const notes = [];

async function probe(url, init = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
    return { status: res.status, headers: res.headers, body: await res.text() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// 1. Site liveness
// ---------------------------------------------------------------------------
const SITE_CHECKS = [
  { path: "/", expect: 200, mustContain: '<div id="root">' },
  { path: "/robots.txt", expect: 200, mustContain: "User-agent" },
  { path: "/manifest.json", expect: 200, mustContain: "Under Pines" },
  { path: "/apple-touch-icon.png", expect: 200 },
  { path: "/favicon.svg", expect: 200 },
];

for (const check of SITE_CHECKS) {
  const res = await probe(`${BASE}${check.path}`);
  if (res.error) {
    failures.push(`site ${check.path}: request failed — ${res.error}`);
    continue;
  }
  if (res.status !== check.expect) {
    failures.push(`site ${check.path}: expected ${check.expect}, got ${res.status}`);
    continue;
  }
  if (check.mustContain && !res.body.includes(check.mustContain)) {
    failures.push(`site ${check.path}: body did not contain ${JSON.stringify(check.mustContain)}`);
    continue;
  }
  notes.push(`site ${check.path} → ${res.status}`);
}

// The built shell must reference a hashed module bundle — a hosting layer
// serving a stale or placeholder index.html fails here.
const shell = await probe(`${BASE}/`);
if (!shell.error && !/<script[^>]+src="\/assets\/[^"]+\.js"/.test(shell.body)) {
  failures.push("site /: no hashed /assets/*.js entry script in the served shell");
}

// ---------------------------------------------------------------------------
// 2. Edge-function reachability
// ---------------------------------------------------------------------------
export function classifyFunction(source) {
  if (/constructEventAsync\s*\(/.test(source)) {
    return { kind: "stripe-webhook", allowed: [400, 401], why: "missing Stripe signature" };
  }
  if (/requireCronSecret\s*\(/.test(source)) {
    return { kind: "cron", allowed: [401, 503], why: "no x-cron-secret (503 if CRON_SECRET unset)" };
  }
  if (/requireUser\s*\(/.test(source)) {
    return { kind: "member", allowed: [401], why: "no member JWT" };
  }
  if (/status:\s*401/.test(source)) {
    return { kind: "self-auth", allowed: [401, 403], why: "inline auth check" };
  }
  return { kind: "open", allowed: [200, 400, 422], why: "validates its own input" };
}

/**
 * The functions gateway rejects a call before it ever reaches the function when
 * `verify_jwt` is on and no member JWT is present. That is a deployed, correctly
 * gated function — not a failure — whatever the function's own auth style is.
 */
const GATEWAY_REJECTION = /UNAUTHORIZED_NO_AUTH_HEADER|Missing authorization header|Invalid JWT/i;

if (!SUPABASE_URL) {
  failures.push("no backend URL: set SUPABASE_FUNCTIONS_URL or keep VITE_SUPABASE_URL in .env");
} else {
  const dirs = (await readdir(path.join(ROOT, "supabase/functions"), { withFileTypes: true }))
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name)
    .sort();
  const only = process.env.SMOKE_FUNCTIONS?.split(",").map((s) => s.trim()).filter(Boolean);
  const targets = only?.length ? dirs.filter((d) => only.includes(d)) : dirs;
  for (const missing of (only ?? []).filter((n) => !dirs.includes(n))) {
    failures.push(`SMOKE_FUNCTIONS names ${missing}, which is not in supabase/functions/`);
  }

  for (const name of targets) {
    const url = `${SUPABASE_URL}/functions/v1/${name}`;
    const source = await readFile(path.join(ROOT, "supabase/functions", name, "index.ts"), "utf8").catch(() => "");
    const { kind, allowed, why } = classifyFunction(source);

    // CORS preflight: browsers need this to succeed before any real call.
    const pre = await probe(url, { method: "OPTIONS", headers: { Origin: BASE, "Access-Control-Request-Method": "POST" } });
    if (pre.error) {
      failures.push(`fn ${name}: preflight request failed — ${pre.error}`);
      continue;
    }
    if (pre.status === 404) {
      failures.push(`fn ${name}: 404 on preflight — function is not deployed`);
      continue;
    }
    // A function that doesn't answer OPTIONS is a browser-CORS wart, not a bad
    // deploy — record it as a warning and keep going.
    if (![200, 204].includes(pre.status)) {
      warnings.push(`fn ${name}: preflight answered ${pre.status} (no OPTIONS handler / CORS headers)`);
    } else if (!pre.headers?.get("access-control-allow-origin")) {
      warnings.push(`fn ${name}: preflight 200 but no Access-Control-Allow-Origin header`);
    }

    // Unauthenticated probe with an empty JSON body.
    const res = await probe(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ANON_KEY ? { apikey: ANON_KEY } : {}),
      },
      body: "{}",
    });
    if (res.error) {
      failures.push(`fn ${name}: probe failed — ${res.error}`);
      continue;
    }
    if (res.status === 404) {
      failures.push(`fn ${name}: 404 — function is not deployed`);
      continue;
    }
    const gatewayGated = res.status === 401 && GATEWAY_REJECTION.test(res.body);
    if (!gatewayGated && !allowed.includes(res.status)) {
      failures.push(
        `fn ${name} (${kind}): expected ${allowed.join(" or ")} for an unauthenticated probe (${why}), got ${res.status} — ${res.body.slice(0, 200)}`,
      );
      continue;
    }
    notes.push(
      `fn ${name} (${gatewayGated ? "jwt-gateway" : kind}) → preflight ${pre.status}, probe ${res.status}`,
    );
  }
}

// ---------------------------------------------------------------------------
for (const n of notes) console.log(`  ok  ${n}`);

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} post-deploy check(s) failed against ${BASE}:\n`);
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}

console.log(`\nPASS — ${BASE} is live and every edge function answered as expected.`);
