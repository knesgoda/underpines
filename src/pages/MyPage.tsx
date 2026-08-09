import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import UserAvatar from '@/components/UserAvatar';
import PineTreeLoading from '@/components/PineTreeLoading';
import CircleButton from '@/components/circles/CircleButton';
import CabinPostHistory from '@/components/cabin/CabinPostHistory';
import { formatTimeAgo } from '@/lib/time';
import {
  usePageProfile,
  usePageModules,
  useOwnVisitCount,
  useTopFriends,
  useWallNotes,
} from '@/hooks/useProfilePage';
import '@/styles/profile.css';

const memberSince = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '';

/**
 * "My Page" — the profile, replacing the Cabin.
 *
 * The animated scene is gone; what stays is the part people actually used, a
 * page they can make their own. Modules come from cabin_widgets, which already
 * had the right shape.
 *
 * Top Friends and Wall Notes depend on tables added by the Phase 3 migration.
 * Their hooks return empty rather than throwing when the tables are absent, so
 * those sections simply do not render until the schema lands.
 */
const MyPage = () => {
  const { handle } = useParams<{ handle?: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = usePageProfile(handle);
  const isOwner = !!user && !!profile && user.id === profile.id;

  const { data: modules } = usePageModules(profile?.id);
  const { data: visits } = useOwnVisitCount(profile?.id, isOwner);
  const { data: topFriends } = useTopFriends(profile?.id);
  const { data: wallNotes } = useWallNotes(profile?.id);

  const [note, setNote] = useState('');
  const [posting, setPosting] = useState(false);

  if (isLoading) return <PineTreeLoading />;

  if (!profile) {
    return (
      <div className="page-shell">
        <section className="panel p-10 text-center">
          <p className="font-body text-sm text-foreground">No page here.</p>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            That handle does not belong to anyone.
          </p>
        </section>
      </div>
    );
  }

  const postNote = async () => {
    if (!user || !note.trim()) return;
    setPosting(true);
    const { error } = await supabase
      .from('wall_notes' as never)
      .insert({ profile_id: profile.id, author_id: user.id, content: note.trim() } as never);
    setPosting(false);

    if (error) {
      toast.error('Could not leave that note.');
      return;
    }
    setNote('');
    queryClient.invalidateQueries({ queryKey: ['wall-notes', profile.id] });
  };

  const about = profile.bio || profile.mantra;

  return (
    <div className="page-shell">
      <div className="profile-layout">
        <aside className="profile-side">
          <section className="panel profile-hero">
            <UserAvatar
              avatarUrl={profile.avatar_url}
              defaultAvatarKey={profile.default_avatar_key}
              displayName={profile.display_name}
              size={58}
            />
            <div className="profile-name min-w-0">
              <h1 className="truncate">{profile.display_name}</h1>
              <small>@{profile.handle}</small>
              {profile.mantra && <p className="profile-mantra">“{profile.mantra}”</p>}
            </div>
          </section>

          <section className="panel module">
            <h2>At a glance</h2>
            <p className="text-sm text-muted-foreground">
              {profile.city && <>Somewhere near {profile.city}.<br /></>}
              {profile.created_at && <>Here since {memberSince(profile.created_at)}.</>}
            </p>
            {isOwner && typeof visits === 'number' && (
              <p className="visit-count mt-3">
                {visits} view{visits === 1 ? '' : 's'} in the last 30 days — only you can see this.
              </p>
            )}
            <div className="mt-4 flex gap-2">
              {isOwner ? (
                <Link to="/settings" className="outline-button flex-1 text-center">Edit my page</Link>
              ) : (
                <CircleButton profileId={profile.id} profileName={profile.display_name} />
              )}
            </div>
          </section>

          {topFriends && topFriends.length > 0 && (
            <section className="panel module">
              <h2>Top friends</h2>
              <div className="top-friends">
                {topFriends.map((t, i) => (
                  <Link key={t.friend_id} to={`/${t.profile.handle}`} className="top-friend">
                    <UserAvatar
                      avatarUrl={t.profile.avatar_url}
                      defaultAvatarKey={t.profile.default_avatar_key}
                      displayName={t.profile.display_name}
                      size={46}
                    />
                    <span className="rank">{i + 1}</span>
                    <b>{t.profile.display_name}</b>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {modules && modules.length > 0 && (
            <section className="panel module">
              <h2>Modules</h2>
              {modules.map(m => (
                <p key={m.id} className="mb-2 text-sm">
                  <b className="mr-1 capitalize">{String(m.widget_type).replace(/[_-]/g, ' ')}</b>
                  {typeof (m.widget_data as any)?.text === 'string' && (m.widget_data as any).text}
                </p>
              ))}
            </section>
          )}
        </aside>

        <div className="profile-main">
          {about && (
            <section className="panel module">
              <h2>About me</h2>
              <p>{about}</p>
            </section>
          )}

          {profile.currently_value && (
            <section className="panel module">
              <h2>Currently {profile.currently_type ?? ''}</h2>
              <p>{profile.currently_value}</p>
            </section>
          )}

          <section className="panel module">
            <h2>Wall notes</h2>
            {user && (
              <div className="wall-form mb-3">
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  maxLength={1000}
                  placeholder={isOwner ? 'Leave yourself a note.' : `Say something to ${profile.display_name}.`}
                  aria-label="Write a wall note"
                />
                <button
                  type="button"
                  className="solid-button justify-self-end"
                  onClick={postNote}
                  disabled={posting || !note.trim()}
                >
                  {posting ? 'Posting…' : 'Post note'}
                </button>
              </div>
            )}

            {(!wallNotes || wallNotes.length === 0) && (
              <p className="text-sm text-muted-foreground">Nothing on the wall yet.</p>
            )}

            {wallNotes?.map(n => (
              <div key={n.id} className="wall-note">
                <UserAvatar
                  avatarUrl={n.profile?.avatar_url ?? null}
                  defaultAvatarKey={n.profile?.default_avatar_key ?? null}
                  displayName={n.profile?.display_name ?? ''}
                  size={30}
                />
                <div className="min-w-0">
                  <p>{n.content}</p>
                  <small>
                    {n.profile?.display_name ?? 'Someone'} · {formatTimeAgo(n.created_at)}
                  </small>
                </div>
              </div>
            ))}
          </section>

          <section className="panel module">
            <h2>Posts</h2>
            <CabinPostHistory
              profileId={profile.id}
              isOwner={isOwner}
              isInCircle={true}
              atmosphere={null}
            />
          </section>
        </div>
      </div>
    </div>
  );
};

export default MyPage;
