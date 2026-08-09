import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, Settings, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import PineTreeLoading from '@/components/PineTreeLoading';
import { ErrorPanel } from '@/components/StatePanel';
import CampFirepit from '@/components/camps/CampFirepit';
import CampLodge from '@/components/camps/CampLodge';
import CampBonfire from '@/components/camps/CampBonfire';
import { roleLabel, settlingDaysLeft } from '@/hooks/useGroups';
import '@/styles/groups.css';

interface Group {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  visibility: string;
  firekeeper_id: string;
  member_count: number | null;
  is_active: boolean | null;
}

type Tab = 'wall' | 'board' | 'chat';

const TABS: { key: Tab; label: string }[] = [
  { key: 'wall', label: 'Wall' },
  { key: 'board', label: 'Noticeboard' },
  { key: 'chat', label: 'Group chat' },
];

/**
 * A group.
 *
 * The three tabs were "Firepit", "Lodge" and "Bonfire" — three fire-adjacent
 * words for a wall, a pinned-notes board and a chat room, with nothing to tell
 * you which was which. Roles come from useGroups so a member sees Owner and
 * Moderator rather than Firekeeper and Trailblazer.
 *
 * The old page also required a session before it would render anything and
 * never cleared its loading flag without one, so every group link shared
 * outside the app led to a permanent spinner. Signed out now gets the same
 * preview a non-member gets.
 */
const CampView = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('wall');
  const [joining, setJoining] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const { data: group, isLoading, isError } = useQuery({
    queryKey: ['group', id],
    enabled: !!id,
    queryFn: async (): Promise<Group | null> => {
      const { data, error } = await supabase.from('camps').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data as Group | null;
    },
  });

  const { data: membership } = useQuery({
    queryKey: ['group-membership', id, user?.id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('camp_members')
        .select('role, scout_ends_at')
        .eq('camp_id', id!)
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) return <PineTreeLoading />;
  if (isError) return <div className="page-shell"><ErrorPanel what="this group" /></div>;

  if (!group) {
    return (
      <div className="page-shell">
        <section className="panel state-panel">
          <p className="quiet">That branch snapped.</p>
          <p>No group here. It may have been closed.</p>
          <Link to="/groups" className="outline-button mt-4 inline-block">Browse groups</Link>
        </section>
      </div>
    );
  }

  const isOwner = membership?.role === 'firekeeper';
  const canModerate = isOwner || membership?.role === 'trailblazer';
  const isSettlingIn = membership?.role === 'scout';
  const settlingDays = isSettlingIn ? settlingDaysLeft(membership?.scout_ends_at ?? null) : null;
  const inviteOnly = group.visibility === 'ember' || group.visibility === 'hidden';

  const cover = group.cover_image_url
    ? <img src={group.cover_image_url} alt="" className="group-cover" />
    : <span className="group-cover group-blank"><Users size={26} /></span>;

  const join = async () => {
    if (!user) { navigate('/login'); return; }
    if (inviteOnly) { toast('Ask a member to send you an invite from inside the group.'); return; }
    setJoining(true);

    const { error } = await supabase.from('camp_members').insert({
      camp_id: group.id,
      user_id: user.id,
      role: 'scout',
      scout_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    });

    if (error) {
      toast.error('Could not join.');
      setJoining(false);
      return;
    }

    await supabase.from('camps')
      .update({ member_count: (group.member_count ?? 1) + 1 })
      .eq('id', group.id);

    const { data: chat } = await supabase
      .from('campfires')
      .select('id')
      .eq('camp_id', group.id)
      .eq('campfire_type', 'bonfire')
      .is('bonfire_sub_group_of', null)
      .maybeSingle();

    if (chat) {
      await supabase.from('campfire_participants').insert({ campfire_id: chat.id, user_id: user.id });
    }

    toast.success(`You're in ${group.name}.`);
    setJoining(false);
    queryClient.invalidateQueries({ queryKey: ['group-membership'] });
    queryClient.invalidateQueries({ queryKey: ['my-groups'] });
  };

  const leave = async () => {
    if (!user) return;
    await supabase.from('camp_members').delete().eq('camp_id', group.id).eq('user_id', user.id);
    await supabase.from('camps')
      .update({ member_count: Math.max(0, (group.member_count ?? 1) - 1) })
      .eq('id', group.id);
    setLeaveOpen(false);
    toast('You left the group.');
    navigate('/groups');
  };

  // Not a member — the public face of the group.
  if (!membership) {
    return (
      <div className="page-shell">
        <section className="panel group-intro">
          {cover}
          <h1>{group.name}</h1>
          {group.description && <p>{group.description}</p>}
          <small>{group.member_count ?? 1} member{(group.member_count ?? 1) === 1 ? '' : 's'}</small>

          {inviteOnly ? (
            <p className="gated">Invite only. A member has to bring you in.</p>
          ) : (
            <button type="button" className="solid-button" onClick={join} disabled={joining}>
              {joining ? 'Joining…' : user ? 'Join this group' : 'Sign in to join'}
            </button>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <section className="panel group-header">
        {cover}
        <div className="group-header-text">
          <h1>{group.name}</h1>
          <small>
            {roleLabel(membership.role)} · {group.member_count ?? 1} member
            {(group.member_count ?? 1) === 1 ? '' : 's'}
          </small>
          {group.description && <p>{group.description}</p>}
        </div>
        <div className="group-header-actions">
          {isOwner ? (
            <Link to={`/camps/${group.id}/settings`} aria-label="Group settings"><Settings size={17} /></Link>
          ) : (
            <button type="button" onClick={() => setLeaveOpen(true)} aria-label="Leave group"><LogOut size={17} /></button>
          )}
        </div>
      </section>

      {isSettlingIn && settlingDays !== null && (
        <p className="group-settling">
          You are still settling in — you can read everything, and post to the Wall in {settlingDays}{' '}
          day{settlingDays === 1 ? '' : 's'}.
        </p>
      )}

      <div className="tab-strip">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={tab === t.key ? 'is-active' : ''}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'wall' && (
        <CampFirepit
          campId={group.id}
          isScout={!!isSettlingIn}
          scoutDays={settlingDays}
          canModerate={canModerate}
        />
      )}
      {tab === 'board' && <CampLodge campId={group.id} canWrite={canModerate} isFirekeeper={!!isOwner} />}
      {tab === 'chat' && <CampBonfire campId={group.id} isScout={!!isSettlingIn} scoutDays={settlingDays} />}

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-lg">Leave {group.name}?</AlertDialogTitle>
            <AlertDialogDescription className="font-body text-sm text-muted-foreground">
              {inviteOnly
                ? 'This group is invite only, so you would need another invite to come back.'
                : 'You can rejoin whenever you like.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body text-sm">Stay</AlertDialogCancel>
            <AlertDialogAction
              onClick={leave}
              className="font-body text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CampView;
