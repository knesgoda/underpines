import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    const oneWeek = new Date(Date.now() - 7 * 86400000).toISOString();

    // Gather stats
    const [
      { count: newMembers },
      { count: reportsFiled },
      { count: reportsCleared },
      { count: reportsActioned },
      { count: pinesActive },
      { count: totalCamps },
      { count: flaggedCamps },
      { data: urgentReports },
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", oneWeek),
      supabase.from("reports").select("id", { count: "exact", head: true }).gte("created_at", oneWeek),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "cleared").gte("created_at", oneWeek),
      supabase.from("reports").select("id", { count: "exact", head: true }).in("status", ["warned", "suspended", "banned"]).gte("created_at", oneWeek),
      supabase.from("pines_plus_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("camps").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("camps").select("id", { count: "exact", head: true }).in("health_status", ["concern", "watch"]),
      supabase.from("reports").select("id").eq("status", "pending_review").eq("ai_severity", "critical").gte("created_at", oneWeek),
    ]);

    const urgentCount = urgentReports?.length ?? 0;
    const today = new Date();
    const weekStart = new Date(today.getTime() - 7 * 86400000);
    const dateRange = `${weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })}–${today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

    let closingLine = "Nothing urgent this week.\nThe forest is quiet.";
    if (urgentCount > 0) {
      closingLine = `⚠️ ${urgentCount} critical report${urgentCount > 1 ? "s" : ""} need${urgentCount === 1 ? "s" : ""} your attention.`;
    }

    const body = `THE GROVE
Week of ${dateRange}

────────────────────────────────
NEW MEMBERS
New this week: ${newMembers ?? 0}

────────────────────────────────
REPORTS
Filed: ${reportsFiled ?? 0}
AI cleared: ${reportsCleared ?? 0}
Actions taken: ${reportsActioned ?? 0}

────────────────────────────────
PLATFORM
Pines+ active: ${pinesActive ?? 0}
Total camps: ${totalCamps ?? 0}
Flagged camps: ${flaggedCamps ?? 0}

────────────────────────────────
${closingLine}
────────────────────────────────`;

    // Get admin emails from user_roles
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin"]);

    if (!adminRoles || adminRoles.length === 0 || !resendKey) {
      return new Response(JSON.stringify({ sent: false, reason: "no admins or no resend key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get admin emails from auth
    for (const role of adminRoles) {
      const { data: userData } = await supabase.auth.admin.getUserById(role.user_id);
      const email = userData?.user?.email;
      if (!email) continue;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "The Grove <grove@underpines.com>",
          to: [email],
          subject: `Weekly Grove Report — ${today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
          text: body,
        }),
      });
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
