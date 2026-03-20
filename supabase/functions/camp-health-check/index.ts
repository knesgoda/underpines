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
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch all active camps
    const { data: camps } = await supabase
      .from("camps")
      .select("id, member_count")
      .eq("is_active", true);

    if (!camps || camps.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let updated = 0;

    for (const camp of camps) {
      const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      // Count posts in last week
      const { count: postCount } = await supabase
        .from("camp_posts")
        .select("id", { count: "exact", head: true })
        .eq("camp_id", camp.id)
        .gte("created_at", oneWeekAgo);

      const memberCount = camp.member_count || 1;
      const postsPerMember = (postCount || 0) / memberCount;

      let health = "healthy";
      if (postsPerMember < 0.05 && memberCount > 5) {
        health = "concern";
      } else if (postsPerMember < 0.1 && memberCount > 5) {
        health = "watch";
      }

      await supabase
        .from("camps")
        .update({ health_status: health })
        .eq("id", camp.id);

      updated++;
    }

    return new Response(
      JSON.stringify({ processed: updated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
