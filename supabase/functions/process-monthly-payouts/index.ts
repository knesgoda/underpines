import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    console.log(`[PROCESS-PAYOUTS] Processing ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

    // Get all pending earnings grouped by creator
    const { data: earnings } = await supabase
      .from("creator_earnings")
      .select("*")
      .eq("status", "pending")
      .gte("earned_at", periodStart.toISOString())
      .lt("earned_at", periodEnd.toISOString());

    if (!earnings || earnings.length === 0) {
      console.log("[PROCESS-PAYOUTS] No pending earnings");
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by creator
    const byCreator = new Map<string, typeof earnings>();
    for (const e of earnings) {
      const arr = byCreator.get(e.creator_id) || [];
      arr.push(e);
      byCreator.set(e.creator_id, arr);
    }

    let processed = 0;

    for (const [creatorId, creatorEarnings] of byCreator) {
      const total = creatorEarnings.reduce((s, e) => s + e.amount_cents, 0);
      const platformFee = creatorEarnings.reduce((s, e) => s + e.platform_fee_cents, 0);
      const creatorAmount = creatorEarnings.reduce((s, e) => s + e.creator_amount_cents, 0);
      const subscriberIds = new Set(creatorEarnings.map(e => e.subscriber_id).filter(Boolean));

      // Minimum payout: $10 (1000 cents)
      if (creatorAmount < 1000) {
        console.log(`[PROCESS-PAYOUTS] Creator ${creatorId} has $${(creatorAmount / 100).toFixed(2)} — under $10 minimum, rolling over`);
        continue;
      }

      // Create payout summary
      await supabase.from("creator_payout_summaries").insert({
        creator_id: creatorId,
        period_start: periodStart.toISOString().split("T")[0],
        period_end: periodEnd.toISOString().split("T")[0],
        total_earnings_cents: total,
        platform_fee_cents: platformFee,
        creator_amount_cents: creatorAmount,
        subscriber_count: subscriberIds.size,
        status: "paid", // Stripe Connect handles actual transfers at checkout time
      });

      // Mark earnings as paid
      const earningIds = creatorEarnings.map(e => e.id);
      for (const eid of earningIds) {
        await supabase.from("creator_earnings").update({ status: "paid" }).eq("id", eid);
      }

      // Notify creator
      await supabase.from("notifications").insert({
        recipient_id: creatorId,
        notification_type: "system",
        is_delivered_in_ember: false,
      });

      processed++;
      console.log(`[PROCESS-PAYOUTS] Processed payout for creator ${creatorId}: $${(creatorAmount / 100).toFixed(2)}`);
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[PROCESS-PAYOUTS] Error: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
