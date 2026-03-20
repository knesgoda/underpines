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

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.error("[DAILY-EMBER] RESEND_API_KEY not set");
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  try {
    const now = new Date();
    const currentHourUTC = now.getUTCHours();

    // Find users whose local delivery time matches current UTC hour
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("user_id, ember_delivery_time, ember_timezone");

    if (!prefs || prefs.length === 0) {
      console.log("[DAILY-EMBER] No preferences found");
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const pref of prefs) {
      // Parse delivery hour
      const deliveryHour = parseInt(pref.ember_delivery_time?.split(":")[0] || "7", 10);

      // Simple timezone offset calculation
      const tzOffset = getTimezoneOffset(pref.ember_timezone || "America/Los_Angeles");
      const userCurrentHour = (currentHourUTC + Math.round(tzOffset)) % 24;

      if (userCurrentHour !== deliveryHour) continue;

      // Check if user has unsubscribed
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, handle, ember_unsubscribed")
        .eq("id", pref.user_id)
        .maybeSingle();

      if (!profile || profile.ember_unsubscribed) continue;

      // Fetch undelivered notifications
      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", pref.user_id)
        .eq("is_delivered_in_ember", false)
        .order("created_at", { ascending: false });

      if (!notifications || notifications.length === 0) continue;

      // Get user's email
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(pref.user_id);
      if (!authUser?.email) continue;

      // Group notifications
      const grouped = groupNotifications(notifications);

      // Get actor names
      const actorIds = [...new Set(notifications.map(n => n.actor_id).filter(Boolean))];
      const actorMap: Record<string, string> = {};
      if (actorIds.length > 0) {
        const { data: actors } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", actorIds);
        (actors || []).forEach(a => { actorMap[a.id] = a.display_name; });
      }

      // Get campfire names
      const campfireIds = [...new Set(notifications.filter(n => n.campfire_id).map(n => n.campfire_id))];
      const campfireMap: Record<string, string> = {};
      if (campfireIds.length > 0) {
        const { data: campfires } = await supabase
          .from("campfires")
          .select("id, name")
          .in("id", campfireIds);
        (campfires || []).forEach(c => { campfireMap[c.id] = c.name || "Campfire"; });
      }

      // Build email
      const dayName = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      const html = buildEmailHtml(profile.display_name, dayName, grouped, actorMap, campfireMap);

      // Send via Resend
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Under Pines <ember@underpines.com>",
          to: [authUser.email],
          subject: `Your Daily Ember — ${dayName}`,
          html,
        }),
      });

      if (res.ok) {
        // Mark as delivered
        const ids = notifications.map(n => n.id);
        await supabase
          .from("notifications")
          .update({ is_delivered_in_ember: true })
          .in("id", ids);
        processed++;
        console.log(`[DAILY-EMBER] Sent to ${authUser.email}`);
      } else {
        const errText = await res.text();
        console.error(`[DAILY-EMBER] Resend error for ${authUser.email}: ${errText}`);
      }
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[DAILY-EMBER] Error: ${error.message}`);
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

interface GroupedNotifs {
  campfire_messages: any[];
  reactions: any[];
  circles: any[];
  invites: any[];
  smoke_signals: any[];
  camp_newsletters: any[];
  system: any[];
}

function groupNotifications(notifications: any[]): GroupedNotifs {
  const groups: GroupedNotifs = {
    campfire_messages: [], reactions: [], circles: [],
    invites: [], smoke_signals: [], camp_newsletters: [], system: [],
  };

  notifications.forEach(n => {
    switch (n.notification_type) {
      case "campfire_message": groups.campfire_messages.push(n); break;
      case "reaction_batch": groups.reactions.push(n); break;
      case "circle_request":
      case "circle_accepted":
      case "reply":
      case "quote_post":
        groups.circles.push(n); break;
      case "invite_accepted": groups.invites.push(n); break;
      case "smoke_signal": groups.smoke_signals.push(n); break;
      case "camp_newsletter": groups.camp_newsletters.push(n); break;
      default: groups.system.push(n); break;
    }
  });

  return groups;
}

function buildEmailHtml(
  name: string, dayName: string, grouped: GroupedNotifs,
  actorMap: Record<string, string>, campfireMap: Record<string, string>
): string {
  let sections = "";

  if (grouped.campfire_messages.length > 0) {
    const byCampfire: Record<string, any[]> = {};
    grouped.campfire_messages.forEach(n => {
      const cid = n.campfire_id || "unknown";
      if (!byCampfire[cid]) byCampfire[cid] = [];
      byCampfire[cid].push(n);
    });

    let lines = "";
    Object.entries(byCampfire).forEach(([cid, items]) => {
      const cName = campfireMap[cid] || "A campfire";
      if (items.length === 1 && items[0].actor_id) {
        lines += `<p style="margin:4px 0;color:#1a1a2e;">${actorMap[items[0].actor_id] || "Someone"} sent you a message.</p>`;
      } else {
        lines += `<p style="margin:4px 0;color:#1a1a2e;">${cName} has ${items.length} new messages.</p>`;
      }
    });

    sections += section("CAMPFIRES", lines);
  }

  if (grouped.reactions.length > 0) {
    sections += section("REACTIONS", `
      <p style="margin:4px 0;color:#1a1a2e;">
        Your posts received ${grouped.reactions.length} reaction${grouped.reactions.length > 1 ? "s" : ""}. 🔥🌲💚✨
      </p>
    `);
  }

  if (grouped.circles.length > 0) {
    let lines = "";
    grouped.circles.forEach(n => {
      const actor = n.actor_id ? actorMap[n.actor_id] || "Someone" : "Someone";
      switch (n.notification_type) {
        case "reply": lines += `<p style="margin:4px 0;color:#1a1a2e;">${actor} replied to your post.</p>`; break;
        case "circle_accepted": lines += `<p style="margin:4px 0;color:#1a1a2e;">${actor} accepted your Circle request.</p>`; break;
        case "circle_request": lines += `<p style="margin:4px 0;color:#1a1a2e;">${actor} wants to join your Circle.</p>`; break;
        case "quote_post": lines += `<p style="margin:4px 0;color:#1a1a2e;">${actor} quoted your post.</p>`; break;
      }
    });
    sections += section("CIRCLES", lines);
  }

  if (grouped.invites.length > 0) {
    const count = grouped.invites.length;
    sections += section("INVITES", `
      <p style="margin:4px 0;color:#1a1a2e;">${count} ${count === 1 ? "person" : "people"} accepted your invite${count > 1 ? "s" : ""}.</p>
    `);
  }

  if (grouped.smoke_signals.length > 0) {
    sections += section("SMOKE SIGNALS", `
      <p style="margin:4px 0;color:#1a1a2e;">Someone sent you a smoke signal.</p>
    `);
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,'Times New Roman',serif;">
<div style="max-width:520px;margin:0 auto;padding:40px 24px;">
  <div style="text-align:center;margin-bottom:32px;">
    <p style="font-size:14px;color:#8b7355;letter-spacing:2px;margin:0;">UNDER PINES</p>
  </div>

  <div style="border-top:1px solid #d4c5a9;border-bottom:1px solid #d4c5a9;padding:24px 0;margin-bottom:24px;">
    <p style="font-size:18px;color:#1a1a2e;margin:0 0 8px;">Good morning, ${name}.</p>
    <p style="font-size:14px;color:#6b5e4f;margin:0;">Here's what happened in the Pines.</p>
  </div>

  ${sections}

  <div style="text-align:center;margin:32px 0;">
    <a href="https://underpines.com/" style="display:inline-block;padding:12px 24px;background:#c2752a;color:#f5f0e8;text-decoration:none;border-radius:24px;font-size:14px;">Enter the Pines →</a>
  </div>

  <div style="border-top:1px solid #d4c5a9;padding-top:24px;text-align:center;">
    <p style="font-size:11px;color:#8b7355;margin:0 0 8px;">You're receiving this because you're a member of Under Pines.</p>
    <p style="font-size:11px;margin:0;">
      <a href="https://underpines.com/settings/notifications" style="color:#8b7355;">Adjust Daily Ember time</a>
      &nbsp;·&nbsp;
      <a href="https://underpines.com/settings/notifications?unsubscribe=true" style="color:#8b7355;">Unsubscribe</a>
    </p>
  </div>
</div>
</body>
</html>`;
}

function section(title: string, content: string): string {
  return `
  <div style="margin-bottom:24px;border-bottom:1px solid #d4c5a9;padding-bottom:20px;">
    <p style="font-size:11px;color:#8b7355;letter-spacing:1.5px;margin:0 0 8px;font-weight:bold;">${title}</p>
    ${content}
  </div>`;
}
