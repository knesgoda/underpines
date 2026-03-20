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
    const currentDayName = now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

    // Find camp newsletter settings that match today's send day
    const { data: settings } = await supabase
      .from("camp_newsletter_settings")
      .select("*")
      .eq("is_enabled", true)
      .eq("send_day", currentDayName);

    if (!settings || settings.length === 0) {
      return new Response(JSON.stringify({ processed: 0, reason: "no matching settings" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const setting of settings) {
      // Check if send_time matches current hour in their timezone
      const sendHour = parseInt(setting.send_time?.split(":")[0] || "8", 10);
      const tzOffset = getTimezoneOffset(setting.timezone || "America/Los_Angeles");
      const localHour = (now.getUTCHours() + Math.round(tzOffset) + 24) % 24;

      if (localHour !== sendHour) continue;

      // Find scheduled newsletters ready to send
      const { data: newsletters } = await supabase
        .from("camp_newsletters")
        .select("*")
        .eq("camp_id", setting.camp_id)
        .eq("status", "scheduled")
        .lte("scheduled_for", now.toISOString());

      if (!newsletters || newsletters.length === 0) continue;

      for (const nl of newsletters) {
        // Check weekly frequency limit
        const oneWeekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
        const { data: recentSent } = await supabase
          .from("camp_newsletters")
          .select("id")
          .eq("camp_id", setting.camp_id)
          .eq("status", "sent")
          .gte("sent_at", oneWeekAgo)
          .limit(1);

        if (recentSent && recentSent.length > 0) {
          console.log(`[CAMP-NL] Skipping ${setting.camp_id} — already sent this week`);
          continue;
        }

        // Get camp members
        const { data: members } = await supabase
          .from("camp_members")
          .select("user_id")
          .eq("camp_id", setting.camp_id);

        const memberCount = members?.length || 0;

        // Mark newsletter as sent
        await supabase
          .from("camp_newsletters")
          .update({
            status: "sent",
            sent_at: now.toISOString(),
            recipient_count: memberCount,
          })
          .eq("id", nl.id);

        // Create notifications for all members
        if (members && members.length > 0) {
          const notifs = members.map((m: any) => ({
            recipient_id: m.user_id,
            notification_type: "camp_newsletter",
            actor_id: nl.author_id,
            camp_id_ref: setting.camp_id,
          }));
          await supabase.from("notifications").insert(notifs);
        }

        processed++;
        console.log(`[CAMP-NL] Sent newsletter "${nl.title}" to ${memberCount} members`);
      }
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[CAMP-NL] Error: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function getTimezoneOffset(tz: string): number {
  const offsets: Record<string, number> = {
    "America/New_York": -5, "America/Chicago": -6, "America/Denver": -7,
    "America/Los_Angeles": -8, "America/Anchorage": -9, "Pacific/Honolulu": -10,
    "Europe/London": 0, "Europe/Paris": 1, "Europe/Berlin": 1,
    "Asia/Tokyo": 9, "Asia/Shanghai": 8, "Australia/Sydney": 11,
  };
  return offsets[tz] ?? -8;
}
