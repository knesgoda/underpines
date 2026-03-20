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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Not authenticated");

    const { designId } = await req.json();
    if (!designId) throw new Error("Missing designId");

    const { data: design } = await supabase.from("cabin_designs").select("*").eq("id", designId).eq("status", "published").single();
    if (!design) throw new Error("Design not found");
    if (design.price_cents === 0) throw new Error("This design is free");

    // Check not already purchased
    const { data: existing } = await supabase.from("design_purchases").select("id").eq("design_id", designId).eq("buyer_id", user.id).maybeSingle();
    if (existing) throw new Error("Already purchased");

    const { data: creatorAccount } = await supabase
      .from("creator_stripe_accounts")
      .select("stripe_account_id, charges_enabled")
      .eq("user_id", design.creator_id)
      .single();

    if (!creatorAccount?.charges_enabled) throw new Error("Creator has not completed Stripe onboarding");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Use existing stripe price or create one
    let priceId = design.stripe_price_id;
    if (!priceId) {
      const product = await stripe.products.create({
        name: `Cabin Design: ${design.name}`,
        metadata: { designId: design.id },
      });
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: design.price_cents,
        currency: "usd",
      });
      priceId = price.id;
      await supabase.from("cabin_designs").update({
        stripe_product_id: product.id,
        stripe_price_id: price.id,
      }).eq("id", design.id);
    }

    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    const customerId = customers.data[0]?.id;
    const origin = req.headers.get("origin") || "https://underpines.com";
    const feeAmount = Math.floor(design.price_cents * 0.05);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      payment_intent_data: {
        application_fee_amount: feeAmount,
        transfer_data: { destination: creatorAccount.stripe_account_id },
        metadata: { designId, buyerId: user.id, type: "design" },
      },
      success_url: `${origin}/marketplace/${designId}?purchased=true`,
      cancel_url: `${origin}/marketplace/${designId}`,
      metadata: { designId, buyerId: user.id, type: "design" },
      customer: customerId || undefined,
      customer_email: customerId ? undefined : user.email!,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[CREATE-DESIGN-CHECKOUT]", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
