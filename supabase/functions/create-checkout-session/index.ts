import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    // The client picks a plan; the price IDs live server-side only. A raw
    // priceId is still accepted for compatibility but must match one of the
    // two known subscription prices — this Stripe account also holds cheap
    // per-collection prices, and an arbitrary priceId here would let a
    // member start a "Pines+" subscription at any of them (the webhook
    // grants is_pines_plus on completion). Fail closed if unconfigured.
    const monthlyPriceId = Deno.env.get("STRIPE_MONTHLY_PRICE_ID");
    const annualPriceId = Deno.env.get("STRIPE_ANNUAL_PRICE_ID");
    if (!monthlyPriceId || !annualPriceId) {
      return new Response(JSON.stringify({ error: "subscriptions_not_configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 503,
      });
    }

    const { priceId, plan } = await req.json();
    const resolvedPriceId =
      plan === "monthly" ? monthlyPriceId
      : plan === "annual" ? annualPriceId
      : priceId;
    if (resolvedPriceId !== monthlyPriceId && resolvedPriceId !== annualPriceId) {
      return new Response(JSON.stringify({ error: "unknown_plan" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: resolvedPriceId, quantity: 1 }],
      success_url: `${origin}/cabin?upgraded=true`,
      cancel_url: `${origin}/settings?cancelled=true`,
      metadata: { userId: user.id },
      subscription_data: {
        metadata: { userId: user.id },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
