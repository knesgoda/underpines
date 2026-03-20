import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Flame, CircleDot, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import PineTreeLoading from '@/components/PineTreeLoading';
import UserAvatar from '@/components/UserAvatar';

interface TreeNode {
  id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url?: string | null;
  default_avatar_key?: string | null;
  isActive: boolean;
}

const InviteTree = () => {
  const { user } = useAuth();
  const [inviter, setInviter] = useState<TreeNode | null>(null);
  const [invitees, setInvitees] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;

      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

      // Who invited me?
      const { data: myUse } = await supabase
        .from('invite_uses')
        .select('invite_id')
        .eq('invitee_id', user.id)
        .maybeSingle();

      if (myUse) {
        const { data: inv } = await supabase
          .from('invites')
          .select('inviter_id')
          .eq('id', myUse.invite_id)
          .maybeSingle();

        if (inv) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, display_name, handle, avatar_url, default_avatar_key')
            .eq('id', inv.inviter_id)
            .maybeSingle();

          if (profile) {
            setInviter({
              id: profile.id,
              display_name: profile.display_name,
              handle: profile.handle,
              avatar_url: profile.avatar_url,
              default_avatar_key: profile.default_avatar_key,
              isActive: true, // inviter looked up separately below
            });
          }
        }
      }

      // Who have I invited?
      const { data: myInvite } = await supabase
        .from('invites')
        .select('id')
        .eq('inviter_id', user.id)
        .maybeSingle();

      if (myInvite) {
        const { data: uses } = await supabase
          .from('invite_uses')
          .select('invitee_id')
          .eq('invite_id', myInvite.id);

        if (uses && uses.length > 0) {
          const ids = uses.map(u => u.invitee_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, handle, avatar_url, default_avatar_key')
            .in('id', ids);

          if (profiles) {
            setInvitees(
              profiles.map(p => ({
                id: p.id,
                display_name: p.display_name,
                handle: p.handle,
                avatar_url: p.avatar_url,
                default_avatar_key: p.default_avatar_key,
                isActive: true, // activity checked via updated_at below
              }))
            );
          }
        }
      }

      setLoading(false);
    };

    fetch();
  }, [user]);

  if (loading) return <PineTreeLoading />;

  return (
    <div className="min-h-screen bg-background texture-paper">
      <div className="max-w-lg mx-auto px-6 py-16">
        <Link
          to="/invites"
          className="inline-flex items-center gap-1.5 text-sm font-body text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Invites
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-display text-foreground mb-2">Your Invite Tree</h1>
          <p className="text-sm font-body text-muted-foreground mb-10">
            Your lineage in the forest — who brought you here, and who you've welcomed.
          </p>

          <div className="flex flex-col items-center gap-0">
            {/* Inviter (parent) */}
            {inviter ? (
              <>
                <NodeCard node={inviter} label="Invited you" index={0} />
                <ConnectorLine />
              </>
            ) : (
              <>
                <div className="rounded-2xl bg-card border border-border p-4 shadow-soft w-full text-center">
                  <p className="text-sm font-body text-muted-foreground italic">
                    You arrived at the edge of the forest on your own.
                  </p>
                </div>
                <ConnectorLine />
              </>
            )}

            {/* Current user (self) */}
            <div className="rounded-2xl bg-primary/10 border-2 border-primary/30 p-4 shadow-soft w-full flex items-center gap-3">
              <UserAvatar
                avatarUrl={null}
                defaultAvatarKey={null}
                displayName="You"
                size={36}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-display text-foreground font-medium">You</p>
              </div>
              <Flame size={16} className="text-primary animate-pulse" />
            </div>

            {/* Invitees (children) */}
            {invitees.length > 0 && (
              <>
                <ConnectorLine />
                <div className="w-full space-y-0">
                  {invitees.map((node, i) => (
                    <div key={node.id}>
                      {i > 0 && <div className="h-2" />}
                      <NodeCard node={node} label="You invited" index={i + 1} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {invitees.length === 0 && (
              <>
                <ConnectorLine />
                <div className="rounded-2xl bg-card border border-dashed border-border p-4 w-full text-center">
                  <p className="text-sm font-body text-muted-foreground italic">
                    No one has wandered through your gate yet.
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const ConnectorLine = () => (
  <div className="w-px h-6 bg-border" />
);

const NodeCard = ({ node, label, index }: { node: TreeNode; label: string; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: index * 0.08 }}
    className="rounded-2xl bg-card border border-border p-4 shadow-soft w-full flex items-center gap-3"
  >
    <UserAvatar
      avatarUrl={node.avatar_url}
      defaultAvatarKey={node.default_avatar_key}
      displayName={node.display_name}
      size={36}
    />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-display text-foreground font-medium truncate">
        {node.display_name || 'Unknown'}
      </p>
      <p className="text-xs font-body text-muted-foreground truncate">
        @{node.handle} · <span className="opacity-70">{label}</span>
      </p>
    </div>
    {node.isActive ? (
      <Flame size={16} className="text-primary shrink-0 animate-pulse" />
    ) : (
      <CircleDot size={16} className="text-muted-foreground/40 shrink-0" />
    )}
  </motion.div>
);

export default InviteTree;
