import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

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

    // 4. Fade messages older than 6 months for non-Pines+ users
    const sixMonthsAgo = new Date(Date.now() - 180 * 86400000).toISOString()

    const { data: oldMessages } = await supabase
      .from('campfire_messages')
      .select('id, sender_id, campfire_id')
      .eq('is_faded', false)
      .lt('created_at', sixMonthsAgo)
      .limit(100)

    if (oldMessages) {
      for (const msg of oldMessages) {
        // Check if sender is Pines+
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_pines_plus')
          .eq('id', msg.sender_id)
          .maybeSingle()

        if (!profile?.is_pines_plus) {
          await supabase
            .from('campfire_messages')
            .update({ is_faded: true, content: null })
            .eq('id', msg.id)
        }
      }
    }

    // 5. Send 5-month warning notifications
    const fiveMonthsAgo = new Date(Date.now() - 150 * 86400000).toISOString()
    const fiveMonthsPlus1 = new Date(Date.now() - 151 * 86400000).toISOString()

    const { data: warningMessages } = await supabase
      .from('campfire_messages')
      .select('sender_id, campfire_id')
      .eq('is_faded', false)
      .lt('created_at', fiveMonthsAgo)
      .gt('created_at', fiveMonthsPlus1)
      .limit(50)

    if (warningMessages) {
      const notifiedUsers = new Set<string>()
      for (const msg of warningMessages) {
        if (notifiedUsers.has(msg.sender_id)) continue
        notifiedUsers.add(msg.sender_id)

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_pines_plus')
          .eq('id', msg.sender_id)
          .maybeSingle()

        if (!profile?.is_pines_plus) {
          await supabase.from('notifications').insert({
            recipient_id: msg.sender_id,
            notification_type: 'campfire_message',
            campfire_id: msg.campfire_id,
            is_delivered_in_ember: true,
          })
        }
      }
    }

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
