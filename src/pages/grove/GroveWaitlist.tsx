import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isWaitlistAdminEmail } from '@/lib/waitlistAdmin';
import PineTreeLoading from '@/components/PineTreeLoading';
import { cn } from '@/lib/utils';

type WaitlistStatus = 'waiting' | 'invited' | 'declined';

interface WaitlistRow {
  id: string;
  email: string;
  status: WaitlistStatus;
  created_at: string;
}

const FILTERS: Array<{ key: WaitlistStatus | 'all'; label: string }> = [
  { key: 'waiting', label: 'Waiting' },
  { key: 'invited', label: 'Invited' },
  { key: 'declined', label: 'Declined' },
  { key: 'all', label: 'All' },
];

// waitlist_signups postdates the generated Supabase types (same stale-types
// situation as cabinApi); the cast comes out when types are regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => (supabase as any).from('waitlist_signups');

const GroveWaitlist = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<WaitlistStatus | 'all'>('waiting');

  const { data: rows, isLoading } = useQuery<WaitlistRow[]>({
    queryKey: ['grove-waitlist'],
    queryFn: async () => {
      const { data, error } = await table()
        .select('id, email, status, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: isWaitlistAdminEmail(user?.email),
  });

  if (!isWaitlistAdminEmail(user?.email)) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-display text-xl text-[hsl(var(--pine-pale))]">Waitlist</h1>
        <p className="mt-2 text-sm text-[hsl(var(--pine-light)/0.65)]">
          The waitlist is only visible to the founder account.
        </p>
      </div>
    );
  }

  if (isLoading) return <PineTreeLoading />;

  const all = rows ?? [];
  const counts = {
    waiting: all.filter((r) => r.status === 'waiting').length,
    invited: all.filter((r) => r.status === 'invited').length,
    declined: all.filter((r) => r.status === 'declined').length,
    all: all.length,
  };
  const visible = filter === 'all' ? all : all.filter((r) => r.status === filter);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['grove-waitlist'] });

  const setStatus = async (row: WaitlistRow, status: WaitlistStatus) => {
    const { error } = await table().update({ status }).eq('id', row.id);
    if (error) {
      toast.error(`That didn't work: ${error.message}`);
    } else {
      toast.success(
        status === 'invited'
          ? `${row.email} marked as invited — remember to actually send them a Trail Pass.`
          : status === 'declined'
            ? `${row.email} declined.`
            : `${row.email} back to waiting.`,
      );
      refresh();
    }
  };

  const remove = async (row: WaitlistRow) => {
    const { error } = await table().delete().eq('id', row.id);
    if (error) toast.error(`That didn't work: ${error.message}`);
    else {
      toast.success(`${row.email} removed from the waitlist.`);
      refresh();
    }
  };

  const copyEmail = async (email: string) => {
    await navigator.clipboard.writeText(email);
    toast.success('Email copied.');
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-xl text-[hsl(var(--pine-pale))]">Waitlist</h1>
        <p className="text-sm text-[hsl(var(--pine-light)/0.65)]">
          People who left an email on the coming-soon page. Marking someone
          invited is bookkeeping only — send the actual invite from Invites or
          the Ranger Station.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs transition-colors',
              filter === f.key
                ? 'bg-[hsl(var(--amber-deep)/0.3)] text-[hsl(var(--amber-light))]'
                : 'bg-[hsl(var(--pine-mid)/0.2)] text-[hsl(var(--pine-light)/0.7)] hover:text-[hsl(var(--pine-light))]',
            )}
          >
            {f.label} · {counts[f.key]}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-[hsl(var(--pine-light)/0.6)]">
            {filter === 'waiting'
              ? 'Nobody waiting at the trailhead right now.'
              : 'Nothing here.'}
          </p>
        ) : (
          visible.map((row) => (
            <div
              key={row.id}
              className="rounded-lg border border-[hsl(var(--pine-mid)/0.3)] bg-[hsl(var(--pine-dark))] px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => copyEmail(row.email)}
                  title="Copy email"
                  className="text-sm text-[hsl(var(--amber-mid))] hover:text-[hsl(var(--amber-light))]"
                >
                  {row.email}
                </button>
                <span className="text-xs text-[hsl(var(--pine-light)/0.55)]">
                  {row.status} · {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {row.status !== 'invited' && (
                  <button
                    type="button"
                    onClick={() => setStatus(row, 'invited')}
                    className="rounded-full bg-[hsl(var(--amber-deep)/0.3)] px-3 py-1.5 text-xs text-[hsl(var(--amber-light))]"
                  >
                    Mark invited
                  </button>
                )}
                {row.status !== 'declined' && (
                  <button
                    type="button"
                    onClick={() => setStatus(row, 'declined')}
                    className="rounded-full bg-[hsl(var(--pine-mid)/0.3)] px-3 py-1.5 text-xs text-[hsl(var(--pine-pale))]"
                  >
                    Decline
                  </button>
                )}
                {row.status !== 'waiting' && (
                  <button
                    type="button"
                    onClick={() => setStatus(row, 'waiting')}
                    className="rounded-full bg-[hsl(var(--pine-mid)/0.3)] px-3 py-1.5 text-xs text-[hsl(var(--pine-pale))]"
                  >
                    Back to waiting
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(row)}
                  className="rounded-full bg-[hsl(var(--pine-mid)/0.15)] px-3 py-1.5 text-xs text-[hsl(var(--pine-light)/0.6)] hover:text-[hsl(var(--pine-light))]"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GroveWaitlist;
