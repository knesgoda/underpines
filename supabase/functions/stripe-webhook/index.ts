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

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) throw new Error("No Stripe signature");

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not set");

    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    console.log(`[STRIPE-WEBHOOK] Event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metaType = session.metadata?.type;

        // --- Collection checkout ---
        if (metaType === "collection") {
          const collectionId = session.metadata?.collectionId;
          const subscriberId = session.metadata?.subscriberId;
          if (!collectionId || !subscriberId) break;

          const subscriptionId = session.subscription as string | null;
          const customerId = session.customer as string;

          // Create collection_subscriptions row
          await supabase.from("collection_subscriptions").upsert({
            collection_id: collectionId,
            subscriber_id: subscriberId,
            stripe_subscription_id: subscriptionId || session.payment_intent as string,
            status: "active",
            started_at: new Date().toISOString(),
          }, { onConflict: "collection_id,subscriber_id" });

          // Get collection for earnings
          const { data: col } = await supabase.from("collections").select("author_id, price_cents, title").eq("id", collectionId).single();
          if (col) {
            const amount = col.price_cents || 0;
            const fee = Math.floor(amount * 0.05);
            await supabase.from("creator_earnings").insert({
              creator_id: col.author_id,
              collection_id: collectionId,
              subscriber_id: subscriberId,
              amount_cents: amount,
              platform_fee_cents: fee,
              creator_amount_cents: amount - fee,
              stripe_payment_intent_id: (session.payment_intent as string) || null,
            });

            // Notify creator
            await supabase.from("notifications").insert({
              recipient_id: col.author_id,
              actor_id: subscriberId,
              notification_type: "collection_subscriber",
              collection_id: collectionId,
              is_delivered_in_ember: false,
            });
          }

          console.log(`[STRIPE-WEBHOOK] Collection subscription activated: ${collectionId} for ${subscriberId}`);
          break;
        }

        // --- Design checkout ---
        if (metaType === "design") {
          const designId = session.metadata?.designId;
          const buyerId = session.metadata?.buyerId;
          if (!designId || !buyerId) break;

          const { data: design } = await supabase.from("cabin_designs").select("*").eq("id", designId).single();
          if (!design) break;

          const amount = design.price_cents || 0;
          const fee = Math.floor(amount * 0.05);

          await supabase.from("design_purchases").upsert({
            design_id: designId,
            buyer_id: buyerId,
            creator_id: design.creator_id,
            amount_cents: amount,
            platform_fee_cents: fee,
            creator_amount_cents: amount - fee,
            stripe_payment_intent_id: (session.payment_intent as string) || null,
          }, { onConflict: "design_id,buyer_id" });

          await supabase.from("cabin_designs").update({
            purchases: (design.purchases || 0) + 1,
          }).eq("id", designId);

          // Creator earnings
          await supabase.from("creator_earnings").insert({
            creator_id: design.creator_id,
            subscriber_id: buyerId,
            amount_cents: amount,
            platform_fee_cents: fee,
            creator_amount_cents: amount - fee,
            stripe_payment_intent_id: (session.payment_intent as string) || null,
          });

          // Notify creator
          await supabase.from("notifications").insert({
            recipient_id: design.creator_id,
            actor_id: buyerId,
            notification_type: "design_purchased",
            is_delivered_in_ember: true,
          });

          console.log(`[STRIPE-WEBHOOK] Design purchased: ${designId} by ${buyerId}`);
          break;
        }

        // --- Pines+ checkout (existing) ---
        const userId = session.metadata?.userId;
        if (!userId) break;

        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0]?.price.id;
        const monthlyPriceId = Deno.env.get("STRIPE_MONTHLY_PRICE_ID");
        const plan = priceId === monthlyPriceId ? "monthly" : "annual";

        await supabase.from("pines_plus_subscriptions").upsert({
          user_id: userId,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          plan,
          status: "active",
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        }, { onConflict: "user_id" });

        await supabase.from("profiles").update({ is_pines_plus: true }).eq("id", userId);

        await supabase.from("notifications").insert({
          recipient_id: userId,
          notification_type: "system",
          is_delivered_in_ember: false,
        });

        console.log(`[STRIPE-WEBHOOK] Pines+ activated for user ${userId}`);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;

        // Check if this is a collection subscription
        if (sub.metadata?.type === "collection") {
          const collectionId = sub.metadata?.collectionId;
          const subscriberId = sub.metadata?.subscriberId;
          if (!collectionId || !subscriberId) break;

          const status = sub.cancel_at_period_end ? "cancelled" : sub.status === "active" ? "active" : sub.status;
          await supabase.from("collection_subscriptions")
            .update({ status })
            .eq("collection_id", collectionId)
            .eq("subscriber_id", subscriberId);

          console.log(`[STRIPE-WEBHOOK] Collection sub updated: ${collectionId} → ${status}`);
          break;
        }

        // Pines+ subscription
        const userId = sub.metadata?.userId;
        if (!userId) break;

        const status = sub.cancel_at_period_end ? "cancelled" : sub.status === "active" ? "active" : sub.status;

        await supabase.from("pines_plus_subscriptions").update({
          status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        }).eq("user_id", userId);

        if (sub.status === "active" && !sub.cancel_at_period_end) {
          await supabase.from("profiles").update({ is_pines_plus: true }).eq("id", userId);
        }

        console.log(`[STRIPE-WEBHOOK] Subscription updated for user ${userId}: ${status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        if (sub.metadata?.type === "collection") {
          const collectionId = sub.metadata?.collectionId;
          const subscriberId = sub.metadata?.subscriberId;
          if (collectionId && subscriberId) {
            await supabase.from("collection_subscriptions")
              .update({ status: "expired" })
              .eq("collection_id", collectionId)
              .eq("subscriber_id", subscriberId);
            console.log(`[STRIPE-WEBHOOK] Collection sub deleted: ${collectionId}`);
          }
          break;
        }

        const userId = sub.metadata?.userId;
        if (!userId) break;

        await supabase.from("pines_plus_subscriptions").update({
          status: "expired",
        }).eq("user_id", userId);

        await supabase.from("profiles").update({ is_pines_plus: false }).eq("id", userId);

        console.log(`[STRIPE-WEBHOOK] Subscription deleted for user ${userId}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const sub = invoice.subscription
          ? await stripe.subscriptions.retrieve(invoice.subscription as string)
          : null;
        const userId = sub?.metadata?.userId;
        if (!userId) break;

        await supabase.from("pines_plus_subscriptions").update({
          status: "past_due",
        }).eq("user_id", userId);

        await supabase.from("notifications").insert({
          recipient_id: userId,
          notification_type: "system",
          is_delivered_in_ember: false,
        });

        console.log(`[STRIPE-WEBHOOK] Payment failed for user ${userId}`);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[STRIPE-WEBHOOK] Error: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
