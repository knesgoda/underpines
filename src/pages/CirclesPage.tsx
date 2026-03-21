import { useState, useEffect } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, Flame, Search } from 'lucide-react';
import PineTreeLoading from '@/components/PineTreeLoading';
import UserAvatar from '@/components/UserAvatar';
import { toast } from 'sonner';

interface CircleMember {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  default_avatar_key: string | null;
  updated_at: string | null;
  circleId: string;
  direction: 'sent' | 'received';
}

interface BlockedUser {
  id: string;
  display_name: string;
  handle: string;
  blockId: string;
}

interface MutedUser {
  id: string;
  display_name: string;
  handle: string;
  muteId: string;
}

const CirclesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'trail' | 'invites' | 'blocked'>('trail');
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [pendingSent, setPendingSent] = useState<CircleMember[]>([]);
  const [pendingReceived, setPendingReceived] = useState<CircleMember[]>([]);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [muted, setMuted] = useState<MutedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user]);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);

    const { data: circles } = await supabase
      .from('circles')
      .select('*')
      .or(`requester_id.eq.${user.id},requestee_id.eq.${user.id}`);

    if (circles) {
      const otherIds = circles.map(c => c.requester_id === user.id ? c.requestee_id : c.requester_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url, default_avatar_key, updated_at')
        .in('id', otherIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const accepted: CircleMember[] = [];
      const sentPending: CircleMember[] = [];
      const receivedPending: CircleMember[] = [];

      circles.forEach(c => {
        const otherId = c.requester_id === user.id ? c.requestee_id : c.requester_id;
        const p = profileMap.get(otherId);
        if (!p) return;

        const member: CircleMember = {
          id: p.id,
          display_name: p.display_name,
          handle: p.handle,
          avatar_url: (p as any).avatar_url ?? null,
          default_avatar_key: (p as any).default_avatar_key ?? null,
          updated_at: p.updated_at,
          circleId: c.id,
          direction: c.requester_id === user.id ? 'sent' : 'received',
        };

        if (c.status === 'accepted') accepted.push(member);
        else if (c.status === 'pending' && c.requester_id === user.id) sentPending.push(member);
        else if (c.status === 'pending' && c.requestee_id === user.id) receivedPending.push(member);
      });

      setMembers(accepted);
      setPendingSent(sentPending);
      setPendingReceived(receivedPending);
    }

    const { data: blockRows } = await supabase
      .from('blocks')
      .select('*')
      .eq('blocker_id', user.id);

    if (blockRows && blockRows.length > 0) {
      const { data: blockProfiles } = await supabase
        .from('profiles')
        .select('id, display_name, handle')
        .in('id', blockRows.map(b => b.blocked_id));

      setBlocked((blockProfiles || []).map(p => ({
        ...p,
        blockId: blockRows.find(b => b.blocked_id === p.id)!.id,
      })));
    }

    const { data: muteRows } = await supabase
      .from('mutes')
      .select('*')
      .eq('muter_id', user.id);

    if (muteRows && muteRows.length > 0) {
      const { data: muteProfiles } = await supabase
        .from('profiles')
        .select('id, display_name, handle')
        .in('id', muteRows.map(m => m.muted_id));

      setMuted((muteProfiles || []).map(p => ({
        ...p,
        muteId: muteRows.find(m => m.muted_id === p.id)!.id,
      })));
    }

    setLoading(false);
  };

  const acceptRequest = async (circleId: string, name: string) => {
    await supabase.from('circles').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', circleId);
    toast.success(`You and ${name} are now on the trail together. 🌲`);
    loadAll();
  };

  const declineRequest = async (circleId: string) => {
    await supabase.from('circles').update({ status: 'declined', updated_at: new Date().toISOString() }).eq('id', circleId);
    loadAll();
  };

  const withdrawRequest = async (circleId: string) => {
    await supabase.from('circles').delete().eq('id', circleId);
    loadAll();
  };

  const removeFromCircle = async (member: CircleMember) => {
    if (!confirm(`Leave ${member.display_name}'s trail? They won't be notified, and you can always reconnect.`)) return;
    await supabase.from('circles').update({ status: 'declined' }).eq('id', member.circleId);
    setMenuOpen(null);
    loadAll();
  };

  const blockUser = async (userId: string, name: string) => {
    if (!user) return;
    await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: userId });
    await supabase.from('circles')
      .update({ status: 'declined' })
      .or(`and(requester_id.eq.${user.id},requestee_id.eq.${userId}),and(requester_id.eq.${userId},requestee_id.eq.${user.id})`);
    setMenuOpen(null);
    toast(`Stepped away from ${name}'s fire`);
    loadAll();
  };

  const muteUser = async (userId: string, name: string) => {
    if (!user) return;
    await supabase.from('mutes').insert({ muter_id: user.id, muted_id: userId });
    setMenuOpen(null);
    toast(`Banked the fire with ${name}`);
    loadAll();
  };

  const unblock = async (blockId: string) => {
    await supabase.from('blocks').delete().eq('id', blockId);
    loadAll();
  };

  const unmute = async (muteId: string) => {
    await supabase.from('mutes').delete().eq('id', muteId);
    loadAll();
  };

  const startCampfire = async (memberId: string, memberName: string) => {
    if (!user) return;
    const { data: myParts } = await supabase
      .from('campfire_participants')
      .select('campfire_id')
      .eq('user_id', user.id);

    if (myParts) {
      for (const p of myParts) {
        const { data: other } = await supabase
          .from('campfire_participants')
          .select('user_id')
          .eq('campfire_id', p.campfire_id)
          .eq('user_id', memberId)
          .maybeSingle();
        if (other) {
          const { data: cf } = await supabase
            .from('campfires')
            .select('id')
            .eq('id', p.campfire_id)
            .eq('campfire_type', 'one_on_one')
            .eq('is_active', true)
            .maybeSingle();
          if (cf) { navigate(`/campfires`); return; }
        }
      }
    }

    const { data: newCf } = await supabase
      .from('campfires')
      .insert({ campfire_type: 'one_on_one', firekeeper_id: user.id, name: memberName })
      .select()
      .single();

    if (newCf) {
      await supabase.from('campfire_participants').insert([
        { campfire_id: newCf.id, user_id: user.id },
        { campfire_id: newCf.id, user_id: memberId },
      ]);
      navigate(`/campfires`);
    }
  };

  if (loading) return <PineTreeLoading />;

  const pendingCount = pendingSent.length + pendingReceived.length;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display text-2xl text-foreground mb-6">🌲 Your Circles</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1">
        {([
          { key: 'trail' as const, label: 'Trail together' },
          { key: 'invites' as const, label: `Trail invites${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
          { key: 'blocked' as const, label: 'Blocked & Muted' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg font-body text-sm transition-colors ${tab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Trail together */}
      {tab === 'trail' && (
        <div className="space-y-2">
          {members.length === 0 ? (
            <EmptyState icon="🌲" text="Your trail is quiet. Find people to walk with." />
          ) : (
            members.map(m => (
              <div key={m.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar avatarUrl={m.avatar_url} defaultAvatarKey={m.default_avatar_key} displayName={m.display_name} size={40} />
                  <div className="min-w-0">
                    <Link to={`/${m.handle}`} className="font-body text-sm font-medium text-foreground truncate block hover:opacity-80">{m.display_name}</Link>
                    <p className="font-body text-xs text-muted-foreground">@{m.handle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => startCampfire(m.id, m.display_name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border font-body text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                  >
                    <Flame size={12} /> Campfire
                  </button>
                  <div className="relative">
                    <button onClick={() => setMenuOpen(menuOpen === m.id ? null : m.id)} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted">
                      <MoreHorizontal size={16} />
                    </button>
                    <AnimatePresence>
                      {menuOpen === m.id && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-xl shadow-card overflow-hidden z-20">
                          <MBtn onClick={() => { navigate(`/${m.handle}`); }}>View Cabin</MBtn>
                          <MBtn onClick={() => removeFromCircle(m)}>Leave their trail</MBtn>
                          <MBtn onClick={() => muteUser(m.id, m.display_name)}>Bank the fire (mute)</MBtn>
                          <div className="h-px bg-border" />
                          <MBtn onClick={() => blockUser(m.id, m.display_name)} destructive>Step away from the fire</MBtn>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Trail invites */}
      {tab === 'invites' && (
        <div className="space-y-6">
          {pendingReceived.length > 0 && (
            <div>
              <h3 className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-3">Wants to walk the trail with you</h3>
              <div className="space-y-2">
                {pendingReceived.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-3">
                      <UserAvatar avatarUrl={m.avatar_url} defaultAvatarKey={m.default_avatar_key} displayName={m.display_name} size={40} />
                      <div>
                        <p className="font-body text-sm font-medium text-foreground">{m.display_name}</p>
                        <p className="font-body text-xs text-muted-foreground">@{m.handle}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => acceptRequest(m.circleId, m.display_name)} className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground font-body text-xs font-medium">Join their trail</button>
                      <button onClick={() => declineRequest(m.circleId)} className="px-3 py-1.5 rounded-full border border-border font-body text-xs text-muted-foreground">Not now</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingSent.length > 0 && (
            <div>
              <h3 className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-3">Your sent trail invites</h3>
              <div className="space-y-2">
                {pendingSent.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-3">
                      <UserAvatar avatarUrl={m.avatar_url} defaultAvatarKey={m.default_avatar_key} displayName={m.display_name} size={40} />
                      <div>
                        <p className="font-body text-sm font-medium text-foreground">{m.display_name}</p>
                        <p className="font-body text-xs text-muted-foreground">@{m.handle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-body text-xs text-muted-foreground">Waiting by the fire...</span>
                      <button onClick={() => withdrawRequest(m.circleId)} className="px-3 py-1.5 rounded-full border border-border font-body text-xs text-muted-foreground hover:text-foreground">Withdraw</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingReceived.length === 0 && pendingSent.length === 0 && (
            <EmptyState icon="🌿" text="No trail invites right now." />
          )}
        </div>
      )}

      {/* Tab: Blocked & Muted */}
      {tab === 'blocked' && (
        <div className="space-y-6">
          <div>
            <h3 className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-3">Stepped away from</h3>
            {blocked.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground">No one blocked.</p>
            ) : (
              <div className="space-y-2">
                {blocked.map(b => (
                  <div key={b.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-medium text-secondary-foreground">
                        {b.display_name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-body text-sm text-foreground">{b.display_name}</p>
                        <p className="font-body text-xs text-muted-foreground">@{b.handle}</p>
                      </div>
                    </div>
                    <button onClick={() => unblock(b.blockId)} className="px-3 py-1.5 rounded-full border border-border font-body text-xs text-muted-foreground hover:text-foreground">
                      Remove block
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-3">Banked fires</h3>
            {muted.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground">No one muted.</p>
            ) : (
              <div className="space-y-2">
                {muted.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-medium text-secondary-foreground">
                        {m.display_name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-body text-sm text-foreground">{m.display_name}</p>
                        <p className="font-body text-xs text-muted-foreground">@{m.handle}</p>
                      </div>
                    </div>
                    <button onClick={() => unmute(m.muteId)} className="px-3 py-1.5 rounded-full border border-border font-body text-xs text-muted-foreground hover:text-foreground">
                      Unmute
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Find people */}
      <div className="text-center pt-8 pb-4">
        <Link to="/search" className="inline-flex items-center gap-1.5 font-body text-sm text-primary hover:opacity-80 transition-opacity">
          <Search size={14} /> Find people in the Pines
        </Link>
      </div>
    </motion.div>
  );
};

const EmptyState = ({ icon, text }: { icon: string; text: string }) => (
  <div className="text-center py-12">
    <p className="text-3xl mb-2">{icon}</p>
    <p className="font-body text-sm text-muted-foreground">{text}</p>
  </div>
);

const MBtn = ({ children, onClick, destructive }: { children: React.ReactNode; onClick: () => void; destructive?: boolean }) => (
  <button onClick={onClick} className={`w-full text-left px-3 py-2 text-sm font-body flex items-center gap-2 transition-colors ${destructive ? 'text-destructive hover:bg-destructive/10' : 'text-foreground hover:bg-muted'}`}>
    {children}
  </button>
);

export default CirclesPage;
