import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { listCases, type ModerationCase } from '@/lib/rangerApi';
import PineTreeLoading from '@/components/PineTreeLoading';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const PRIORITY_STYLE: Record<string, string> = {
  CRITICAL: 'bg-red-500/20 text-red-300',
  HIGH: 'bg-[hsl(var(--amber-deep)/0.3)] text-[hsl(var(--amber-light))]',
  MEDIUM: 'bg-[hsl(var(--pine-mid)/0.4)] text-[hsl(var(--pine-pale))]',
  LOW: 'bg-[hsl(var(--pine-mid)/0.2)] text-[hsl(var(--pine-light)/0.7)]',
};

const CASE_TYPE_LABEL: Record<string, string> = {
  BOT_SUSPECTED: 'Suspected bot',
  SPAM: 'Spam',
  SCAM: 'Scam',
  HARASSMENT: 'Harassment',
  IMPERSONATION: 'Impersonation',
  INVITE_ABUSE: 'Invite abuse',
  REPORT_BRIGADING: 'Report brigading',
  ACCOUNT_COMPROMISE: 'Account compromise',
  APPEAL: 'Appeal',
  OTHER: 'Other',
};

/** Ranger Station home: what needs attention right now (spec §61/§63). */
const GroveCases = () => {
  const [showClosed, setShowClosed] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: cases, isLoading } = useQuery({
    queryKey: ['grove-cases', showClosed],
    queryFn: () => listCases(showClosed ? 'closed' : 'open'),
  });

  const { data: stats } = useQuery({
    queryKey: ['grove-case-stats'],
    queryFn: async () => {
      const [openCases, highPriority, frozenTrails, openAppeals, pendingReports] = await Promise.all([
        db.from('moderation_cases').select('id', { count: 'exact', head: true }).neq('status', 'CLOSED'),
        db.from('moderation_cases').select('id', { count: 'exact', head: true }).neq('status', 'CLOSED').in('priority', ['CRITICAL', 'HIGH']),
        db.from('invite_allowances').select('user_id', { count: 'exact', head: true }).not('invites_frozen_at', 'is', null),
        db.from('appeals').select('id', { count: 'exact', head: true }).in('status', ['OPEN', 'IN_REVIEW']),
        db.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
      ]);
      return {
        open: openCases.count ?? 0,
        high: highPriority.count ?? 0,
        frozen: frozenTrails.count ?? 0,
        appeals: openAppeals.count ?? 0,
        reports: pendingReports.count ?? 0,
      };
    },
  });

  if (isLoading) return <PineTreeLoading />;

  const filtered = (cases ?? []).filter(
    (c: ModerationCase) => typeFilter === 'all' || c.case_type === typeFilter,
  );

  const StatCard = ({ label, value, to }: { label: string; value: number; to?: string }) => {
    const body = (
      <div className="rounded-[4px] border border-[hsl(var(--pine-mid)/0.3)] bg-[hsl(var(--pine-dark))] px-4 py-3">
        <div className="text-2xl font-display text-[hsl(var(--pine-pale))]">{value}</div>
        <div className="text-xs text-[hsl(var(--pine-light)/0.65)]">{label}</div>
      </div>
    );
    return to ? <Link to={to}>{body}</Link> : body;
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-xl text-[hsl(var(--pine-pale))]">Ranger Station</h1>
        <p className="text-sm text-[hsl(var(--pine-light)/0.65)]">
          Bot &amp; abuse queue. Automation flags — humans judge.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Open cases" value={stats?.open ?? 0} />
        <StatCard label="High priority" value={stats?.high ?? 0} />
        <StatCard label="Closed trails" value={stats?.frozen ?? 0} to="/grove/trails" />
        <StatCard label="Open appeals" value={stats?.appeals ?? 0} to="/grove/appeals" />
        <StatCard label="Reports waiting" value={stats?.reports ?? 0} to="/grove/queue" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-[3px] border border-[hsl(var(--pine-mid)/0.4)] bg-[hsl(var(--pine-dark))] px-3 py-1.5 text-sm text-[hsl(var(--pine-pale))]"
          aria-label="Filter by case type"
        >
          <option value="all">All types</option>
          {Object.entries(CASE_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-[hsl(var(--pine-light)/0.7)]">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => setShowClosed(e.target.checked)}
          />
          Show closed
        </label>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-[hsl(var(--pine-light)/0.6)] py-8 text-center">
            Nothing in the queue. The forest is quiet.
          </p>
        ) : (
          filtered.map((c: ModerationCase) => (
            <Link
              key={c.id}
              to={`/grove/cases/${c.id}`}
              className="block rounded-[4px] border border-[hsl(var(--pine-mid)/0.3)] bg-[hsl(var(--pine-dark))] px-4 py-3 hover:border-[hsl(var(--amber-mid)/0.5)] transition-colors"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className={`rounded-[3px] px-2 py-0.5 text-[10px] font-medium ${PRIORITY_STYLE[c.priority]}`}>
                    {c.priority}
                  </span>
                  <span className="text-sm text-[hsl(var(--pine-pale))]">
                    {CASE_TYPE_LABEL[c.case_type] ?? c.case_type}
                  </span>
                  {c.subject && (
                    <span className="text-sm text-[hsl(var(--amber-mid))]">@{c.subject.handle}</span>
                  )}
                  {c.auto_generated && (
                    <span className="text-[10px] text-[hsl(var(--pine-light)/0.5)]">auto</span>
                  )}
                </div>
                <div className="text-xs text-[hsl(var(--pine-light)/0.55)]">
                  #{c.case_number} · {c.status} · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </div>
              </div>
              {c.summary && (
                <p className="mt-1 text-xs text-[hsl(var(--pine-light)/0.7)]">{c.summary}</p>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default GroveCases;
