// Emails a Trail Pass to its intended recipient (spec §11/§140).
//
// The pass itself is created by the create_trail_pass RPC, which returns the
// raw token exactly once to the inviter. This function verifies the caller
// owns the pass and that the presented token matches the stored hash, then
// sends the invitation email. If RESEND_API_KEY is not configured it
// degrades gracefully: the caller keeps the shareable link (spec §150).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

// Every user-controlled string that lands in the email HTML goes through
// this — display names and invitee names are as attacker-controlled as the
// personal message is.
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData?.user) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    const { pass_id, token } = await req.json();
    if (!pass_id || !token) {
      return jsonResponse({ error: "missing_fields" }, 400);
    }

    const { data: pass } = await supabase
      .from("trail_passes")
      .select("id, inviter_user_id, invitee_email_normalized, invitee_name, personal_message, token_hash, status, expires_at")
      .eq("id", pass_id)
      .maybeSingle();

    if (!pass || pass.inviter_user_id !== userData.user.id) {
      return jsonResponse({ error: "not_found" }, 404);
    }
    if (pass.status !== "PENDING") {
      return jsonResponse({ error: "not_sendable" }, 400);
    }
    if (pass.token_hash !== (await sha256Hex(token))) {
      return jsonResponse({ error: "token_mismatch" }, 400);
    }

    const baseUrl = Deno.env.get("APP_BASE_URL") ?? "https://underpines.com";
    const inviteUrl = `${baseUrl}/join/${token}`;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return jsonResponse({ sent: false, reason: "email_not_configured" });
    }

    const { data: inviter } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userData.user.id)
      .maybeSingle();
    const inviterNameRaw = inviter?.display_name ?? "Someone";
    const inviterName = escapeHtml(inviterNameRaw);
    const greeting = pass.invitee_name ? `Hi ${escapeHtml(pass.invitee_name)},` : "Hi,";
    const messageBlock = pass.personal_message
      ? `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #d97748;color:#4a4038;">${
          escapeHtml(pass.personal_message)
        }</blockquote>`
      : "";

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Under Pines <noreply@underpines.com>",
        to: [pass.invitee_email_normalized],
        subject: `${inviterNameRaw} saved you a place Under Pines`,
        html: `
          <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#2f2a25;">
            <h1 style="font-size:22px;">Someone saved you a place Under Pines.</h1>
            <p>${greeting}</p>
            <p>${inviterName} sent you a Trail Pass — a personal invitation to
            Under Pines, a small corner of the internet that grows through
            people, not algorithms.</p>
            ${messageBlock}
            <p style="margin:24px 0;">
              <a href="${inviteUrl}"
                 style="background:#d97748;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;">
                Accept your Trail Pass
              </a>
            </p>
            <p style="font-size:13px;color:#6b6259;">
              This pass was sent to ${pass.invitee_email_normalized} and only
              works for this address. It expires on
              ${new Date(pass.expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })}.
              If you weren't expecting this, you can ignore it.
            </p>
          </div>`,
      }),
    });

    if (!emailRes.ok) {
      const detail = await emailRes.text();
      console.error("send-trail-pass resend error:", detail);
      return jsonResponse({ sent: false, reason: "email_send_failed" });
    }

    return jsonResponse({ sent: true });
  } catch (err) {
    console.error("send-trail-pass error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
