import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import PineTreeLoading from '@/components/PineTreeLoading';

const Invites = () => {
  const { user } = useAuth();
  const [invite, setInvite] = useState<any>(null);
  const [invitees, setInvitees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
          .select('*, invitee:invitee_id(display_name, handle)')
          .eq('invite_id', inv.id);

        setInvitees(uses || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (loading) return <PineTreeLoading />;

  const inviteUrl = invite ? `https://underpines.com/invite/${invite.slug}` : '';
  const displayUrl = invite ? `underpines.com/invite/${invite.slug}` : '';

  return (
    <div className="min-h-screen bg-background texture-paper">
      <div className="max-w-lg mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-display text-foreground mb-8">Your Invite Link</h1>

          {invite ? (
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
                  <div className="space-y-2">
                    {invitees.map((inv: any) => (
                      <div key={inv.id} className="flex items-center gap-3 py-2 text-sm font-body">
                        <span className="text-foreground">{inv.invitee?.display_name}</span>
                        <span className="text-muted-foreground">@{inv.invitee?.handle}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
