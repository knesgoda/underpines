/**
 * Client wrappers for the Trail System (invites/trust) RPCs and tables.
 *
 * The generated Database types in src/integrations/supabase/types.ts predate
 * these tables, so calls go through an untyped client handle with explicit
 * result interfaces here. Regenerate types and fold these in when the schema
 * lands in the generator (same convention as age_gate_audit_log usage).
 *
 * Everything security-relevant is enforced server-side — these wrappers only
 * shape requests and responses.
 */
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface TrailPassStatus {
  valid: boolean;
  reason?: 'not_found' | 'expired' | 'already_used' | 'paused' | 'revoked';
  invitee_email?: string;
  invitee_name?: string | null;
  personal_message?: string | null;
  inviter_name?: string | null;
  expires_at?: string;
}

export interface TrailPass {
  id: string;
  invitee_email_normalized: string;
  invitee_name: string | null;
  status: 'PENDING' | 'REDEEMED' | 'EXPIRED' | 'REVOKED' | 'PAUSED';
  created_at: string;
  expires_at: string;
  redeemed_at: string | null;
  redeemed_by_user_id: string | null;
}

export interface InviteSummary {
  success: boolean;
  error?: string;
  available_passes: number;
  maximum_passes: number;
  eligible: boolean;
  frozen: boolean;
}

export interface CreatePassResult {
  success: boolean;
  error?: string;
  pass_id?: string;
  token?: string;
  expires_at?: string;
}

export async function getTrailPassStatus(token: string): Promise<TrailPassStatus> {
  const { data, error } = await db.rpc('get_trail_pass_status', { _token: token });
  if (error) return { valid: false, reason: 'not_found' };
  return data as TrailPassStatus;
}

export async function refreshMyInvites(): Promise<InviteSummary> {
  const { data, error } = await db.rpc('refresh_my_invites');
  if (error) {
    return { success: false, error: error.message, available_passes: 0, maximum_passes: 0, eligible: false, frozen: false };
  }
  return data as InviteSummary;
}

export async function createTrailPass(
  email: string,
  name?: string,
  message?: string,
): Promise<CreatePassResult> {
  const { data, error } = await db.rpc('create_trail_pass', {
    _invitee_email: email,
    _invitee_name: name ?? null,
    _personal_message: message ?? null,
  });
  if (error) return { success: false, error: error.message };
  return data as CreatePassResult;
}

export async function revokeTrailPass(passId: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await db.rpc('revoke_trail_pass', { _pass_id: passId });
  if (error) return { success: false, error: error.message };
  return data as { success: boolean; error?: string };
}

export async function listMyTrailPasses(userId: string): Promise<TrailPass[]> {
  const { data } = await db
    .from('trail_passes')
    .select('id, invitee_email_normalized, invitee_name, status, created_at, expires_at, redeemed_at, redeemed_by_user_id')
    .eq('inviter_user_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []) as TrailPass[];
}

/** Emails the pass to its recipient. Degrades to link-sharing when email is unconfigured. */
export async function sendTrailPassEmail(
  passId: string,
  token: string,
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-trail-pass', {
      body: { pass_id: passId, token },
    });
    if (error) return { sent: false, reason: 'invoke_failed' };
    return data as { sent: boolean; reason?: string };
  } catch {
    return { sent: false, reason: 'invoke_failed' };
  }
}

/** Fire-and-forget post-signup risk evaluation. Never blocks the user. */
export function evaluateSignupRisk(turnstileToken?: string | null): void {
  supabase.functions
    .invoke('evaluate-signup-risk', { body: { turnstile_token: turnstileToken ?? null } })
    .catch(() => {});
}

export async function submitAppeal(
  userId: string,
  appealText: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await db.from('appeals').insert({
    user_id: userId,
    appeal_text: appealText,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getMyOpenAppeal(userId: string): Promise<{ id: string; status: string; created_at: string } | null> {
  const { data } = await db
    .from('appeals')
    .select('id, status, created_at')
    .eq('user_id', userId)
    .in('status', ['OPEN', 'IN_REVIEW'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
