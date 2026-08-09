import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useFeedPosts } from '@/hooks/useFeedPosts';
import { useViewerProfile } from '@/hooks/queries';
import { LeftRail, RightRail } from '@/components/feed/FeedRails';
import HandoffPostCard from '@/components/feed/HandoffPostCard';
import LightboxViewer from '@/components/feed/LightboxViewer';
import PineTreeLoading from '@/components/PineTreeLoading';
import UserAvatar from '@/components/UserAvatar';
import '@/styles/feed.css';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const today = () =>
  new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();

/**
 * The chronological feed, in the handoff's three-column layout.
 *
 * Data comes from useFeedPosts (React Query) rather than the tangle of
 * useEffects this page used to carry; the composer opens the existing sheet
 * rather than duplicating it.
 */
const Feed = () => {
  const { user, loading: authLoading } = useAuth();
  const { setComposerOpen } = useNavigation();
  const queryClient = useQueryClient();
  const { data: profile } = useViewerProfile();
  const { data, isLoading } = useFeedPosts();
  const [lightbox, setLightbox] = useState<{ open: boolean; images: string[]; index: number }>({
    open: false,
    images: [],
    index: 0,
  });

  if (authLoading) return <PineTreeLoading />;
  if (!user) return <Navigate to="/" replace />;

  const posts = data?.posts ?? [];

  return (
    <div className="page-shell">
      <div className="feed-layout">
        <LeftRail />

        <div className="feed-column">
          <section className="panel welcome">
            <div>
              <span className="eyebrow">{today()}</span>
              <h1>{greeting()}{profile?.display_name ? `, ${profile.display_name.split(' ')[0]}` : ''}.</h1>
              <p>Everything below is in the order it was written.</p>
            </div>
            <span className="sun-disc" aria-hidden="true" />
          </section>

          <section className="panel composer" aria-label="Write a post">
            <div className="composer-row">
              <UserAvatar
                avatarUrl={profile?.avatar_url ?? null}
                defaultAvatarKey={profile?.default_avatar_key ?? null}
                displayName={profile?.display_name ?? ''}
                size={38}
              />
              <input
                readOnly
                onFocus={() => setComposerOpen(true)}
                onClick={() => setComposerOpen(true)}
                placeholder="What's happening under your pines?"
                aria-label="Write a post"
              />
            </div>
            <div className="composer-actions">
              <button type="button" onClick={() => setComposerOpen(true)}>
                <span aria-hidden="true">▧</span> Photos
              </button>
              <button type="button" onClick={() => setComposerOpen(true)}>
                <span aria-hidden="true">✎</span> Blog
              </button>
              <button
                type="button"
                className="post-button"
                onClick={() => setComposerOpen(true)}
              >
                Post
              </button>
            </div>
          </section>

          {isLoading && <PineTreeLoading />}

          {!isLoading && posts.length === 0 && (
            <section className="panel p-10 text-center">
              <p className="font-body text-sm text-foreground">It's quiet in here.</p>
              <p className="mt-1 font-body text-sm text-muted-foreground">
                Which is rather the point — but a few friends would help.
              </p>
            </section>
          )}

          {posts.map(post => (
            <HandoffPostCard
              key={post.id}
              post={post}
              onOpen={() => queryClient.invalidateQueries({ queryKey: ['feed', user.id] })}
              onImageClick={(images, index) => setLightbox({ open: true, images, index })}
            />
          ))}

          {!isLoading && posts.length > 0 && (
            <p className="py-8 text-center font-body text-sm text-muted-foreground">
              You're all caught up. Everything since your last visit is above this point.
            </p>
          )}
        </div>

        <RightRail inviteUrl={null} />
      </div>

      <LightboxViewer
        open={lightbox.open}
        images={lightbox.images}
        startIndex={lightbox.index}
        onClose={() => setLightbox(l => ({ ...l, open: false }))}
      />
    </div>
  );
};

export default Feed;
