import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Copy, TreePine, Share2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import PineTreeLoading from '@/components/PineTreeLoading';
import { useSeedlingStatus } from '@/hooks/useSeedlingStatus';
import UserAvatar from '@/components/UserAvatar';

const THIRTY_DAYS_MS = 30 * 86400000;

const EARNING_CRITERIA = [
  { text: 'Someone accepts your invite within 72 hours', slots: '+3' },
  { text: 'Publish your first 10 posts', slots: '+1' },
  { text: 'Keep an active Campfire for 30+ days', slots: '+1' },
  { text: '3 of your invitees become active members', slots: '+2' },
  { text: 'Your account turns 1 year old', slots: '+3' },
];

const Invites = () => {
  const { user } = useAuth();
  const { isSeedling, daysLeft } = useSeedlingStatus();
  const [invite, setInvite] = useState<any>(null);
  const [invitees, setInvitees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
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
          .select('*, invitee:invitee_id(id, display_name, handle, avatar_url, default_avatar_key, updated_at)')
          .eq('invite_id', inv.id);

        setInvitees(uses || []);

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
  const hasInvites = invite?.is_infinite || (invite?.uses_remaining > 0);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = inviteUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    toast.success('Link copied. Choose wisely 🌲');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Under Pines',
          text: 'I saved you a seat by the fire.',
          url: inviteUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="min-h-screen bg-background texture-paper">
      <div className="max-w-lg mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-display text-foreground mb-2">Invite someone to the Pines</h1>
          <p className="text-sm font-body text-muted-foreground mb-8 leading-relaxed">
            Everyone here was vouched for by a real person.{' '}
            That's what keeps this place warm.
          </p>

          {isSeedling ? (
            <div className="rounded-2xl bg-card p-6 shadow-soft border border-border">
              <p className="font-body text-sm text-muted-foreground">
                🌱 Your invite link will activate once your Cabin is ready — {daysLeft} {daysLeft === 1 ? 'day' : 'days'} to go.
              </p>
            </div>
          ) : hasInvites && invite ? (
            <div className="space-y-6">
              {/* Invite link card */}
              <div className="rounded-2xl bg-card p-5 shadow-soft border border-border space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🔗</span>
                  <code className="text-sm font-body text-foreground flex-1 break-all select-all">
                    {displayUrl}
                  </code>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCopy}
                    className="flex-1 gap-2"
                    variant={copied ? 'secondary' : 'default'}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied' : 'Copy Link'}
                  </Button>
                  {'share' in navigator && (
                    <Button
                      onClick={handleShare}
                      variant="outline"
                      className="gap-2"
                    >
                      <Share2 size={16} />
                      Share
                    </Button>
                  )}
                </div>
              </div>

              {/* Counter */}
              {!invite.is_infinite && (
                <p className="text-sm text-muted-foreground font-body">
                  You have {invite.uses_remaining} of {invite.uses_total} invites remaining
                </p>
              )}

              {/* Invite tree preview */}
              <div className="mt-8">
                <h3 className="text-lg font-display text-foreground mb-4">Who you've brought to the Pines</h3>
                {invitees.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-body italic">
                    No one yet. Your first invite could be the start of something good.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {invitees.map((inv: any) => {
                      const isInactive = inv.invitee?.updated_at && inv.invitee.updated_at < thirtyDaysAgo;
                      const alreadySent = sentSignals.has(inv.invitee_id);
                      const isSending = sendingSignal === inv.invitee_id;

                      return (
                        <div key={inv.id} className="flex items-center gap-3 py-2.5 text-sm font-body">
                          <UserAvatar
                            avatarUrl={inv.invitee?.avatar_url}
                            defaultAvatarKey={inv.invitee?.default_avatar_key}
                            displayName={inv.invitee?.display_name}
                            size={28}
                          />
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
                View your full invite tree
              </Link>
            </div>
          ) : invite ? (
            /* Zero invites state */
            <div className="space-y-6">
              <div className="rounded-2xl bg-card p-6 shadow-soft border border-border">
                <p className="font-body text-sm text-foreground mb-4">
                  Your invites are all out in the world. Here's how to earn more:
                </p>
                <ul className="space-y-2">
                  {EARNING_CRITERIA.map((c) => (
                    <li key={c.text} className="flex items-start gap-2 text-sm font-body text-muted-foreground">
                      <span className="text-primary mt-0.5">🌲</span>
                      <span className="flex-1">{c.text}</span>
                      <span className="text-primary/70 font-medium shrink-0">{c.slots}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Still show invite tree even with 0 invites */}
              {invitees.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-display text-foreground mb-4">Who you've brought to the Pines</h3>
                  <div className="space-y-1">
                    {invitees.map((inv: any) => {
                      const isInactive = inv.invitee?.updated_at && inv.invitee.updated_at < thirtyDaysAgo;
                      return (
                        <div key={inv.id} className="flex items-center gap-3 py-2.5 text-sm font-body">
                          <UserAvatar
                            avatarUrl={inv.invitee?.avatar_url}
                            defaultAvatarKey={inv.invitee?.default_avatar_key}
                            displayName={inv.invitee?.display_name}
                            size={28}
                          />
                          <span className="text-foreground">{inv.invitee?.display_name}</span>
                          <span className="text-muted-foreground">@{inv.invitee?.handle}</span>
                          <span className="ml-auto">
                            {isInactive ? (
                              <span className="text-[10px] text-muted-foreground/50">inactive</span>
                            ) : (
                              <span className="text-[10px] text-primary/70">🔥 active</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <Link
                    to="/invites/tree"
                    className="inline-flex items-center gap-2 text-sm font-body text-primary hover:text-primary/80 transition-colors mt-3"
                  >
                    <TreePine size={14} />
                    View your full invite tree
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-card p-6 shadow-soft border border-border">
              <p className="font-body text-sm text-muted-foreground mb-4">
                Your invites are coming soon. Here's how you'll earn them:
              </p>
              <ul className="space-y-2">
                {EARNING_CRITERIA.map((c) => (
                  <li key={c.text} className="flex items-start gap-2 text-sm font-body text-muted-foreground">
                    <span className="text-primary mt-0.5">🌲</span>
                    <span className="flex-1">{c.text}</span>
                    <span className="text-primary/70 font-medium shrink-0">{c.slots}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Invites;
