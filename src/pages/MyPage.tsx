import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import PineTreeLoading from '@/components/PineTreeLoading';
import StatePanel from '@/components/StatePanel';
import CabinPostHistory from '@/components/cabin/CabinPostHistory';
import HandoffPostCard from '@/components/feed/HandoffPostCard';
import ProfileHeader from '@/components/profile/ProfileHeader';
import AtAGlance from '@/components/profile/AtAGlance';
import FriendsModule from '@/components/profile/FriendsModule';
import AlbumCorkboard from '@/components/profile/AlbumCorkboard';
import WallComposer from '@/components/profile/WallComposer';
import ProfileTabs, { type ProfileTab } from '@/components/profile/ProfileTabs';
import WallNotes from '@/components/profile/WallNotes';
import {
  usePageProfile,
  usePageModules,
  usePageTheme,
  usePagePrivacy,
  useOwnVisitCount,
  useTopFriends,
  useWallNotes,
} from '@/hooks/useProfilePage';
import { useFeaturedAlbums, type FeaturedFriendCount } from '@/hooks/useFeaturedPage';
import { useLikedPosts } from '@/hooks/useLikedPosts';
import { MODULE_TYPES } from '@/hooks/usePageEditor';
import { PROVIDER_LABELS, useNowPlaying } from '@/hooks/useListening';
import '@/styles/profile.css';

const moduleLabel = (type: string) =>
  MODULE_TYPES.find(t => t.key === type)?.label ?? type.replace(/[_-]/g, ' ');

/**
 * My Page — someone's corner of Under Pines.
 *
 * A scrapbook rather than a dashboard: a paper header, a few facts, the people
 * they pin up, a corkboard of albums, and their wall. Nothing was removed in
 * the redesign — the blurbs, the song, what they're listening to and the notes
 * people leave all still read the same rows, they just sit further down.
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
  const { data: listening } = useNowPlaying(profile?.id);
  const { featured } = useFeaturedAlbums(profile?.id, 4);

  const [tab, setTab] = useState<ProfileTab>('wall');
  const { data: liked } = useLikedPosts(profile?.id, tab === 'likes');

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

  const about = profile.bio || profile.mantra;
  const friendCount = (profile.featured_friends_count ?? 4) as FeaturedFriendCount;

  /**
   * The page owner's colours, applied to this wrapper rather than to <html>, so
   * a visited page cannot restyle the topbar and walking away needs no cleanup.
   */
  const themeStyle = {
    ...(pageTheme?.background ? { '--background': pageTheme.background } : {}),
    ...(pageTheme?.card ? { '--card': pageTheme.card } : {}),
    ...(pageTheme?.foreground ? { '--foreground': pageTheme.foreground } : {}),
  } as React.CSSProperties;

  const extras = (
    <>
      {about && (
        <section className="paper module">
          <h2>About me</h2>
          <p>{about}</p>
        </section>
      )}

      {profile.currently_value && (
        <section className="paper module">
          <h2>Currently {profile.currently_type ?? ''}</h2>
          <p>{profile.currently_value}</p>
        </section>
      )}

      {/* What they have on now, when they are sharing it and RLS lets us see
          it. The pinned song below is the static, always-there one. */}
      {listening?.is_sharing && (
        <section className="paper module">
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
        <section className="paper module">
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
          <section key={m.id} className="paper module">
            <h2>{moduleLabel(String(m.widget_type))}</h2>
            <p>{text}</p>
          </section>
        );
      })}
    </>
  );

  return (
    <div className={`page-shell profile-page ${pageTheme?.full2006 ? 'page-2006' : ''}`} style={themeStyle}>
      <ProfileHeader profile={profile} />

      <div className="profile-columns">
        <div className="profile-wall">
          <ProfileTabs active={tab} onChange={setTab} handle={profile.handle} />

          {tab === 'wall' && (
            <>
              {isOwner && (
                <WallComposer
                  profile={profile}
                  onPost={() => queryClient.invalidateQueries({ queryKey: ['page-posts', profile.id] })}
                />
              )}
              <CabinPostHistory profileId={profile.id} isOwner={isOwner} isInCircle />
              <WallNotes
                profileId={profile.id}
                profileName={profile.display_name}
                isOwner={isOwner}
                notes={wallNotes}
                canWrite={!!user}
              />
            </>
          )}

          {tab === 'journal' && (
            <CabinPostHistory
              profileId={profile.id}
              isOwner={isOwner}
              isInCircle
              postTypes={['story']}
              emptyMessage="No journal entries yet."
            />
          )}

          {tab === 'likes' && (
            <>
              {(!liked || liked.length === 0) && (
                <section className="paper module">
                  <p className="quiet">Nothing liked yet.</p>
                </section>
              )}
              {liked?.map(p => <HandoffPostCard key={p.id} post={p} />)}
            </>
          )}
        </div>

        <aside className="profile-memorabilia">
          <AtAGlance
            profile={profile}
            isOwner={isOwner}
            showCity={privacy?.show_city !== false}
            visits={visits}
          />
          <FriendsModule
            friends={topFriends ?? []}
            handle={profile.handle}
            isOwner={isOwner}
            ownerId={profile.id}
            count={friendCount}
          />
          <AlbumCorkboard albums={featured} handle={profile.handle} isOwner={isOwner} />
          {extras}
        </aside>
      </div>
    </div>
  );
};

export default MyPage;
