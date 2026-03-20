import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slug } = await req.json();
    if (!slug) {
      return new Response(JSON.stringify({ valid: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Lookup invite by slug
    const { data: invite, error: invErr } = await supabase
      .from('invites')
      .select('id, is_infinite, is_active, uses_remaining')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (invErr || !invite) {
      return new Response(JSON.stringify({ valid: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For non-infinite invites, just check remaining uses
    if (!invite.is_infinite && invite.uses_remaining <= 0) {
      return new Response(JSON.stringify({ valid: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For infinite invites, enforce rate limits
    if (invite.is_infinite) {
      // Get client IP and hash it
      const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || req.headers.get('x-real-ip')
        || 'unknown';

      // Simple hash using SubtleCrypto
      const encoder = new TextEncoder();
      const data = encoder.encode(clientIp + '_invite_salt_underpines');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const ipHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Check rate limits via DB function
      const { data: result, error: rlErr } = await supabase
        .rpc('check_invite_rate_limit', {
          _invite_id: invite.id,
          _ip_hash: ipHash,
        });

      if (rlErr || !result?.allowed) {
        // Log the rate limit hit for Grove visibility
        await supabase.from('platform_settings').upsert({
          key: 'last_invite_rate_limit',
          value: JSON.stringify({
            reason: result?.reason || 'unknown',
            timestamp: new Date().toISOString(),
            ip_hash_prefix: ipHash.substring(0, 8),
          }),
        }, { onConflict: 'key' });

        return new Response(JSON.stringify({ valid: false, rate_limited: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Return the ip_hash so the client can pass it during signup
      return new Response(JSON.stringify({ valid: true, ip_hash: ipHash }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ valid: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('validate-invite error:', err);
    return new Response(JSON.stringify({ valid: false }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
