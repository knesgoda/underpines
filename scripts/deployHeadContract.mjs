// Pure helpers for the deploy-time smoke test. No network, no node-only APIs
// beyond crypto, so vitest can exercise the same code the script runs.
import { createHash } from "node:crypto";

/**
 * The head lines the smoke test pins. Each entry is matched byte-for-byte
 * against the repo's index.html AND the deployed index.html, so a hosting
 * layer that rewrites or drops one of them fails the check.
 */
export const PINNED_HEAD_PATTERNS = [
  { id: "viewport-fit", re: /<meta\s+name="viewport"[^>]*viewport-fit=cover[^>]*\/?>/i },
  { id: "apple-web-app-capable", re: /<meta\s+name="apple-mobile-web-app-capable"[^>]*\/?>/i },
  { id: "apple-status-bar-style", re: /<meta\s+name="apple-mobile-web-app-status-bar-style"[^>]*\/?>/i },
  { id: "apple-touch-icon", re: /<link\s+rel="apple-touch-icon"[^>]*\/?>/i },
  { id: "supabase-preconnect-cors", re: /<link\s+rel="preconnect"\s+href="https:\/\/[a-z0-9]+\.supabase\.co"\s+crossorigin\s*\/?>/i },
  { id: "supabase-preconnect-plain", re: /<link\s+rel="preconnect"\s+href="https:\/\/[a-z0-9]+\.supabase\.co"\s*\/?>/i },
];

/** Collapse insignificant whitespace inside a tag so formatting isn't the test. */
export function normalizeTag(tag) {
  return tag.replace(/\s+/g, " ").trim();
}

/**
 * Pull the pinned tags out of an index.html string.
 * Returns { tags: Record<id, string>, missing: string[] }.
 */
export function extractPinnedTags(html) {
  const tags = {};
  const missing = [];
  for (const { id, re } of PINNED_HEAD_PATTERNS) {
    const match = html.match(re);
    if (match) tags[id] = normalizeTag(match[0]);
    else missing.push(id);
  }
  return { tags, missing };
}

/**
 * Compare repo vs deployed pinned tags.
 * Returns a list of failure strings; empty means the contract holds.
 */
export function diffPinnedTags(repoHtml, deployedHtml) {
  const failures = [];
  const repo = extractPinnedTags(repoHtml);
  const live = extractPinnedTags(deployedHtml);

  for (const id of repo.missing) failures.push(`repo index.html is missing pinned tag: ${id}`);
  for (const id of live.missing) failures.push(`deployed index.html is missing pinned tag: ${id}`);

  for (const [id, repoTag] of Object.entries(repo.tags)) {
    const liveTag = live.tags[id];
    if (liveTag && liveTag !== repoTag) {
      failures.push(`pinned tag drifted: ${id}\n  repo:     ${repoTag}\n  deployed: ${liveTag}`);
    }
  }
  return failures;
}

export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Byte-for-byte comparison of a binary asset (the touch icon).
 * Returns a failure string, or null when identical.
 */
export function diffBinaryAsset(name, repoBytes, deployedBytes) {
  if (repoBytes.length !== deployedBytes.length) {
    return `${name} size differs: repo ${repoBytes.length} B vs deployed ${deployedBytes.length} B`;
  }
  const a = sha256(repoBytes);
  const b = sha256(deployedBytes);
  if (a !== b) return `${name} sha256 differs: repo ${a} vs deployed ${b}`;
  return null;
}
