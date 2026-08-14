import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { listAppeals, rangerActions, type AppealRow } from '@/lib/rangerApi';
import { useRangerLevel } from '@/hooks/useRangerLevel';
import { Textarea } from '@/components/ui/textarea';
import PineTreeLoading from '@/components/PineTreeLoading';

/**
 * Appeals inbox (spec §79). Decisions are Senior Ranger and above; a reversal
 * of a permanent ban is refused server-side unless the reviewer is a Head
 * Ranger.
 */
const GroveAppeals = () => {
  const queryClient = useQueryClient();
  const { isSenior } = useRangerLevel();
  const [showResolved, setShowResolved] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const { data: appeals, isLoading } = useQuery({
    queryKey: ['grove-appeals', showResolved],
    queryFn: () => listAppeals(!showResolved),
  });

  if (isLoading) return <PineTreeLoading />;

  const decide = async (appeal: AppealRow, decision: 'uphold' | 'modify' | 'reverse') => {
    const result = await rangerActions.reviewAppeal(appeal.id, decision, notes.trim() || null);
    if (result.success) {
      toast.success(
        decision === 'reverse'
          ? 'Appeal approved — the account has been restored.'
          : decision === 'uphold'
            ? 'Original decision upheld.'
            : 'Marked as modified — apply the adjusted action from the case page.',
      );
      setExpanded(null);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['grove-appeals'] });
    } else {
      toast.error(
        result.error === 'not_authorized'
          ? 'Reversing this action needs a higher Ranger role.'
          : `That didn't work: ${result.error}`,
      );
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-xl text-[hsl(var(--pine-pale))]">Appeals</h1>
        <p className="text-sm text-[hsl(var(--pine-light)/0.65)]">
          Members asking the Rangers to take a second look.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-[hsl(var(--pine-light)/0.7)]">
        <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
        Show resolved
      </label>

      <div className="space-y-2">
        {(appeals ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-[hsl(var(--pine-light)/0.6)]">
            {showResolved ? 'No resolved appeals.' : 'No open appeals. Good sign.'}
          </p>
        ) : (
          (appeals ?? []).map((appeal) => (
            <div
              key={appeal.id}
              className="rounded-[4px] border border-[hsl(var(--pine-mid)/0.3)] bg-[hsl(var(--pine-dark))] px-4 py-3"
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setExpanded(expanded === appeal.id ? null : appeal.id)}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm text-[hsl(var(--amber-mid))]">
                    @{appeal.appellant?.handle ?? appeal.user_id}
                  </span>
                  <span className="text-xs text-[hsl(var(--pine-light)/0.55)]">
                    {appeal.status} · {formatDistanceToNow(new Date(appeal.created_at), { addSuffix: true })}
                  </span>
                </div>
              </button>

              {expanded === appeal.id && (
                <div className="mt-3 space-y-3">
                  <div className="rounded bg-[hsl(var(--pine-darkest))] p-3">
                    <p className="text-xs uppercase text-[hsl(var(--pine-light)/0.5)]">Appeal explanation</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-[hsl(var(--pine-pale))]">{appeal.appeal_text}</p>
                  </div>
                  {appeal.case_id && (
                    <Link to={`/grove/cases/${appeal.case_id}`} className="text-xs text-[hsl(var(--amber-mid))]">
                      View original case and current evidence →
                    </Link>
                  )}
                  {appeal.outcome && (
                    <p className="text-xs text-[hsl(var(--pine-light)/0.7)]">
                      Outcome: {appeal.outcome}{appeal.outcome_notes && ` — ${appeal.outcome_notes}`}
                    </p>
                  )}

                  {isSenior && ['OPEN', 'IN_REVIEW'].includes(appeal.status) && (
                    <div className="space-y-2">
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Review notes (optional, recorded in the audit log)"
                        rows={2}
                        className="bg-[hsl(var(--pine-darkest))] text-sm text-[hsl(var(--pine-pale))] border-[hsl(var(--pine-mid)/0.4)]"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => decide(appeal, 'reverse')}
                          className="rounded-[3px] bg-[hsl(var(--amber-deep)/0.3)] px-3 py-1.5 text-xs text-[hsl(var(--amber-light))]"
                        >
                          Reverse &amp; restore
                        </button>
                        <button
                          type="button"
                          onClick={() => decide(appeal, 'modify')}
                          className="rounded-[3px] bg-[hsl(var(--pine-mid)/0.3)] px-3 py-1.5 text-xs text-[hsl(var(--pine-pale))]"
                        >
                          Modify
                        </button>
                        <button
                          type="button"
                          onClick={() => decide(appeal, 'uphold')}
                          className="rounded-[3px] bg-[hsl(var(--pine-mid)/0.3)] px-3 py-1.5 text-xs text-[hsl(var(--pine-pale))]"
                        >
                          Uphold
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GroveAppeals;
