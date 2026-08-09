/**
 * Cloudflare Turnstile server-side verification (spec §23).
 *
 * Integration interface with a graceful disabled state (spec §150): when
 * TURNSTILE_SECRET_KEY is not configured the helper reports
 * `configured: false` and callers fall back to the configured failure mode
 * (spec §120) instead of pretending the check ran.
 */

export interface TurnstileResult {
  configured: boolean;
  success: boolean;
  errorCodes: string[];
}

export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string,
): Promise<TurnstileResult> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) {
    return { configured: false, success: false, errorCodes: ["not-configured"] };
  }
  if (!token) {
    return { configured: true, success: false, errorCodes: ["missing-input-response"] };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const data = await res.json();
    return {
      configured: true,
      success: data.success === true,
      errorCodes: data["error-codes"] ?? [],
    };
  } catch (_err) {
    // Provider outage: report failure distinctly so callers can apply the
    // configured fallback rather than locking everyone out.
    return { configured: true, success: false, errorCodes: ["provider-unreachable"] };
  }
}
