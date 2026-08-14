#!/usr/bin/env node
/**
 * Deploy-time smoke test.
 *
 * Verifies the published site serves the SAME head contract and touch icon as
 * the repo — the three things a hosting layer has quietly rewritten on us
 * before: /apple-touch-icon.png, the viewport-fit / apple-mobile-web-app metas,
 * and the two Supabase preconnect links.
 *
 * Usage:
 *   node scripts/deploy-smoke-test.mjs                      # https://www.underpines.com
 *   node scripts/deploy-smoke-test.mjs https://host.example  # any deployment
 *   npm run smoke:deploy
 *
 * Exits 0 when the deployment matches the repo, 1 otherwise. Read-only.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { diffPinnedTags, diffBinaryAsset, extractPinnedTags } from "./deployHeadContract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.argv[2] || process.env.SMOKE_BASE_URL || "https://www.underpines.com").replace(/\/$/, "");
const TIMEOUT_MS = 20000;

async function fetchWithTimeout(url, asText) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`${url} responded ${res.status}`);
    return asText ? await res.text() : Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

const failures = [];

// 1. Head contract: viewport-fit, apple web-app metas, touch-icon link, both preconnects.
const repoHtml = await readFile(path.join(ROOT, "index.html"), "utf8");
const deployedHtml = await fetchWithTimeout(`${BASE}/`, true);
failures.push(...diffPinnedTags(repoHtml, deployedHtml));

// 2. The touch icon itself, byte-for-byte.
const repoIcon = await readFile(path.join(ROOT, "public/apple-touch-icon.png"));
const deployedIcon = await fetchWithTimeout(`${BASE}/apple-touch-icon.png`, false);
const iconFailure = diffBinaryAsset("apple-touch-icon.png", repoIcon, deployedIcon);
if (iconFailure) failures.push(iconFailure);

// 3. The preconnect host must be the project's own Supabase origin (.env drift guard).
const env = await readFile(path.join(ROOT, ".env"), "utf8").catch(() => "");
const envHost = env.match(/VITE_SUPABASE_URL="?(https:\/\/[^"\s]+)"?/)?.[1]?.replace(/\/$/, "");
const preconnectHost = extractPinnedTags(repoHtml).tags["supabase-preconnect-plain"]?.match(/href="([^"]+)"/)?.[1];
if (envHost && preconnectHost && envHost !== preconnectHost) {
  failures.push(`preconnect host ${preconnectHost} does not match VITE_SUPABASE_URL ${envHost}`);
}

if (failures.length) {
  console.error(`FAIL — ${BASE} does not match the repo:\n`);
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}

console.log(`PASS — ${BASE} serves the repo's head contract and touch icon byte-for-byte.`);
