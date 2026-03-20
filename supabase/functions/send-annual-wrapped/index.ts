import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const now = new Date();
    const todayMonth = now.getMonth() + 1;
    const todayDay = now.getDate();

    // Find Pines+ members whose join anniversary is today
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, handle, created_at, is_pines_plus")
      .eq("is_pines_plus", true);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const profile of profiles) {
      const joinDate = new Date(profile.created_at);
      if (joinDate.getMonth() + 1 !== todayMonth || joinDate.getDate() !== todayDay) continue;
      // Don't send on the actual join day (year 0)
      if (joinDate.getFullYear() === now.getFullYear()) continue;

      const yearStart = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const yearEnd = now;

      // Compile wrapped data
      const { data: posts } = await supabase
        .from("posts")
        .select("id, content, title, post_type, created_at")
        .eq("author_id", profile.id)
        .eq("is_published", true)
        .gte("created_at", yearStart.toISOString())
        .order("created_at", { ascending: true });

      const totalPosts = posts?.length || 0;
      const firstPost = posts?.[0];

      // Campfire messages
      const { count: msgCount } = await supabase
        .from("campfire_messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", profile.id)
        .gte("created_at", yearStart.toISOString());

      // Most active campfire
      const { data: campfireMsgs } = await supabase
        .from("campfire_messages")
        .select("campfire_id")
        .eq("sender_id", profile.id)
        .gte("created_at", yearStart.toISOString());

      let topCampfireName = null;
      let topCampfireMsgCount = 0;
      if (campfireMsgs && campfireMsgs.length > 0) {
        const counts: Record<string, number> = {};
        campfireMsgs.forEach(m => { counts[m.campfire_id] = (counts[m.campfire_id] || 0) + 1; });
        const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        if (topId) {
          topCampfireMsgCount = topId[1];
          const { data: cf } = await supabase.from("campfires").select("name").eq("id", topId[0]).maybeSingle();
          topCampfireName = cf?.name || "A Campfire";
        }
      }

      // Reactions given
      const { count: reactionsGiven } = await supabase
        .from("reactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .gte("created_at", yearStart.toISOString());

      // Circle count
      const { count: circleCount } = await supabase
        .from("circles")
        .select("id", { count: "exact", head: true })
        .eq("status", "accepted")
        .or(`requester_id.eq.${profile.id},requestee_id.eq.${profile.id}`);

      // Camps joined
      const { count: campsJoined } = await supabase
        .from("camp_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .gte("joined_at", yearStart.toISOString());

      // Create wrapped notification
      const wrappedData = {
        total_posts: totalPosts,
        first_post_excerpt: firstPost?.content?.slice(0, 120) || firstPost?.title || null,
        total_messages: msgCount || 0,
        top_campfire_name: topCampfireName,
        top_campfire_messages: topCampfireMsgCount,
        reactions_given: reactionsGiven || 0,
        circle_count: circleCount || 0,
        camps_joined: campsJoined || 0,
        year: now.getFullYear() - 1,
        join_date: profile.created_at,
      };

      await supabase.from("notifications").insert({
        recipient_id: profile.id,
        notification_type: "annual_wrapped",
        is_read: false,
        is_delivered_in_ember: false,
      });

      processed++;
      console.log(`[WRAPPED] Generated for ${profile.handle}`);
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[WRAPPED] Error: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
