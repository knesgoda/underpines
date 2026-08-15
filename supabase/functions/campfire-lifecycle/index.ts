import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { requireCronSecret } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Scheduled background task: gated on the shared CRON_SECRET so it is not
  // callable from the public internet with the anon key.
  const cronError = requireCronSecret(req, undefined, corsHeaders);
  if (cronError) return cronError;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 1. Expire flickers past their expires_at
    await supabase
      .from('campfires')
      .update({ is_active: false })
      .eq('campfire_type', 'flicker')
      .eq('is_active', true)
      .lt('expires_at', new Date().toISOString())

    // 2. Mark campfires as embers (30+ days no messages)
    const { data: activeCampfires } = await supabase
      .from('campfires')
      .select('id')
      .eq('is_active', true)
      .eq('is_embers', false)

    if (activeCampfires) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

      for (const cf of activeCampfires) {
        const { data: lastMsg } = await supabase
          .from('campfire_messages')
          .select('created_at')
          .eq('campfire_id', cf.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!lastMsg || (lastMsg.created_at && lastMsg.created_at < thirtyDaysAgo)) {
          await supabase
            .from('campfires')
            .update({ is_embers: true })
            .eq('id', cf.id)
        }
      }
    }

    // 3. Reset embers when new messages exist
    const { data: emberCampfires } = await supabase
      .from('campfires')
      .select('id')
      .eq('is_embers', true)
      .eq('is_active', true)

    if (emberCampfires) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

      for (const cf of emberCampfires) {
        const { data: recentMsg } = await supabase
          .from('campfire_messages')
          .select('created_at')
          .eq('campfire_id', cf.id)
          .gt('created_at', thirtyDaysAgo)
          .limit(1)
          .maybeSingle()

        if (recentMsg) {
          await supabase
            .from('campfires')
            .update({ is_embers: false })
            .eq('id', cf.id)
        }
      }
    }

    // Message fading is gone: it existed only as the free-tier limit of the
    // retired Pines+ subscription. Messages now keep their content
    // indefinitely; `is_faded` remains on rows faded before the retirement.

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
