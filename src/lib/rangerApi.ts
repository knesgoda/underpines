/**
 * Ranger Station client wrappers.
 *
 * Reads go through RLS (ranger-scoped policies on moderation_cases,
 * risk_signals, user_trust, appeals, admin_audit_log, …). Writes go through
 * SECURITY DEFINER RPCs that re-verify the caller's ranger level server-side
 * and append to the audit log. Nothing here grants anything — it only shapes
 * requests.
 */
import { supabase } from '@/integrations/supabase/client';

// New tables aren't in the generated Database types yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface ModerationCase {
  id: string;
  case_number: number;
  case_type: string;
  subject_user_id: string | null;
  status: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  summary: string | null;
  risk_score_at_creation: number | null;
  auto_generated: boolean;
  assigned_ranger_id: string | null;
  resolution: string | null;
  resolution_reason_code: string | null;
  created_at: string;
  subject?: { handle: string; display_name: string; created_at: string } | null;
}

export interface RiskSignalRow {
  id: string;
  signal_type: string;
  severity: string;
  confidence: number | null;
  observed_value: Record<string, unknown> | null;
  explanation: string;
  source: string;
  created_at: string;
  expires_at: string | null;
  policy_version: string | null;
}

export interface UserTrustRow {
  trust_state: string;
  moderation_state: string;
  risk_level: string;
  risk_updated_at: string | null;
}

export interface TrailNode {
  user_id: string;
  handle: string;
  display_name: string;
  relation: 'self' | 'ancestor' | 'descendant';
  depth: number;
  invited_by_user_id: string | null;
  account_created_at: string;
  trust_state: string;
  risk_level: string;
  moderation_state: string;
  invites_frozen: boolean;
  is_suspended: boolean;
  report_count: number;
}

export interface AppealRow {
  id: string;
  user_id: string;
  case_id: string | null;
  appeal_text: string;
  status: string;
  outcome: string | null;
  outcome_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  appellant?: { handle: string; display_name: string } | null;
}

export interface AuditRow {
  id: string;
  actor_admin_id: string | null;
  action_type: string;
  target_type: string;
  target_id: string | null;
  case_id: string | null;
  reason_code: string | null;
  notes: string | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  created_at: string;
  actor?: { handle: string; display_name: string } | null;
}

/** Structured reason codes (spec §52). */
export const REASON_CODES = [
  'CONFIRMED_AUTOMATION',
  'SPAM_NETWORK',
  'SCAM_ACTIVITY',
  'COMPROMISED_ACCOUNT',
  'INVITATION_ABUSE',
  'REPORT_BRIGADING',
  'FALSE_POSITIVE_REVERSAL',
  'USER_APPEAL_APPROVED',
  'POLICY_VIOLATION_OTHER',
] as const;

export async function listCases(statusFilter: 'open' | 'closed'): Promise<ModerationCase[]> {
  let query = db
    .from('moderation_cases')
    .select('*, subject:profiles!moderation_cases_subject_user_id_fkey(handle, display_name, created_at)')
    .order('created_at', { ascending: false })
    .limit(100);
  query = statusFilter === 'open' ? query.neq('status', 'CLOSED') : query.eq('status', 'CLOSED');
  const { data } = await query;
  return (data ?? []) as ModerationCase[];
}

export async function getCase(caseId: string): Promise<ModerationCase | null> {
  const { data } = await db
    .from('moderation_cases')
    .select('*, subject:profiles!moderation_cases_subject_user_id_fkey(handle, display_name, created_at)')
    .eq('id', caseId)
    .maybeSingle();
  return (data ?? null) as ModerationCase | null;
}

export async function getUserTrust(userId: string): Promise<UserTrustRow | null> {
  const { data } = await db
    .from('user_trust')
    .select('trust_state, moderation_state, risk_level, risk_updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  return (data ?? null) as UserTrustRow | null;
}

export async function listSignals(userId: string): Promise<RiskSignalRow[]> {
  const { data } = await db
    .from('risk_signals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []) as RiskSignalRow[];
}

export async function getTrailLineage(userId: string, depth = 3): Promise<TrailNode[]> {
  const { data, error } = await db.rpc('get_trail_lineage', {
    _user_id: userId,
    _max_depth: depth,
  });
  if (error) return [];
  return (data ?? []) as TrailNode[];
}

export async function listAppeals(open: boolean): Promise<AppealRow[]> {
  let query = db
    .from('appeals')
    .select('*, appellant:profiles!appeals_user_id_fkey(handle, display_name)')
    .order('created_at', { ascending: false })
    .limit(100);
  query = open ? query.in('status', ['OPEN', 'IN_REVIEW']) : query.not('status', 'in', '(OPEN,IN_REVIEW)');
  const { data } = await query;
  return (data ?? []) as AppealRow[];
}

export async function listAuditLog(): Promise<AuditRow[]> {
  const { data } = await db
    .from('admin_audit_log')
    .select('*, actor:profiles!admin_audit_log_actor_admin_id_fkey(handle, display_name)')
    .order('created_at', { ascending: false })
    .limit(200);
  return (data ?? []) as AuditRow[];
}

export interface RangerActionResult {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

/** All ranger action RPCs share the {success, error} envelope. */
async function callRpc(fn: string, args: Record<string, unknown>): Promise<RangerActionResult> {
  const { data, error } = await db.rpc(fn, args);
  if (error) return { success: false, error: error.message };
  return data as RangerActionResult;
}

export const rangerActions = {
  markSafe: (target: string, caseId: string | null, notes: string | null) =>
    callRpc('ranger_mark_safe', { _target: target, _case_id: caseId, _notes: notes }),
  requireVerification: (target: string, caseId: string | null, notes: string | null) =>
    callRpc('ranger_require_verification', { _target: target, _case_id: caseId, _notes: notes }),
  restrict: (target: string, reasonCode: string, caseId: string | null, notes: string | null, days: number | null) =>
    callRpc('ranger_restrict', { _target: target, _reason_code: reasonCode, _case_id: caseId, _notes: notes, _days: days }),
  unrestrict: (target: string, caseId: string | null, notes: string | null) =>
    callRpc('ranger_unrestrict', { _target: target, _case_id: caseId, _notes: notes }),
  freezeInvites: (target: string, reasonCode: string, caseId: string | null, notes: string | null) =>
    callRpc('ranger_freeze_invites', { _target: target, _reason_code: reasonCode, _case_id: caseId, _notes: notes }),
  unfreezeInvites: (target: string, caseId: string | null, notes: string | null) =>
    callRpc('ranger_unfreeze_invites', { _target: target, _case_id: caseId, _notes: notes }),
  revokeOutstandingInvites: (target: string, reasonCode: string, caseId: string | null, notes: string | null) =>
    callRpc('ranger_revoke_outstanding_invites', { _target: target, _reason_code: reasonCode, _case_id: caseId, _notes: notes }),
  closeTrail: (root: string, includeDescendants: boolean, reasonCode: string, caseId: string | null, notes: string | null) =>
    callRpc('ranger_close_trail', { _root: root, _include_descendants: includeDescendants, _reason_code: reasonCode, _case_id: caseId, _notes: notes }),
  reopenTrail: (root: string, includeDescendants: boolean, caseId: string | null, notes: string | null) =>
    callRpc('ranger_reopen_trail', { _root: root, _include_descendants: includeDescendants, _case_id: caseId, _notes: notes }),
  warn: (target: string, reasonCode: string, caseId: string | null, notes: string | null) =>
    callRpc('ranger_warn', { _target: target, _reason_code: reasonCode, _case_id: caseId, _notes: notes }),
  suspend: (target: string, days: number | null, reasonCode: string, caseId: string | null, notes: string | null) =>
    callRpc('ranger_suspend', { _target: target, _days: days, _reason_code: reasonCode, _case_id: caseId, _notes: notes }),
  securityLock: (target: string, caseId: string | null, notes: string | null) =>
    callRpc('ranger_security_lock', { _target: target, _case_id: caseId, _notes: notes }),
  ban: (target: string, reasonCode: string, caseId: string | null, notes: string | null) =>
    callRpc('ranger_ban', { _target: target, _reason_code: reasonCode, _case_id: caseId, _notes: notes }),
  restore: (target: string, reasonCode: string, caseId: string | null, notes: string | null) =>
    callRpc('ranger_restore', { _target: target, _reason_code: reasonCode, _case_id: caseId, _notes: notes }),
  reviewAppeal: (appealId: string, decision: 'uphold' | 'modify' | 'reverse', notes: string | null) =>
    callRpc('ranger_review_appeal', { _appeal_id: appealId, _decision: decision, _notes: notes }),
  openCase: (subject: string, caseType: string, priority: string, summary: string | null) =>
    callRpc('ranger_open_case', { _subject: subject, _case_type: caseType, _priority: priority, _summary: summary }),
};
