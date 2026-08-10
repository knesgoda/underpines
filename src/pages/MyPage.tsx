import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import UserAvatar from '@/components/UserAvatar';
import PineTreeLoading from '@/components/PineTreeLoading';
import StatePanel from '@/components/StatePanel';
import CircleButton from '@/components/circles/CircleButton';
import CabinPostHistory from '@/components/cabin/CabinPostHistory';
import { formatTimeAgo } from '@/lib/time';
import { MediaImage } from '@/components/MediaImage';
import {
  usePageProfile,
  usePageModules,
  usePageTheme,
  usePagePrivacy,
  useOwnVisitCount,
  useTopFriends,
  useWallNotes,
} from '@/hooks/useProfilePage';
import { MODULE_TYPES } from '@/hooks/usePageEditor';
import { useAllPhotos } from '@/hooks/usePhotos';
import { PROVIDER_LABELS, useNowPlaying } from '@/hooks/useListening';
import '@/styles/profile.css';

const moduleLabel = (type: string) =>
  MODULE_TYPES.find(t => t.key === type)?.label ?? type.replace(/[_-]/g, ' ');

const memberSince = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '';

/**
 * "My Page" — the profile, replacing the Cabin.
 *
 * The animated scene is gone; what stays is the part people actually used, a
 * page they can make their own. Modules come from cabin_widgets, which already
 * had the right shape.
 *
 * Top Friends and Wall Notes read their own tables; both sections hide
 * themselves when empty, which on a page nobody has written on yet is the
 * common case.
 */
const MyPage = () => {
  const { handle } = useParams<{ handle?: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = usePageProfile(handle);
  const isOwner = !!user && !!profile && user.id === profile.id;

  const { data: modules } = usePageModules(profile?.id);
  const { data: pageTheme } = usePageTheme(profile?.id);
  const { data: privacy } = usePagePrivacy(profile?.id);
  const { data: visits } = useOwnVisitCount(profile?.id, isOwner);
  const { data: topFriends } = useTopFriends(profile?.id);
  const { data: wallNotes } = useWallNotes(profile?.id);
  const { data: photos } = useAllPhotos(profile?.id);
  const { data: listening } = useNowPlaying(profile?.id);

  const [note, setNote] = useState('');
  const [posting, setPosting] = useState(false);

  if (isLoading) return <PineTreeLoading />;

  if (!profile) {
    return (
      <div className="page-shell">
        <StatePanel
          title="That branch snapped."
          action={<Link to="/explore" className="outline-button">Have a look around</Link>}
        >
          Nobody here goes by that name.
        </StatePanel>
      </div>
    );
  }

  const postNote = async () => {
    if (!user || !note.trim()) return;
    setPosting(true);
    const { error } = await supabase
      .from('wall_notes')
      .insert({ profile_id: profile.id, author_id: user.id, content: note.trim() });
    setPosting(false);

    if (error) {
      toast.error('Could not leave that note.');
      return;
    }
    setNote('');
    queryClient.invalidateQueries({ queryKey: ['wall-notes', profile.id] });
  };

  const about = profile.bio || profile.mantra;

  /**
   * The page owner's colours, applied to this wrapper rather than to <html>.
   *
   * Scoping matters: a visited page must not restyle the topbar, and walking
   * away from it has to undo the theme with no cleanup step to forget. Tokens
   * cascade into the panels below and stop at the wrapper's edge.
   */
  const themeStyle = {
    ...(pageTheme?.background ? { '--background': pageTheme.background } : {}),
    ...(pageTheme?.card ? { '--card': pageTheme.card } : {}),
    ...(pageTheme?.foreground ? { '--foreground': pageTheme.foreground } : {}),
  } as React.CSSProperties;

  return (
    <div className={`page-shell ${pageTheme?.full2006 ? 'page-2006' : ''}`} style={themeStyle}>
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
              {profile.city && privacy?.show_city !== false && <>Somewhere near {profile.city}.<br /></>}
              {profile.created_at && <>Here since {memberSince(profile.created_at)}.</>}
            </p>
            {isOwner && typeof visits === 'number' && (
              <p className="visit-count mt-3">
                {visits} view{visits === 1 ? '' : 's'} in the last 30 days — only you can see this.
              </p>
            )}
            <div className="mt-4 flex gap-2">
              {isOwner ? (
                <Link to="/me/edit" className="outline-button flex-1 text-center">Edit my page</Link>
              ) : (
                <CircleButton profileId={profile.id} profileName={profile.display_name} />
              )}
            </div>
            <div className="mt-2">
              <Link to={`/u/${profile.handle}`} className="outline-button w-full block text-center">
                🏡 {isOwner ? 'Step into your cabin' : 'Visit the cabin'}
              </Link>
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

          {photos.length > 0 && (
            <section className="panel module">
              <h2>Photos</h2>
              <div className="photo-strip">
                {photos.slice(0, 8).map(p => (
                  <MediaImage key={p.id} src={p.url} alt="" loading="lazy" style={{ width: 96, height: 96, objectFit: 'cover' }} />
                ))}
              </div>
              <Link to={`/${profile.handle}/photos`} className="album-link">
                See all {photos.length}
              </Link>
            </section>
          )}

          {/* What they have on now, when they are sharing it and RLS lets us
              see it. The pinned song below is the static, always-there one;
              this is the live moment, so it sits above. */}
          {listening?.is_sharing && (
            <section className="panel module">
              <h2>Listening to</h2>
              <div className="page-song">
                <div>
                  <b>{listening.track_title}</b>
                  <small>
                    {listening.artist} · {PROVIDER_LABELS[listening.provider]}
                    {listening.is_live ? ' · live' : ''}
                  </small>
                </div>
                {listening.track_url?.startsWith('https://') && (
                  <a
                    href={listening.track_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="album-link"
                  >
                    Open it
                  </a>
                )}
              </div>
            </section>
          )}

          {profile.pinned_song_title && (
            <section className="panel module">
              <h2>Now playing on this page</h2>
              <div className="page-song">
                <div>
                  <b>{profile.pinned_song_title}</b>
                  {profile.pinned_song_artist && <small>{profile.pinned_song_artist}</small>}
                </div>
                {/* No autoplay. The song is the owner's choice; pressing play is the
                    visitor's. */}
                {profile.pinned_song_preview_url?.startsWith('https://') && (
                  <audio controls preload="none" src={profile.pinned_song_preview_url}>
                    Your browser cannot play this.
                  </audio>
                )}
              </div>
            </section>
          )}

          {modules?.map(m => {
            const text = (m.widget_data as { text?: unknown } | null)?.text;
            if (typeof text !== 'string' || !text.trim()) return null;
            return (
              <section key={m.id} className="panel module">
                <h2>{moduleLabel(String(m.widget_type))}</h2>
                <p>{text}</p>
              </section>
            );
          })}
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

          <section className="profile-posts" aria-label="Posts">
            <h2>Posts</h2>
            <CabinPostHistory
              profileId={profile.id}
              isOwner={isOwner}
              isInCircle={true}
            />
          </section>
        </div>
      </div>
    </div>
  );
};

export default MyPage;
