import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, MoreHorizontal, Search } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import PineTreeLoading from '@/components/PineTreeLoading';
import UserAvatar from '@/components/UserAvatar';
import { useFriendActions, useFriendLists, type Friend } from '@/hooks/useFriends';
import '@/styles/friends.css';

type Tab = 'friends' | 'requests' | 'restricted';

/**
 * Friends.
 *
 * Was "Your Circles", with tabs called "Trail together" and "Trail invites"
 * and a menu item labelled "Bank the fire". Every one of those needed a
 * translation before you could use it — the nomenclature that cost the launch.
 * The words are now the ordinary ones; only the table names stayed.
 */
const CirclesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: lists, isLoading } = useFriendLists();
  const actions = useFriendActions();

  const [tab, setTab] = useState<Tab>('friends');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Friend | null>(null);

  if (isLoading) return <PineTreeLoading />;

  if (!user) {
    return (
      <div className="page-shell">
        <section className="panel empty-panel">
          <p>Sign in to see who you know here.</p>
          <Link to="/login" className="outline-button mt-4 inline-block">Sign in</Link>
        </section>
      </div>
    );
  }

  const { friends = [], incoming = [], outgoing = [], blocked = [], muted = [] } = lists ?? {};
  const requestCount = incoming.length + outgoing.length;

  /** Open the one-to-one thread with someone, making it if it is not there. */
  const message = async (friend: Friend) => {
    const { data: mine } = await supabase
      .from('campfire_participants')
      .select('campfire_id')
      .eq('user_id', user.id);

    for (const p of mine ?? []) {
      const { data: shared } = await supabase
        .from('campfire_participants')
        .select('user_id')
        .eq('campfire_id', p.campfire_id)
        .eq('user_id', friend.id)
        .maybeSingle();
      if (!shared) continue;

      const { data: existing } = await supabase
        .from('campfires')
        .select('id')
        .eq('id', p.campfire_id)
        .eq('campfire_type', 'one_on_one')
        .eq('is_active', true)
        .maybeSingle();
      if (existing) { navigate('/messages'); return; }
    }

    const { data: created, error } = await supabase
      .from('campfires')
      .insert({ campfire_type: 'one_on_one', firekeeper_id: user.id, name: friend.display_name })
      .select()
      .single();

    if (error || !created) { toast.error('Could not start that conversation.'); return; }

    await supabase.from('campfire_participants').insert([
      { campfire_id: created.id, user_id: user.id },
      { campfire_id: created.id, user_id: friend.id },
    ]);
    navigate('/messages');
  };

  const run = (p: Promise<unknown>, ok: string) =>
    p.then(() => toast.success(ok)).catch(() => toast.error('That did not go through.'));

  return (
    <div className="page-shell">
      <div className="panel-title">
        <span>Friends</span>
        <Link to="/explore" className="outline-button"><Search size={13} className="mr-1 inline" /> Find people</Link>
      </div>

      <div className="friend-tabs">
        {([
          ['friends', `Friends${friends.length ? ` (${friends.length})` : ''}`],
          ['requests', `Requests${requestCount ? ` (${requestCount})` : ''}`],
          ['restricted', 'Blocked & muted'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={tab === key ? 'is-active' : ''}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'friends' && (
        <section className="panel friend-list">
          {friends.length === 0 ? (
            <Empty>You have not added anyone yet. Explore is a good place to start.</Empty>
          ) : friends.map(f => (
            <div key={f.id} className="friend-row">
              <UserAvatar avatarUrl={f.avatar_url} defaultAvatarKey={f.default_avatar_key} displayName={f.display_name} size={40} />
              <div className="friend-name">
                <Link to={`/${f.handle}`}>{f.display_name}</Link>
                <small>@{f.handle}</small>
              </div>
              <button type="button" className="outline-button" onClick={() => message(f)}>
                <MessageSquare size={12} className="mr-1 inline" /> Message
              </button>
              <div className="friend-menu">
                <button
                  type="button"
                  onClick={() => setMenuOpen(menuOpen === f.id ? null : f.id)}
                  aria-label={`More for ${f.display_name}`}
                  aria-expanded={menuOpen === f.id}
                >
                  <MoreHorizontal size={16} />
                </button>
                {menuOpen === f.id && (
                  <div className="friend-menu-list">
                    <button type="button" onClick={() => { setMenuOpen(null); navigate(`/${f.handle}`); }}>
                      View their page
                    </button>
                    <button type="button" onClick={() => { setMenuOpen(null); setConfirmRemove(f); }}>
                      Remove friend
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(null); run(actions.mute.mutateAsync(f.id), `Muted ${f.display_name}.`); }}
                    >
                      Mute — stay friends, stop seeing posts
                    </button>
                    <button
                      type="button"
                      className="destructive"
                      onClick={() => { setMenuOpen(null); run(actions.block.mutateAsync(f.id), `Blocked ${f.display_name}.`); }}
                    >
                      Block
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === 'requests' && (
        <div className="friend-groups">
          <section className="panel friend-list">
            <h2>Waiting on you</h2>
            {incoming.length === 0 ? <Empty>Nobody is waiting.</Empty> : incoming.map(f => (
              <div key={f.circleId} className="friend-row">
                <UserAvatar avatarUrl={f.avatar_url} defaultAvatarKey={f.default_avatar_key} displayName={f.display_name} size={40} />
                <div className="friend-name">
                  <Link to={`/${f.handle}`}>{f.display_name}</Link>
                  <small>@{f.handle}</small>
                </div>
                <button
                  type="button"
                  className="solid-button"
                  onClick={() => run(actions.accept.mutateAsync(f.circleId), `You and ${f.display_name} are friends.`)}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => run(actions.decline.mutateAsync(f.circleId), 'Declined.')}
                >
                  Not now
                </button>
              </div>
            ))}
          </section>

          <section className="panel friend-list">
            <h2>Sent by you</h2>
            {outgoing.length === 0 ? <Empty>No requests out.</Empty> : outgoing.map(f => (
              <div key={f.circleId} className="friend-row">
                <UserAvatar avatarUrl={f.avatar_url} defaultAvatarKey={f.default_avatar_key} displayName={f.display_name} size={40} />
                <div className="friend-name">
                  <Link to={`/${f.handle}`}>{f.display_name}</Link>
                  <small>Waiting for them</small>
                </div>
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => run(actions.withdraw.mutateAsync(f.circleId), 'Withdrawn.')}
                >
                  Withdraw
                </button>
              </div>
            ))}
          </section>
        </div>
      )}

      {tab === 'restricted' && (
        <div className="friend-groups">
          <section className="panel friend-list">
            <h2>Blocked</h2>
            <p className="note">They cannot see you and you cannot see them.</p>
            {blocked.length === 0 ? <Empty>Nobody blocked.</Empty> : blocked.map(b => (
              <div key={b.rowId} className="friend-row">
                <UserAvatar avatarUrl={null} defaultAvatarKey={null} displayName={b.display_name} size={40} />
                <div className="friend-name">
                  <span>{b.display_name}</span>
                  <small>@{b.handle}</small>
                </div>
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => run(actions.unblock.mutateAsync(b.rowId), 'Unblocked.')}
                >
                  Unblock
                </button>
              </div>
            ))}
          </section>

          <section className="panel friend-list">
            <h2>Muted</h2>
            <p className="note">Still friends. Their posts stay out of your feed.</p>
            {muted.length === 0 ? <Empty>Nobody muted.</Empty> : muted.map(m => (
              <div key={m.rowId} className="friend-row">
                <UserAvatar avatarUrl={null} defaultAvatarKey={null} displayName={m.display_name} size={40} />
                <div className="friend-name">
                  <span>{m.display_name}</span>
                  <small>@{m.handle}</small>
                </div>
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => run(actions.unmute.mutateAsync(m.rowId), 'Unmuted.')}
                >
                  Unmute
                </button>
              </div>
            ))}
          </section>
        </div>
      )}

      <AlertDialog open={!!confirmRemove} onOpenChange={open => !open && setConfirmRemove(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-lg">
              Remove {confirmRemove?.display_name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-body text-sm text-muted-foreground">
              They are not told, and either of you can ask again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body text-sm">Never mind</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmRemove) run(actions.decline.mutateAsync(confirmRemove.circleId), 'Removed.');
                setConfirmRemove(null);
              }}
              className="font-body text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="friend-empty">{children}</p>
);

export default CirclesPage;
