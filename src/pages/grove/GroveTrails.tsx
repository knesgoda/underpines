import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getTrailLineage, rangerActions, type TrailNode } from '@/lib/rangerApi';
import { useRangerLevel } from '@/hooks/useRangerLevel';
import RangerActionDialog from '@/components/grove/RangerActionDialog';
import PineTreeLoading from '@/components/PineTreeLoading';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/**
 * Trail Map (spec §70-§73): who invited whom, with per-node risk and
 * moderation state. Rendered as an accessible indented tree (spec §121) —
 * not color-only; every node carries text labels.
 */
const GroveTrails = () => {
  const { handle } = useParams<{ handle?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isSenior } = useRangerLevel();
  const [search, setSearch] = useState(handle ?? '');
  const [closing, setClosing] = useState<{ node: TrailNode; reopen: boolean } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['grove-trail', handle],
    queryFn: async () => {
      // Active containment list is always shown; the lineage tree needs a
      // subject.
      const { data: frozen } = await db
        .from('invite_allowances')
        .select('user_id, invites_frozen_at, frozen_reason_code, profile:profiles!invite_allowances_user_id_fkey(handle, display_name)')
        .not('invites_frozen_at', 'is', null)
        .order('invites_frozen_at', { ascending: false })
        .limit(50);

      if (!handle) return { frozen: frozen ?? [], subject: null, nodes: [] as TrailNode[] };

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, handle, display_name')
        .eq('handle', handle)
        .maybeSingle();
      if (!profile) return { frozen: frozen ?? [], subject: null, nodes: [] as TrailNode[] };

      const nodes = await getTrailLineage(profile.id, 3);
      return { frozen: frozen ?? [], subject: profile, nodes };
    },
  });

  if (isLoading) return <PineTreeLoading />;

  const nodes = data?.nodes ?? [];
  const self = nodes.find((n) => n.relation === 'self');
  const ancestors = nodes.filter((n) => n.relation === 'ancestor').sort((a, b) => b.depth - a.depth);

  // Build descendant tree from flat rows.
  const childrenOf = (parentId: string): TrailNode[] =>
    nodes.filter((n) => n.relation === 'descendant' && n.depth > 0 && n.invited_by_user_id === parentId);

  const concernLabel = (n: TrailNode): { label: string; className: string } => {
    if (n.moderation_state === 'BANNED') return { label: 'banned', className: 'bg-red-900/50 text-red-200' };
    if (n.is_suspended || n.moderation_state === 'SUSPENDED') return { label: 'suspended', className: 'bg-red-900/40 text-red-200' };
    if (n.risk_level === 'CRITICAL' || n.risk_level === 'HIGH') return { label: `risk ${n.risk_level.toLowerCase()}`, className: 'bg-[hsl(var(--amber-deep)/0.4)] text-[hsl(var(--amber-light))]' };
    if (n.risk_level === 'MEDIUM') return { label: 'risk medium', className: 'bg-[hsl(var(--amber-deep)/0.25)] text-[hsl(var(--amber-mid))]' };
    return { label: 'normal', className: 'bg-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-light)/0.8)]' };
  };

  // Cluster summary for the visible branch (spec §73).
  const descendants = nodes.filter((n) => n.relation === 'descendant' && n.depth > 0);
  const clusterHigh = descendants.filter((n) => ['HIGH', 'CRITICAL'].includes(n.risk_level)).length;
  const clusterBanned = descendants.filter((n) => n.moderation_state === 'BANNED' || n.is_suspended).length;
  const clusterReports = descendants.reduce((acc, n) => acc + Number(n.report_count), 0);

  const NodeRow = ({ node, indent }: { node: TrailNode; indent: number }) => {
    const concern = concernLabel(node);
    return (
      <li>
        <div
          className="flex flex-wrap items-center gap-2 py-1.5"
          style={{ paddingLeft: `${indent * 20}px` }}
        >
          {indent > 0 && <span aria-hidden className="text-[hsl(var(--pine-mid))]">└</span>}
          <Link
            to={`/grove/trails/${node.handle}`}
            className={node.relation === 'self' ? 'text-[hsl(var(--amber-mid))] font-medium' : 'text-[hsl(var(--pine-pale))]'}
          >
            @{node.handle}
          </Link>
          <span className={`rounded-full px-2 py-0.5 text-[10px] ${concern.className}`}>{concern.label}</span>
          {node.invites_frozen && (
            <span className="rounded-full bg-[hsl(var(--pine-mid)/0.4)] px-2 py-0.5 text-[10px] text-[hsl(var(--pine-light)/0.8)]">
              invites frozen
            </span>
          )}
          <span className="text-[10px] text-[hsl(var(--pine-light)/0.5)]">
            joined {formatDistanceToNow(new Date(node.account_created_at), { addSuffix: true })}
            {Number(node.report_count) > 0 && ` · ${node.report_count} reports`}
          </span>
          {isSenior && node.relation === 'self' && (
            <button
              type="button"
              onClick={() => setClosing({ node, reopen: node.invites_frozen })}
              className="ml-auto rounded-full bg-[hsl(var(--pine-mid)/0.3)] px-2.5 py-1 text-[10px] text-[hsl(var(--pine-pale))] hover:bg-[hsl(var(--pine-mid)/0.5)]"
            >
              {node.invites_frozen ? 'Reopen trail' : 'Close trail'}
            </button>
          )}
        </div>
        <ul>
          {childrenOf(node.user_id).map((child) => (
            <NodeRow key={child.user_id} node={child} indent={indent + 1} />
          ))}
        </ul>
      </li>
    );
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-xl text-[hsl(var(--pine-pale))]">Trail Map</h1>
        <p className="text-sm text-[hsl(var(--pine-light)/0.65)]">
          Invitation lineage. A connection is context, never guilt.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (search.trim()) navigate(`/grove/trails/${search.trim().replace(/^@/, '')}`);
        }}
        className="flex gap-2"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="@handle"
          aria-label="Look up a member's trail"
          className="rounded-[3px] border border-[hsl(var(--pine-mid)/0.4)] bg-[hsl(var(--pine-dark))] px-3 py-1.5 text-sm text-[hsl(var(--pine-pale))]"
        />
        <button type="submit" className="rounded-[3px] bg-[hsl(var(--amber-deep)/0.3)] px-4 py-1.5 text-sm text-[hsl(var(--amber-light))]">
          Look up
        </button>
      </form>

      {handle && !data?.subject && (
        <p className="text-sm text-[hsl(var(--pine-light)/0.6)]">No member with that handle.</p>
      )}

      {self && (
        <>
          <section className="rounded-[4px] border border-[hsl(var(--pine-mid)/0.3)] bg-[hsl(var(--pine-dark))] p-4">
            <h2 className="mb-2 font-display text-sm text-[hsl(var(--amber-mid))]">Branch summary</h2>
            <p className="text-sm text-[hsl(var(--pine-pale))]">
              {descendants.length} accounts descend from @{self.handle}
              {descendants.length > 0 && (
                <span className="text-[hsl(var(--pine-light)/0.7)]">
                  {' '}— {clusterHigh} high risk, {clusterBanned} suspended/banned, {clusterReports} total reports
                </span>
              )}
            </p>
          </section>

          <section className="rounded-[4px] border border-[hsl(var(--pine-mid)/0.3)] bg-[hsl(var(--pine-dark))] p-4">
            <h2 className="mb-2 font-display text-sm text-[hsl(var(--amber-mid))]">Lineage</h2>
            {ancestors.length > 0 && (
              <ul className="mb-1 border-b border-[hsl(var(--pine-mid)/0.2)] pb-2">
                {ancestors.map((a, i) => (
                  <li key={a.user_id} style={{ paddingLeft: `${i * 20}px` }} className="py-1 text-sm">
                    <span aria-hidden className="text-[hsl(var(--pine-mid))]">{i > 0 ? '└ ' : ''}</span>
                    <Link to={`/grove/trails/${a.handle}`} className="text-[hsl(var(--pine-light)/0.8)]">@{a.handle}</Link>
                    <span className="ml-2 text-[10px] text-[hsl(var(--pine-light)/0.5)]">{a.depth} generation{a.depth > 1 ? 's' : ''} up</span>
                  </li>
                ))}
              </ul>
            )}
            <ul aria-label={`Invitation tree for @${self.handle}`}>
              <NodeRow node={self} indent={0} />
            </ul>
          </section>
        </>
      )}

      <section className="rounded-[4px] border border-[hsl(var(--pine-mid)/0.3)] bg-[hsl(var(--pine-dark))] p-4">
        <h2 className="mb-2 font-display text-sm text-[hsl(var(--amber-mid))]">
          Currently closed trails ({data?.frozen.length ?? 0})
        </h2>
        {(data?.frozen ?? []).length === 0 ? (
          <p className="text-sm text-[hsl(var(--pine-light)/0.6)]">No trails are closed right now.</p>
        ) : (
          <ul className="space-y-1">
            {(data?.frozen ?? []).map((f: { user_id: string; invites_frozen_at: string; frozen_reason_code: string | null; profile: { handle: string; display_name: string } | null }) => (
              <li key={f.user_id} className="text-sm text-[hsl(var(--pine-pale))]">
                {f.profile
                  ? <Link to={`/grove/trails/${f.profile.handle}`} className="text-[hsl(var(--amber-mid))]">@{f.profile.handle}</Link>
                  : f.user_id}
                <span className="ml-2 text-xs text-[hsl(var(--pine-light)/0.6)]">
                  {f.frozen_reason_code ?? 'no reason code'} · {formatDistanceToNow(new Date(f.invites_frozen_at), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {closing && (
        <RangerActionDialog
          open
          title={closing.reopen ? `Reopen @${closing.node.handle}'s trail` : `Close @${closing.node.handle}'s trail`}
          description={
            closing.reopen
              ? 'Restores invitation privileges for this account and its descendants, and revives paused passes.'
              : 'Stops new invitations from this account and its descendants and pauses outstanding passes. Existing accounts remain active unless separately restricted.'
          }
          confirmLabel={closing.reopen ? 'Reopen trail' : 'Close trail temporarily'}
          askReason={!closing.reopen}
          destructive={!closing.reopen}
          onCancel={() => setClosing(null)}
          onConfirm={async (reason, notes) => {
            const result = closing.reopen
              ? await rangerActions.reopenTrail(closing.node.user_id, true, null, notes || null)
              : await rangerActions.closeTrail(closing.node.user_id, true, reason, null, notes || null);
            setClosing(null);
            if (result.success) {
              toast.success(
                closing.reopen
                  ? 'Trail reopened.'
                  : `Trail temporarily closed. New invitations from this branch are paused (${result.affected_count} accounts).`,
              );
              queryClient.invalidateQueries({ queryKey: ['grove-trail'] });
            } else {
              toast.error(result.error === 'not_authorized' ? 'Senior Ranger access required.' : `That didn't work: ${result.error}`);
            }
          }}
        />
      )}
    </div>
  );
};

export default GroveTrails;
