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

    const webhookSecret = Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET");
    if (!webhookSecret) throw new Error("STRIPE_CONNECT_WEBHOOK_SECRET not set");

    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    console.log(`[STRIPE-CONNECT-WEBHOOK] Event: ${event.type}`);

    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      const accountId = account.id;

      const payoutsEnabled = account.payouts_enabled ?? false;
      const chargesEnabled = account.charges_enabled ?? false;
      let status = "pending";
      if (payoutsEnabled && chargesEnabled) status = "active";
      else if (account.requirements?.disabled_reason) status = "restricted";

      await supabase
        .from("creator_stripe_accounts")
        .update({
          payouts_enabled: payoutsEnabled,
          charges_enabled: chargesEnabled,
          account_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_account_id", accountId);

      console.log(`[STRIPE-CONNECT-WEBHOOK] Account ${accountId} updated: ${status}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[STRIPE-CONNECT-WEBHOOK] Error: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
