import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserAvatar from '@/components/UserAvatar';
import SparkComposer from '@/components/feed/SparkComposer';
import EmberComposer from '@/components/feed/EmberComposer';
import { useSeedlingStatus } from '@/components/feed/SeedlingBanner';
import type { PostWithAuthor } from '@/components/feed/PostCard';

type Kind = 'spark' | 'ember' | 'bulletin' | null;

/**
 * The share line at the top of the wall.
 *
 * It opens the same composers the feed uses — nothing here is a second posting
 * path, so photos, bulletins and the settling-in lock all behave identically.
 * Long-form still hands off to the story composer at /new/story.
 */
const WallComposer = ({
  profile,
  onPost,
}: {
  profile: { display_name: string; avatar_url?: string | null; default_avatar_key?: string | null };
  onPost: () => void;
}) => {
  const navigate = useNavigate();
  const { isSeedling, daysLeft } = useSeedlingStatus();
  const [kind, setKind] = useState<Kind>(null);

  if (isSeedling) {
    return (
      <section className="paper module">
        <p className="quiet">
          You’re still settling in. Read, look around, set up your page — posting unlocks in {daysLeft}{' '}
          {daysLeft === 1 ? 'day' : 'days'}.
        </p>
      </section>
    );
  }

  const done = (_post: PostWithAuthor) => {
    setKind(null);
    onPost();
  };

  return (
    <section className="paper wall-composer" aria-label="Share something">
      {kind ? (
        <div className="wall-composer-open">
          {kind === 'ember' ? (
            <EmberComposer onPost={done} onCancel={() => setKind(null)} />
          ) : (
            <SparkComposer
              postType={kind === 'bulletin' ? 'bulletin' : 'spark'}
              onPost={done}
              onCancel={() => setKind(null)}
            />
          )}
        </div>
      ) : (
        <>
          <button type="button" className="wall-composer-line" onClick={() => setKind('spark')}>
            <UserAvatar
              avatarUrl={profile.avatar_url}
              defaultAvatarKey={profile.default_avatar_key}
              displayName={profile.display_name}
              size={40}
            />
            <span>Share something with your Under Pines…</span>
          </button>
          <div className="wall-composer-kinds">
            <button type="button" onClick={() => setKind('ember')}>Photos</button>
            <button type="button" onClick={() => navigate('/new/story')}>Something longer</button>
            <button type="button" onClick={() => setKind('bulletin')}>A bulletin</button>
          </div>
        </>
      )}
    </section>
  );
};

export default WallComposer;
