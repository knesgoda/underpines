import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireCronSecret } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Scheduled maintenance task: gated on the shared CRON_SECRET so it is not
  // callable from the public internet.
  const cronError = requireCronSecret(req, undefined, corsHeaders);
  if (cronError) return cronError;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const now = new Date().toISOString();

    // Activate events that should be active
    const { data: toActivate } = await supabase
      .from("seasonal_events")
      .update({ is_active: true })
      .lte("starts_at", now)
      .gt("ends_at", now)
      .eq("is_active", false)
      .select("id, name");

    // Deactivate events that have ended
    const { data: toDeactivate } = await supabase
      .from("seasonal_events")
      .update({ is_active: false })
      .lte("ends_at", now)
      .eq("is_active", true)
      .select("id, name");

    console.log(`[SEASONAL] Activated: ${toActivate?.length || 0}, Deactivated: ${toDeactivate?.length || 0}`);

    return new Response(JSON.stringify({
      activated: toActivate?.length || 0,
      deactivated: toDeactivate?.length || 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[SEASONAL] Error: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
