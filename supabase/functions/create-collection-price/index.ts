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

    // Get collection
    const { data: col } = await supabase
      .from("collections")
      .select("*")
      .eq("id", collectionId)
      .eq("author_id", user.id)
      .single();
    if (!col) throw new Error("Collection not found or not owned by you");
    if (!col.is_paid || !col.price_cents) throw new Error("Collection is not paid");

    // Check if price already exists
    const { data: existingPrice } = await supabase
      .from("collection_stripe_prices")
      .select("*")
      .eq("collection_id", collectionId)
      .maybeSingle();
    if (existingPrice) {
      return new Response(JSON.stringify({ priceId: existingPrice.stripe_price_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const product = await stripe.products.create({
      name: col.title,
      description: col.description || undefined,
      metadata: { collectionId: col.id, creatorId: col.author_id },
    });

    const priceType = col.price_type === "month" || col.price_type === "monthly" ? "monthly" : "one_time";

    const priceParams: any = {
      product: product.id,
      unit_amount: col.price_cents,
      currency: "usd",
    };
    if (priceType === "monthly") {
      priceParams.recurring = { interval: "month" };
    }

    const price = await stripe.prices.create(priceParams);

    await supabase.from("collection_stripe_prices").insert({
      collection_id: col.id,
      stripe_price_id: price.id,
      stripe_product_id: product.id,
      amount_cents: col.price_cents,
      price_type: priceType,
    });

    console.log(`[CREATE-COLLECTION-PRICE] Created price ${price.id} for collection ${col.id}`);

    return new Response(JSON.stringify({ priceId: price.id, productId: product.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[CREATE-COLLECTION-PRICE]", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
