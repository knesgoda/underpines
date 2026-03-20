// LEGAL-REVIEW-NEEDED: Parental consent handler for COPPA compliance

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const action = url.searchParams.get('action'); // 'approve' or 'decline'

  if (!token || !action) {
    return new Response(html('Missing parameters.', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Look up the consent request
  const { data: consent, error } = await supabase
    .from('parental_consent_requests')
    .select('*')
    .eq('consent_token', token)
    .eq('status', 'pending')
    .maybeSingle();

  if (error || !consent) {
    return new Response(html('This link has expired or already been used.', false), {
      status: 404,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // Check if expired (72 hours)
  if (new Date(consent.expires_at) < new Date()) {
    return new Response(html('This consent request has expired. The account has been removed.', false), {
      status: 410,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  if (action === 'approve') {
    // Activate the account
    await supabase.from('parental_consent_requests').update({
      status: 'approved',
      responded_at: new Date().toISOString(),
    }).eq('id', consent.id);

    await supabase.from('profiles').update({
      account_status: 'active',
    }).eq('id', consent.user_id);

    return new Response(html(
      'Thank you. Their Cabin is now ready. 🌲',
      true
    ), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  if (action === 'decline') {
    // Mark declined and suspend the account
    await supabase.from('parental_consent_requests').update({
      status: 'declined',
      responded_at: new Date().toISOString(),
    }).eq('id', consent.id);

    await supabase.from('profiles').update({
      account_status: 'suspended',
    }).eq('id', consent.user_id);

    return new Response(html(
      'Understood. The account has been deactivated.',
      true
    ), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  return new Response(html('Invalid action.', false), {
    status: 400,
    headers: { 'Content-Type': 'text/html' },
  });
});

function html(message: string, success: boolean): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Under Pines — Parental Consent</title>
  <style>
    body {
      font-family: Georgia, serif;
      background: #052e16;
      color: #dcfce7;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
    }
    .card {
      max-width: 420px;
      text-align: center;
      padding: 48px 32px;
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 20px; margin-bottom: 12px; }
    p { font-size: 14px; opacity: 0.7; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '🌲' : '⚠️'}</div>
    <h1>${message}</h1>
    <p>— Under Pines</p>
  </div>
</body>
</html>`;
}
