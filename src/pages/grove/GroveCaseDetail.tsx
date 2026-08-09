import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  getCase,
  getTrailLineage,
  getUserTrust,
  listSignals,
  rangerActions,
  type RiskSignalRow,
  type RangerActionResult,
} from '@/lib/rangerApi';
import { useRangerLevel } from '@/hooks/useRangerLevel';
import RangerActionDialog from '@/components/grove/RangerActionDialog';
import PineTreeLoading from '@/components/PineTreeLoading';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'text-red-300',
  high: 'text-[hsl(var(--amber-light))]',
  medium: 'text-[hsl(var(--amber-mid))]',
  low: 'text-[hsl(var(--pine-light)/0.7)]',
};

type ActionKey =
  | 'mark_safe' | 'require_verification' | 'restrict' | 'freeze_invites'
  | 'unfreeze_invites' | 'warn' | 'suspend_7' | 'security_lock' | 'ban' | 'restore';

interface ActionSpec {
  key: ActionKey;
  label: string;
  minLevel: number;
  destructive?: boolean;
  askReason?: boolean;
  description: string;
}

// Least-destructive first (spec §160).
const ACTIONS: ActionSpec[] = [
  { key: 'mark_safe', label: 'Mark safe', minLevel: 1, askReason: false, description: 'Clears active suspicion on this account. Evidence is kept for tuning, and the case closes as a false positive.' },
  { key: 'warn', label: 'Warn', minLevel: 1, description: 'Sends a policy warning to the member.' },
  { key: 'require_verification', label: 'Require verification', minLevel: 1, askReason: false, description: 'The member must complete additional verification before sensitive actions.' },
  { key: 'restrict', label: 'Restrict', minLevel: 1, description: 'Temporarily limits abuse-sensitive actions. The account otherwise works.' },
  { key: 'freeze_invites', label: 'Freeze invites', minLevel: 1, description: 'Stops new Trail Passes and pauses outstanding ones. The account otherwise works normally.' },
  { key: 'unfreeze_invites', label: 'Unfreeze invites', minLevel: 1, askReason: false, description: 'Restores invitation privileges and revives paused passes.' },
  { key: 'security_lock', label: 'Security lock', minLevel: 1, askReason: false, description: 'For suspected account compromise: holds the account and requires reverification. The member is treated as a victim, not an abuser.' },
  { key: 'suspend_7', label: 'Suspend 7 days', minLevel: 2, destructive: true, description: 'Disables the account for a week.' },
  { key: 'restore', label: 'Restore account', minLevel: 2, askReason: false, description: 'Lifts an active suspension or ban and returns the account to good standing.' },
  { key: 'ban', label: 'Permanent ban', minLevel: 3, destructive: true, description: 'Disables the account indefinitely and contains its invitation branch. Head Ranger only.' },
];

/**
 * Account review (spec §65-§70): identity, trust summary, why-flagged
 * signals, linked reports, activity summary, and trail history — with the
 * full action palette. Server-side RPCs re-verify the ranger level on every
 * action, so the level gating here is purely presentational.
 */
const GroveCaseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { level } = useRangerLevel();
  const [pendingAction, setPendingAction] = useState<ActionSpec | null>(null);
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['grove-case', id],
    enabled: !!id,
    queryFn: async () => {
      const c = await getCase(id!);
      if (!c?.subject_user_id) return { case: c, trust: null, signals: [], reports: [], activity: null, lineage: [], allowance: null };
      const uid = c.subject_user_id;
      const dayAgo = new Date(Date.now() - 86400_000).toISOString();

      const [trust, signals, reportsRes, postsRes, followsRes, reportsRecvRes, lineage, allowanceRes, verificationRes] =
        await Promise.all([
          getUserTrust(uid),
          listSignals(uid),
          db.from('reports')
            .select('id, report_reason, subcategory, reporter_context, coordination_risk, reporter_weight_at_time, created_at, status')
            .eq('case_id', id).order('created_at', { ascending: false }),
          db.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', uid).gte('created_at', dayAgo),
          db.from('circles').select('id', { count: 'exact', head: true }).eq('requester_id', uid).gte('created_at', dayAgo),
          db.from('reports').select('id', { count: 'exact', head: true }).eq('reported_user_id', uid),
          getTrailLineage(uid, 1),
          db.from('invite_allowances').select('invites_frozen_at, frozen_reason_code, available_passes').eq('user_id', uid).maybeSingle(),
          db.from('account_verifications').select('email_verified_at, phone_verified_at, phone_risk, reverification_required_at').eq('user_id', uid).maybeSingle(),
        ]);

      return {
        case: c,
        trust,
        signals,
        reports: reportsRes.data ?? [],
        activity: {
          posts24h: postsRes.count ?? 0,
          follows24h: followsRes.count ?? 0,
          reportsReceived: reportsRecvRes.count ?? 0,
        },
        lineage,
        allowance: allowanceRes.data ?? null,
        verification: verificationRes.data ?? null,
      };
    },
  });

  if (isLoading) return <PineTreeLoading />;
  if (!data?.case) {
    return <p className="text-sm text-[hsl(var(--pine-light)/0.6)]">Case not found.</p>;
  }

  const c = data.case;
  const uid = c.subject_user_id;
  const trust = data.trust;
  const activeSignals = (data.signals as RiskSignalRow[]).filter(
    (s) => !s.expires_at || new Date(s.expires_at) > new Date(),
  );
  const inviter = (data.lineage ?? []).find((n) => n.relation === 'ancestor' && n.depth === 1);
  const children = (data.lineage ?? []).filter((n) => n.relation === 'descendant' && n.depth === 1);

  const runAction = async (spec: ActionSpec, reasonCode: string, notes: string) => {
    if (!uid) return;
    const n = notes || null;
    let result: RangerActionResult;
    switch (spec.key) {
      case 'mark_safe': result = await rangerActions.markSafe(uid, c.id, n); break;
      case 'warn': result = await rangerActions.warn(uid, reasonCode, c.id, n); break;
      case 'require_verification': result = await rangerActions.requireVerification(uid, c.id, n); break;
      case 'restrict': result = await rangerActions.restrict(uid, reasonCode, c.id, n, 7); break;
      case 'freeze_invites': result = await rangerActions.freezeInvites(uid, reasonCode, c.id, n); break;
      case 'unfreeze_invites': result = await rangerActions.unfreezeInvites(uid, c.id, n); break;
      case 'security_lock': result = await rangerActions.securityLock(uid, c.id, n); break;
      case 'suspend_7': result = await rangerActions.suspend(uid, 7, reasonCode, c.id, n); break;
      case 'restore': result = await rangerActions.restore(uid, 'FALSE_POSITIVE_REVERSAL', c.id, n); break;
      case 'ban': result = await rangerActions.ban(uid, reasonCode, c.id, n); break;
    }
    setPendingAction(null);
    if (result.success) {
      toast.success('Done. The action is recorded in the audit log.');
      queryClient.invalidateQueries({ queryKey: ['grove-case', id] });
      queryClient.invalidateQueries({ queryKey: ['grove-cases'] });
    } else {
      toast.error(result.error === 'not_authorized'
        ? 'Your Ranger role does not allow that action.'
        : `That didn't work: ${result.error}`);
    }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="rounded-lg border border-[hsl(var(--pine-mid)/0.3)] bg-[hsl(var(--pine-dark))] p-4">
      <h2 className="mb-3 font-display text-sm text-[hsl(var(--amber-mid))]">{title}</h2>
      {children}
    </section>
  );

  const Fact = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-[hsl(var(--pine-light)/0.6)]">{label}</span>
      <span className="text-[hsl(var(--pine-pale))] text-right">{value}</span>
    </div>
  );

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link to="/grove/cases" className="text-xs text-[hsl(var(--amber-mid))]">← Back to queue</Link>
          <h1 className="mt-1 font-display text-xl text-[hsl(var(--pine-pale))]">
            Case #{c.case_number} — {c.case_type.replace(/_/g, ' ').toLowerCase()}
          </h1>
          <p className="text-xs text-[hsl(var(--pine-light)/0.6)]">
            {c.status} · {c.priority} priority · opened {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
            {c.auto_generated && ' · opened automatically'}
          </p>
          {c.summary && <p className="mt-1 text-sm text-[hsl(var(--pine-light)/0.8)]">{c.summary}</p>}
        </div>
      </div>

      {c.subject && uid && (
        <Section title="Identity">
          <Fact label="Member" value={<Link to={`/${c.subject.handle}`} className="text-[hsl(var(--amber-mid))]">@{c.subject.handle}</Link>} />
          <Fact label="Display name" value={c.subject.display_name} />
          <Fact label="Account age" value={formatDistanceToNow(new Date(c.subject.created_at))} />
          <Fact label="Email verified" value={data.verification?.email_verified_at ? 'Yes' : 'No'} />
          <Fact
            label="Phone verification"
            value={
              data.verification?.phone_verified_at
                ? `Verified${data.verification.phone_risk ? ` · risk ${data.verification.phone_risk}` : ''}`
                : data.verification?.reverification_required_at
                  ? 'Required, not completed'
                  : 'Not required'
            }
          />
        </Section>
      )}

      {trust && (
        <Section title="Trust summary">
          <Fact label="Account trust" value={trust.trust_state.toLowerCase()} />
          <Fact label="Moderation state" value={trust.moderation_state.replace(/_/g, ' ').toLowerCase()} />
          <Fact label="Current risk" value={trust.risk_level.toLowerCase()} />
          {data.allowance && (
            <Fact
              label="Invitations"
              value={data.allowance.invites_frozen_at
                ? `Frozen (${data.allowance.frozen_reason_code ?? 'no code'})`
                : `${data.allowance.available_passes} passes available`}
            />
          )}
        </Section>
      )}

      <Section title="Why this account was flagged">
        {activeSignals.length === 0 ? (
          <p className="text-sm text-[hsl(var(--pine-light)/0.6)]">
            No active risk signals. Reports linked below may still need judgement.
          </p>
        ) : (
          <ul className="space-y-2">
            {activeSignals.map((s) => (
              <li key={s.id} className="text-sm">
                <button
                  type="button"
                  onClick={() => setExpandedSignal(expandedSignal === s.id ? null : s.id)}
                  className="w-full text-left"
                >
                  <span className={`mr-2 text-[10px] uppercase ${SEVERITY_STYLE[s.severity]}`}>{s.severity}</span>
                  <span className="text-[hsl(var(--pine-pale))]">{s.explanation}</span>
                </button>
                {expandedSignal === s.id && (
                  <div className="mt-1 ml-2 rounded bg-[hsl(var(--pine-darkest))] p-2 text-xs text-[hsl(var(--pine-light)/0.7)] space-y-1">
                    <div>Signal: {s.signal_type} · source: {s.source}</div>
                    <div>Observed: {format(new Date(s.created_at), 'PPp')}{s.policy_version && ` · policy ${s.policy_version}`}</div>
                    {s.confidence != null && <div>Confidence: {Math.round(s.confidence * 100)}%</div>}
                    {s.observed_value && <div>Details: {JSON.stringify(s.observed_value)}</div>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Reports on this case (${data.reports.length})`}>
        {data.reports.length === 0 ? (
          <p className="text-sm text-[hsl(var(--pine-light)/0.6)]">No community reports attached.</p>
        ) : (
          <ul className="space-y-2">
            {/* Reporter identities are deliberately absent (spec §44/§75). */}
            {data.reports.map((r: { id: string; report_reason: string; subcategory: string | null; reporter_context: string | null; coordination_risk: string | null; reporter_weight_at_time: number | null; created_at: string }) => (
              <li key={r.id} className="text-sm text-[hsl(var(--pine-pale))]">
                <span className="text-[hsl(var(--amber-mid))]">{r.report_reason.replace(/_/g, ' ')}</span>
                {r.subcategory && <span className="text-[hsl(var(--pine-light)/0.7)]"> · {r.subcategory.replace(/,/g, ', ').replace(/_/g, ' ')}</span>}
                <span className="text-xs text-[hsl(var(--pine-light)/0.5)]"> · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                {r.coordination_risk && r.coordination_risk !== 'none' && (
                  <span className="ml-2 rounded bg-[hsl(var(--amber-deep)/0.3)] px-1.5 text-[10px] text-[hsl(var(--amber-light))]">
                    possible coordinated reporting: {r.coordination_risk}
                  </span>
                )}
                {r.reporter_context && (
                  <p className="text-xs text-[hsl(var(--pine-light)/0.7)] italic">“{r.reporter_context}”</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {data.activity && (
        <Section title="Activity summary (metadata only)">
          <Fact label="Posts, last 24h" value={data.activity.posts24h} />
          <Fact label="New connections requested, last 24h" value={data.activity.follows24h} />
          <Fact label="Reports received, all time" value={data.activity.reportsReceived} />
        </Section>
      )}

      <Section title="Trail history">
        <Fact
          label="Invited by"
          value={inviter ? <Link to={`/grove/trails/${inviter.handle}`} className="text-[hsl(var(--amber-mid))]">@{inviter.handle}</Link> : 'No personal inviter (root/open link)'}
        />
        <Fact label="Direct invitees" value={children.length} />
        {children.length > 0 && (
          <ul className="mt-1 space-y-1 text-sm">
            {children.map((child) => (
              <li key={child.user_id} className="flex items-center gap-2">
                <span className="text-[hsl(var(--pine-pale))]">@{child.handle}</span>
                <span className="text-xs text-[hsl(var(--pine-light)/0.6)]">
                  {child.moderation_state !== 'NONE'
                    ? child.moderation_state.toLowerCase()
                    : child.risk_level !== 'NONE'
                      ? `risk ${child.risk_level.toLowerCase()}`
                      : 'normal'}
                </span>
              </li>
            ))}
          </ul>
        )}
        {c.subject && (
          <Link to={`/grove/trails/${c.subject.handle}`} className="mt-2 inline-block text-xs text-[hsl(var(--amber-mid))]">
            Open Trail Map →
          </Link>
        )}
      </Section>

      {uid && (
        <Section title="Actions">
          <div className="flex flex-wrap gap-2">
            {ACTIONS.filter((a) => level >= a.minLevel).map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => setPendingAction(a)}
                className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                  a.destructive
                    ? 'bg-red-900/40 text-red-200 hover:bg-red-900/60'
                    : 'bg-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-pale))] hover:bg-[hsl(var(--pine-mid)/0.5)]'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-[hsl(var(--pine-light)/0.5)]">
            Every action requires a reason code and is written to the append-only audit log.
          </p>
        </Section>
      )}

      {pendingAction && (
        <RangerActionDialog
          open
          title={pendingAction.label}
          description={pendingAction.description}
          confirmLabel={pendingAction.label}
          askReason={pendingAction.askReason !== false}
          destructive={pendingAction.destructive}
          onCancel={() => setPendingAction(null)}
          onConfirm={(reason, notes) => runAction(pendingAction, reason, notes)}
        />
      )}
    </div>
  );
};

export default GroveCaseDetail;
