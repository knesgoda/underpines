import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id });

    // First check our local table for cached subscription data
    const { data: localSub } = await supabaseClient
      .from("pines_plus_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;

    // Query active subscriptions first
    const activeSubs = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    // Filter to only Pines+ subscriptions (not collection subs)
    const monthlyPriceId = Deno.env.get("STRIPE_MONTHLY_PRICE_ID");
    const annualPriceId = Deno.env.get("STRIPE_ANNUAL_PRICE_ID");
    const pinesPriceIds = [monthlyPriceId, annualPriceId].filter(Boolean);

    let pinesSub = activeSubs.data.find(s => {
      const priceId = s.items.data[0]?.price.id;
      return pinesPriceIds.includes(priceId);
    });

    // If no active, check trialing
    if (!pinesSub) {
      const trialSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "trialing",
        limit: 10,
      });
      pinesSub = trialSubs.data.find(s => {
        const priceId = s.items.data[0]?.price.id;
        return pinesPriceIds.includes(priceId);
      });
    }

    // If no active/trialing, check past_due
    if (!pinesSub) {
      const pastDueSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "past_due",
        limit: 10,
      });
      pinesSub = pastDueSubs.data.find(s => {
        const priceId = s.items.data[0]?.price.id;
        return pinesPriceIds.includes(priceId);
      });
    }

    if (!pinesSub) {
      logStep("No Pines+ subscription found");

      // Sync local state if it's stale
      if (localSub && localSub.status === "active") {
        await supabaseClient.from("pines_plus_subscriptions")
          .update({ status: "expired" })
          .eq("user_id", user.id);
        await supabaseClient.from("profiles")
          .update({ is_pines_plus: false })
          .eq("id", user.id);
      }

      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const priceId = pinesSub.items.data[0]?.price.id;
    const plan = priceId === monthlyPriceId ? "monthly" : "annual";
    const periodEnd = new Date(pinesSub.current_period_end * 1000).toISOString();
    const status = pinesSub.cancel_at_period_end ? "cancelled" : pinesSub.status;

    logStep("Found Pines+ subscription", { plan, status, periodEnd });

    // Sync local table
    await supabaseClient.from("pines_plus_subscriptions").upsert({
      user_id: user.id,
      stripe_subscription_id: pinesSub.id,
      stripe_customer_id: customerId,
      plan,
      status: status === "cancelled" ? "cancelled" : pinesSub.status,
      current_period_end: periodEnd,
    }, { onConflict: "user_id" });

    // Ensure profile flag is correct
    const isActive = pinesSub.status === "active" || pinesSub.status === "trialing";
    await supabaseClient.from("profiles")
      .update({ is_pines_plus: isActive })
      .eq("id", user.id);

    return new Response(JSON.stringify({
      subscribed: isActive,
      status,
      plan,
      subscription_end: periodEnd,
      cancel_at_period_end: pinesSub.cancel_at_period_end,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
