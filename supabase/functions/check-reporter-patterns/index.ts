import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

    // Get all reporters with 5+ reports
    const { data: patterns } = await supabase
      .from("reporter_patterns")
      .select("*")
      .gte("total_reports", 5)
      .eq("flagged_as_serial", false);

    if (!patterns || patterns.length === 0) {
      return new Response(JSON.stringify({ checked: 0, flagged: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let flagged = 0;

    for (const pattern of patterns) {
      // Count cleared reports for this reporter
      const { count: clearedCount } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("reporter_id", pattern.reporter_id)
        .eq("status", "cleared");

      const { count: totalCount } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("reporter_id", pattern.reporter_id);

      const total = totalCount || 0;
      const cleared = clearedCount || 0;

      // Update counts
      await supabase
        .from("reporter_patterns")
        .update({
          total_reports: total,
          cleared_reports: cleared,
          last_updated: new Date().toISOString(),
        })
        .eq("id", pattern.id);

      // If 80%+ cleared rate, flag as serial reporter
      if (total >= 5 && cleared / total >= 0.8) {
        await supabase
          .from("reporter_patterns")
          .update({ flagged_as_serial: true })
          .eq("id", pattern.id);

        // Log moderation note
        // Find an admin to attribute the note to
        const { data: adminRole } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin")
          .limit(1)
          .maybeSingle();

        if (adminRole) {
          await supabase.from("moderation_actions").insert({
            admin_id: adminRole.user_id,
            target_user_id: pattern.reporter_id,
            action_type: "note",
            action_detail: `Serial reporter flagged: ${cleared}/${total} reports cleared (${Math.round((cleared / total) * 100)}%)`,
          });
        }

        flagged++;
      }
    }

    return new Response(
      JSON.stringify({ checked: patterns.length, flagged }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
