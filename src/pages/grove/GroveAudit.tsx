import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { listAuditLog } from '@/lib/rangerApi';
import { useRangerLevel } from '@/hooks/useRangerLevel';
import PineTreeLoading from '@/components/PineTreeLoading';

/**
 * Append-only audit log (spec §80-§81). RLS restricts reads to Head Rangers;
 * the client-side gate here only avoids rendering an empty page for others.
 */
const GroveAudit = () => {
  const { isHead, loading: roleLoading } = useRangerLevel();
  const [actionFilter, setActionFilter] = useState('all');

  const { data: rows, isLoading } = useQuery({
    queryKey: ['grove-audit'],
    enabled: isHead,
    queryFn: listAuditLog,
  });

  if (roleLoading || (isHead && isLoading)) return <PineTreeLoading />;

  if (!isHead) {
    return (
      <p className="text-sm text-[hsl(var(--pine-light)/0.6)]">
        The audit log is visible to Head Rangers only.
      </p>
    );
  }

  const actionTypes = Array.from(new Set((rows ?? []).map((r) => r.action_type))).sort();
  const filtered = (rows ?? []).filter((r) => actionFilter === 'all' || r.action_type === actionFilter);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-xl text-[hsl(var(--pine-pale))]">Audit Log</h1>
        <p className="text-sm text-[hsl(var(--pine-light)/0.65)]">
          Every consequential action: who, what, whom, when, why. Append-only.
        </p>
      </div>

      <select
        value={actionFilter}
        onChange={(e) => setActionFilter(e.target.value)}
        className="rounded-[3px] border border-[hsl(var(--pine-mid)/0.4)] bg-[hsl(var(--pine-dark))] px-3 py-1.5 text-sm text-[hsl(var(--pine-pale))]"
        aria-label="Filter by action"
      >
        <option value="all">All actions</option>
        {actionTypes.map((t) => (
          <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
        ))}
      </select>

      <ul className="space-y-2">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-[hsl(var(--pine-light)/0.6)]">No entries.</p>
        ) : (
          filtered.map((row) => (
            <li
              key={row.id}
              className="rounded-[4px] border border-[hsl(var(--pine-mid)/0.3)] bg-[hsl(var(--pine-dark))] px-4 py-2.5 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-[hsl(var(--pine-light)/0.55)]">
                  {format(new Date(row.created_at), 'PP p')}
                </span>
                <span className="text-[hsl(var(--amber-mid))]">
                  {row.actor ? `@${row.actor.handle}` : 'System'}
                </span>
                <span className="text-[hsl(var(--pine-pale))]">{row.action_type.replace(/_/g, ' ')}</span>
                {row.reason_code && (
                  <span className="rounded bg-[hsl(var(--pine-mid)/0.3)] px-1.5 py-0.5 text-[10px] text-[hsl(var(--pine-light)/0.8)]">
                    {row.reason_code}
                  </span>
                )}
                {row.case_id && (
                  <Link to={`/grove/cases/${row.case_id}`} className="text-xs text-[hsl(var(--amber-mid))]">
                    case →
                  </Link>
                )}
              </div>
              {row.notes && (
                <p className="mt-1 text-xs text-[hsl(var(--pine-light)/0.7)]">{row.notes}</p>
              )}
              {(row.before_state || row.after_state) && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-[10px] text-[hsl(var(--pine-light)/0.5)]">
                    before / after state
                  </summary>
                  <pre className="mt-1 overflow-x-auto rounded bg-[hsl(var(--pine-darkest))] p-2 text-[10px] text-[hsl(var(--pine-light)/0.8)]">
{JSON.stringify({ before: row.before_state, after: row.after_state }, null, 2)}
                  </pre>
                </details>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default GroveAudit;
