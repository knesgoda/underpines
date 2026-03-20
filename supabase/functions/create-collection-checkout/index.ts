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

    const { collectionId } = await req.json();
    if (!collectionId) throw new Error("Missing collectionId");

    // Get collection + price + creator connect account
    const { data: col } = await supabase.from("collections").select("*").eq("id", collectionId).single();
    if (!col) throw new Error("Collection not found");

    const { data: stripePrice } = await supabase
      .from("collection_stripe_prices")
      .select("*")
      .eq("collection_id", collectionId)
      .single();
    if (!stripePrice) throw new Error("No Stripe price for this collection. Publish it first.");

    const { data: creatorAccount } = await supabase
      .from("creator_stripe_accounts")
      .select("stripe_account_id, charges_enabled")
      .eq("user_id", col.author_id)
      .single();
    if (!creatorAccount || !creatorAccount.charges_enabled) {
      throw new Error("Creator has not completed Stripe onboarding");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create customer
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId = customers.data[0]?.id;

    const origin = req.headers.get("origin") || "https://underpines.com";
    const { data: creatorProfile } = await supabase.from("profiles").select("handle").eq("id", col.author_id).single();
    const handle = creatorProfile?.handle || "creator";

    const isSubscription = stripePrice.price_type === "monthly";
    const feeAmount = Math.floor(stripePrice.amount_cents * 0.05);

    const sessionParams: any = {
      payment_method_types: ["card"],
      mode: isSubscription ? "subscription" : "payment",
      line_items: [{ price: stripePrice.stripe_price_id, quantity: 1 }],
      success_url: `${origin}/${handle}/collections/${collectionId}?subscribed=true`,
      cancel_url: `${origin}/${handle}/collections/${collectionId}`,
      metadata: { collectionId, subscriberId: user.id, type: "collection" },
      customer: customerId || undefined,
      customer_email: customerId ? undefined : user.email!,
    };

    if (isSubscription) {
      sessionParams.subscription_data = {
        application_fee_percent: 5,
        transfer_data: { destination: creatorAccount.stripe_account_id },
        metadata: { collectionId, subscriberId: user.id, type: "collection" },
      };
    } else {
      sessionParams.payment_intent_data = {
        application_fee_amount: feeAmount,
        transfer_data: { destination: creatorAccount.stripe_account_id },
        metadata: { collectionId, subscriberId: user.id, type: "collection" },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`[CREATE-COLLECTION-CHECKOUT] Session ${session.id} for collection ${collectionId}`);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[CREATE-COLLECTION-CHECKOUT]", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
