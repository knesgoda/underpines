// Public waitlist signup. Fronts the join_waitlist() RPC so the per-IP rate
// limit runs on a server-derived IP hash the client cannot forge. No auth: the
// coming-soon landing is fully logged-out. The RPC validates the email and
// enforces both the per-IP and global caps; this function only derives the IP
// hash and forwards.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json().catch(() => ({ email: null }));
    if (!email || typeof email !== "string") {
      return json({ success: false, error: "invalid_email" });
    }

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const bytes = new TextEncoder().encode(clientIp + "_waitlist_salt_underpines");
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const ipHash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase.rpc("join_waitlist", {
      _email: email,
      _ip_hash: ipHash,
    });

    if (error) {
      console.error("join-waitlist rpc error:", error.message);
      return json({ success: false, error: "server_error" });
    }

    return json(data);
  } catch (err) {
    console.error("join-waitlist error:", err);
    return json({ success: false, error: "server_error" });
  }
});
