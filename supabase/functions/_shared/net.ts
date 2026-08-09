// Pure network-safety helpers (no Deno/DOM/Node APIs), so they can be unit
// tested from vitest as well as imported by edge functions. DNS resolution
// itself lives in auth.ts, which layers it on top of these checks.

/** True for loopback, private, link-local, CGNAT, and reserved IP literals. */
export function isPrivateIp(ip: string): boolean {
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 10) return true;                          // 10.0.0.0/8
    if (a === 127) return true;                         // loopback
    if (a === 0) return true;                           // 0.0.0.0/8
    if (a === 169 && b === 254) return true;            // link-local (incl. cloud metadata)
    if (a === 172 && b >= 16 && b <= 31) return true;   // 172.16.0.0/12
    if (a === 192 && b === 168) return true;            // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true;  // CGNAT 100.64.0.0/10
    if (a >= 224) return true;                          // multicast / reserved
    return false;
  }
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;   // v6 loopback / unspecified
  if (lower.startsWith("fe80")) return true;            // v6 link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique-local
  if (lower.startsWith("::ffff:")) return isPrivateIp(lower.slice(7)); // v4-mapped
  return false;
}

export interface UrlClassification {
  ok: boolean;
  error?: string;
  /** Present when ok: the hostname to resolve, or null if host is an IP literal already checked. */
  hostToResolve?: string | null;
}

/**
 * Synchronous URL safety checks: valid http(s) URL, non-empty host, obvious
 * non-public names rejected, and IP literals checked directly. When the host
 * is a DNS name, `hostToResolve` is returned for the caller to resolve and
 * re-check against isPrivateIp.
 */
export function classifyHttpUrl(raw: string): UrlClassification {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: "invalid url" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "only http and https are allowed" };
  }
  const host = parsed.hostname;
  if (!host) return { ok: false, error: "missing host" };

  if (/^[\d.]+$/.test(host) || host.includes(":")) {
    if (isPrivateIp(host)) return { ok: false, error: "host resolves to a private address" };
    return { ok: true, hostToResolve: null };
  }
  const lower = host.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".local") || lower.endsWith(".internal")) {
    return { ok: false, error: "host is not public" };
  }
  return { ok: true, hostToResolve: host };
}
