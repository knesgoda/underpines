import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const nudgeCopy = [
  (name: string) => `${name} hasn't been seen around the Pines in 30 days. Kevsquatch may be involved. Send a smoke signal?`,
  (name: string) => `${name}'s Cabin has gone quiet for 30 days. The trees are asking about them.`,
  (name: string) => `${name} was last seen heading deeper into the woods 30 days ago.`,
];

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
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = thirtyDaysAgo.toISOString();

    // Find users with seedling periods (they were invited)
    const { data: seedlings } = await supabase
      .from("seedling_periods")
      .select("user_id, invited_by");

    if (!seedlings || seedlings.length === 0) {
      return new Response(JSON.stringify({ nudges: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let nudgeCount = 0;

    for (const seedling of seedlings) {
      if (!seedling.invited_by) continue;

      // Check if this user has been inactive (no posts in 30 days)
      const { count: postCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("author_id", seedling.user_id)
        .gte("created_at", cutoff);

      if ((postCount ?? 0) > 0) continue;

      // Check if no campfire messages in 30 days
      const { count: msgCount } = await supabase
        .from("campfire_messages")
        .select("*", { count: "exact", head: true })
        .eq("sender_id", seedling.user_id)
        .gte("created_at", cutoff);

      if ((msgCount ?? 0) > 0) continue;

      // Check if nudge already sent
      const { data: existingNudge } = await supabase
        .from("inactive_nudges")
        .select("id")
        .eq("inviter_id", seedling.invited_by)
        .eq("inactive_user_id", seedling.user_id)
        .maybeSingle();

      if (existingNudge) continue;

      // Get inactive user's name
      const { data: inactiveProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", seedling.user_id)
        .maybeSingle();

      if (!inactiveProfile) continue;

      // Pick random copy
      const copyFn = nudgeCopy[Math.floor(Math.random() * nudgeCopy.length)];

      // Create notification for the inviter
      await supabase.from("notifications").insert({
        recipient_id: seedling.invited_by,
        notification_type: "inactive_nudge",
        actor_id: seedling.user_id,
        is_delivered_in_ember: false,
      });

      // Record nudge to prevent duplicates
      await supabase.from("inactive_nudges").insert({
        inviter_id: seedling.invited_by,
        inactive_user_id: seedling.user_id,
      });

      nudgeCount++;
      console.log(`[INACTIVE-NUDGE] Sent nudge to inviter of ${inactiveProfile.display_name}`);
    }

    return new Response(JSON.stringify({ nudges: nudgeCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[INACTIVE-NUDGE] Error: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
