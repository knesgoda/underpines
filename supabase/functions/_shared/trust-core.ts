/**
 * Pure trust/risk logic shared by edge functions and unit tests.
 *
 * No Deno, DOM, or Node APIs in this file — it is imported both by Supabase
 * edge functions (Deno) and by vitest (src/test/trust-core.test.ts).
 *
 * The scoring model is deliberately simple and explainable: each signal
 * carries a severity and a human-readable explanation, and the final
 * recommendation can always be reconstructed from the recorded signals
 * (spec §152). Thresholds come from security_config, not from code.
 */

export type Severity = "low" | "medium" | "high" | "critical";

export interface RiskSignal {
  type: string;
  severity: Severity;
  explanation: string;
  observed?: unknown;
  confidence?: number;
}

export type RiskLevel = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RiskRecommendation =
  | "ALLOW"
  | "ALLOW_WITH_RESTRICTIONS"
  | "REQUIRE_PHONE"
  | "REQUIRE_REVIEW"
  | "REJECT";

export interface RiskThresholds {
  phoneStepUpScore: number;
  reviewScore: number;
  rejectScore: number;
}

export const DEFAULT_THRESHOLDS: RiskThresholds = {
  phoneStepUpScore: 60,
  reviewScore: 80,
  rejectScore: 95,
};

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  recommendation: RiskRecommendation;
  reasons: string[];
}

/** Lowercase + trim only. Plus-aliases are preserved on purpose (spec §13). */
export function normalizeEmail(email: string): string {
  return (email ?? "").trim().toLowerCase();
}

export function isValidEmailSyntax(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizeEmail(email));
}

export function emailDomain(email: string): string {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  return at === -1 ? "" : normalized.slice(at + 1);
}

/**
 * Well-known disposable/temporary inbox providers. This is a floor, not a
 * ceiling — security_config.disposable_domains extends it at runtime, and a
 * hit is a *signal*, never an automatic rejection (spec §5.3/§24).
 */
export const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set([
  "10minutemail.com", "10minutemail.net", "20minutemail.com", "33mail.com",
  "anonaddy.me", "burnermail.io", "byom.de", "dispostable.com",
  "dropmail.me", "emailondeck.com", "fakeinbox.com", "fakemailgenerator.com",
  "getairmail.com", "getnada.com", "guerrillamail.biz", "guerrillamail.com",
  "guerrillamail.de", "guerrillamail.net", "guerrillamail.org",
  "guerrillamailblock.com", "harakirimail.com", "inboxkitten.com",
  "incognitomail.org", "linshiyouxiang.net", "mail-temp.com", "mail.tm",
  "mailcatch.com", "maildrop.cc", "mailinator.com", "mailinator.net",
  "mailnesia.com", "mailsac.com", "meltmail.com", "mintemail.com",
  "moakt.com", "mohmal.com", "mytemp.email", "nada.email",
  "sharklasers.com", "spam4.me", "spamgourmet.com", "temp-mail.io",
  "temp-mail.org", "tempail.com", "tempinbox.com", "tempmail.dev",
  "tempmail.email", "tempmail.plus", "tempmailo.com", "tempr.email",
  "throwawaymail.com", "tmpmail.net", "tmpmail.org", "trash-mail.com",
  "trashmail.com", "trashmail.me", "yopmail.com", "yopmail.fr",
  "yopmail.net", "zohomail.party",
]);

/** Large mainstream providers where high signup volume is normal. */
export const COMMON_FREEMAIL_DOMAINS: ReadonlySet<string> = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com",
  "yahoo.com", "icloud.com", "me.com", "aol.com", "proton.me",
  "protonmail.com", "gmx.com", "gmx.de", "web.de", "fastmail.com",
  "hey.com", "msn.com", "comcast.net", "att.net", "verizon.net",
]);

export function isDisposableDomain(
  domain: string,
  extraDomains?: readonly string[],
): boolean {
  const d = (domain ?? "").trim().toLowerCase();
  if (!d) return false;
  if (DISPOSABLE_DOMAINS.has(d)) return true;
  return (extraDomains ?? []).some((x) => x.trim().toLowerCase() === d);
}

// Tuned so the bands compose sensibly under the default thresholds
// (35 restrictions / 60 phone / 80 review / 95 reject):
//   one high            → restrictions   one critical        → phone
//   two highs           → phone          critical + high     → review
//   two criticals       → reject (deterministic-grade corroboration)
const SEVERITY_POINTS: Record<Severity, number> = {
  low: 10,
  medium: 25,
  high: 40,
  critical: 60,
};

export function severityPoints(severity: Severity): number {
  return SEVERITY_POINTS[severity];
}

/**
 * Combine signals into a bounded score and a recommended next step.
 * Diminishing returns past the first two strongest signals keep one noisy
 * category from dominating.
 */
export function scoreSignupRisk(
  signals: readonly RiskSignal[],
  thresholds: RiskThresholds = DEFAULT_THRESHOLDS,
): RiskAssessment {
  const sorted = [...signals].sort(
    (a, b) => severityPoints(b.severity) - severityPoints(a.severity),
  );
  let score = 0;
  sorted.forEach((signal, index) => {
    const dampening = index === 0 ? 1 : index === 1 ? 0.75 : 0.5;
    score += severityPoints(signal.severity) * dampening;
  });
  score = Math.min(100, Math.round(score));

  const level: RiskLevel =
    score === 0 ? "NONE"
    : score >= thresholds.reviewScore ? "CRITICAL"
    : score >= thresholds.phoneStepUpScore ? "HIGH"
    : score >= 35 ? "MEDIUM"
    : "LOW";

  // REJECT is reserved for deterministic abuse (spec §2/§25): a single
  // critical *deterministic* signal plus corroboration, at the very top of
  // the range. Everything else stays reviewable by a human.
  const recommendation: RiskRecommendation =
    score >= thresholds.rejectScore ? "REJECT"
    : score >= thresholds.reviewScore ? "REQUIRE_REVIEW"
    : score >= thresholds.phoneStepUpScore ? "REQUIRE_PHONE"
    : score >= 35 ? "ALLOW_WITH_RESTRICTIONS"
    : "ALLOW";

  return {
    score,
    level,
    recommendation,
    reasons: sorted.map((s) => s.explanation),
  };
}

/**
 * Content normalization for spam-similarity hashing (spec §106). Mirrors the
 * SQL normalize_content_for_hash() so both layers agree on what "identical"
 * means: lowercase, collapsed whitespace, trivial punctuation removed.
 */
export function normalizeContentForHash(content: string): string {
  return (content ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[!.,?'"“”‘’]+/g, "");
}
