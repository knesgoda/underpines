import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Copy, TreePine } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import PineTreeLoading from '@/components/PineTreeLoading';
import { useSeedlingStatus } from '@/hooks/useSeedlingStatus';

const THIRTY_DAYS_MS = 30 * 86400000;

const Invites = () => {
  const { user } = useAuth();
  const { isSeedling, daysLeft } = useSeedlingStatus();
  const [invite, setInvite] = useState<any>(null);
  const [invitees, setInvitees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentSignals, setSentSignals] = useState<Set<string>>(new Set());
  const [sendingSignal, setSendingSignal] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const { data: inv } = await supabase
        .from('invites')
        .select('*')
        .eq('inviter_id', user.id)
        .maybeSingle();

      if (inv) {
        setInvite(inv);

        const { data: uses } = await supabase
          .from('invite_uses')
          .select('*, invitee:invitee_id(id, display_name, handle, updated_at)')
          .eq('invite_id', inv.id);

        setInvitees(uses || []);

        // Check which invitees already got a smoke signal in last 30 days
        const inviteeIds = (uses || []).map((u: any) => u.invitee_id).filter(Boolean);
        if (inviteeIds.length > 0) {
          const thirtyAgo = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
          const { data: existing } = await supabase
            .from('notifications')
            .select('recipient_id')
            .eq('notification_type', 'smoke_signal')
            .eq('actor_id', user.id)
            .in('recipient_id', inviteeIds)
            .gte('created_at', thirtyAgo);

          if (existing) {
            setSentSignals(new Set(existing.map((n: any) => n.recipient_id)));
          }
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const sendSmokeSignal = async (inviteeId: string) => {
    if (!user || sendingSignal) return;
    setSendingSignal(inviteeId);

    // Rate limit check
    const thirtyAgo = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
    const { data: recent } = await supabase
      .from('notifications')
      .select('id')
      .eq('notification_type', 'smoke_signal')
      .eq('actor_id', user.id)
      .eq('recipient_id', inviteeId)
      .gte('created_at', thirtyAgo)
      .limit(1);

    if (recent && recent.length > 0) {
      toast('A smoke signal was already sent recently.');
      setSendingSignal(null);
      return;
    }

    const { error } = await supabase.from('notifications').insert({
      notification_type: 'smoke_signal',
      recipient_id: inviteeId,
      actor_id: user.id,
      is_read: false,
    });

    if (error) {
      toast.error('Could not send smoke signal.');
    } else {
      setSentSignals(prev => new Set(prev).add(inviteeId));
      toast.success('Smoke signal sent. The woods called them back.');
    }
    setSendingSignal(null);
  };

  if (loading) return <PineTreeLoading />;

  const inviteUrl = invite ? `https://underpines.com/invite/${invite.slug}` : '';
  const displayUrl = invite ? `underpines.com/invite/${invite.slug}` : '';
  const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

  return (
    <div className="min-h-screen bg-background texture-paper">
      <div className="max-w-lg mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-display text-foreground mb-8">Your Invite Link</h1>

          {isSeedling ? (
            <div className="rounded-2xl bg-card p-6 shadow-soft border border-border">
              <p className="font-body text-sm text-muted-foreground">
                🌱 Your invite link will activate once your Cabin is ready — {daysLeft} {daysLeft === 1 ? 'day' : 'days'} to go.
              </p>
            </div>
          ) : invite ? (
            <div className="space-y-6">
              <div className="rounded-2xl bg-card p-6 shadow-soft border border-border">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🔗</span>
                  <code className="text-sm font-body text-foreground flex-1 break-all">
                    {displayUrl}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteUrl);
                      toast.success('Link copied');
                    }}
                    className="shrink-0"
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground font-body">
                {invite.is_infinite
                  ? 'Unlimited invites remaining'
                  : `${invite.uses_remaining} of ${invite.uses_total} invites remaining`}
              </p>

              <div className="mt-8">
                <h3 className="text-lg font-display text-foreground mb-4">People you've invited</h3>
                {invitees.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-body italic">
                    Your invites haven't found their way into the forest yet.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {invitees.map((inv: any) => {
                      const isInactive = inv.invitee?.updated_at && inv.invitee.updated_at < thirtyDaysAgo;
                      const alreadySent = sentSignals.has(inv.invitee_id);
                      const isSending = sendingSignal === inv.invitee_id;

                      return (
                        <div key={inv.id} className="flex items-center gap-3 py-2.5 text-sm font-body">
                          <span className="text-foreground">{inv.invitee?.display_name}</span>
                          <span className="text-muted-foreground">@{inv.invitee?.handle}</span>
                          <span className="ml-auto flex items-center gap-2">
                            {isInactive ? (
                              <>
                                <span className="text-[10px] text-muted-foreground/50">inactive</span>
                                {alreadySent ? (
                                  <span className="text-[10px] text-muted-foreground/40 italic">signal sent</span>
                                ) : (
                                  <button
                                    onClick={() => sendSmokeSignal(inv.invitee_id)}
                                    disabled={isSending}
                                    className="inline-flex items-center gap-1 text-[11px] font-body text-primary hover:text-primary/80 transition-colors disabled:opacity-40 active:scale-95"
                                  >
                                    🌫️ Send smoke signal
                                  </button>
                                )}
                              </>
                            ) : (
                              <span className="text-[10px] text-primary/70">🔥 active</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Link
                to="/invites/tree"
                className="inline-flex items-center gap-2 text-sm font-body text-primary hover:text-primary/80 transition-colors mt-2"
              >
                <TreePine size={14} />
                View your invite tree
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground font-body">
              Your invite link will appear here once your account is fully set up.
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Invites;
