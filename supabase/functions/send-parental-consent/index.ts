// LEGAL-REVIEW-NEEDED: Parental consent email for COPPA compliance (ages 13-17)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { parentEmail, childDisplayName, childEmail } = await req.json();

    if (!parentEmail || !childDisplayName || !childEmail) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Hash the parent email for storage
    const encoder = new TextEncoder();
    const data = encoder.encode(parentEmail.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const parentEmailHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Generate unique consent token
    const consentToken = crypto.randomUUID();

    // Find the user by email (they should have just signed up)
    const { data: userData } = await supabase.auth.admin.listUsers();
    const childUser = userData?.users?.find(
      (u: any) => u.email?.toLowerCase() === childEmail.toLowerCase()
    );

    if (!childUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create consent request record
    await supabase.from('parental_consent_requests').insert({
      user_id: childUser.id,
      parent_email_hash: parentEmailHash,
      consent_token: consentToken,
      status: 'pending',
    });

    // Update profile to pending consent status
    await supabase.from('profiles').update({
      account_status: 'pending_parental_consent',
      age_bracket: '13_to_17',
      is_age_verified: true,
    }).eq('id', childUser.id);

    // LEGAL-REVIEW-NEEDED: Send actual email via configured email provider
    // For now, log the consent URL
    const consentUrl = `${supabaseUrl}/functions/v1/handle-parental-consent?token=${consentToken}&action=approve`;
    const declineUrl = `${supabaseUrl}/functions/v1/handle-parental-consent?token=${consentToken}&action=decline`;

    // Try sending via Resend if configured
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Under Pines <noreply@underpines.com>',
          to: parentEmail,
          subject: `${childDisplayName} wants to join Under Pines`,
          text: `Someone using the name ${childDisplayName} listed you as their parent or guardian while signing up for Under Pines — a small, invite-only social platform.

Under Pines is built around privacy, warmth, and real human connection. There are no ads, no algorithms, and no public engagement metrics. Messages are private. Nothing is sold.

To approve their account: ${consentUrl}

To decline: ${declineUrl}

If you didn't expect this email, you can safely ignore it. The account will be deleted automatically in 72 hours without your approval.

— Under Pines`,
        }),
      });
    } else {
      console.log('[PARENTAL CONSENT] Email would be sent to:', parentEmail);
      console.log('[PARENTAL CONSENT] Approve URL:', consentUrl);
      console.log('[PARENTAL CONSENT] Decline URL:', declineUrl);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Parental consent error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
