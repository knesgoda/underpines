import { Link } from 'react-router-dom';
import UserAvatar from '@/components/UserAvatar';
import { FEATURED_FRIEND_COUNTS, useSaveFeaturedFriendsCount, type FeaturedFriendCount } from '@/hooks/useFeaturedPage';
import type { TopFriend } from '@/hooks/useProfilePage';
import { editorReturnState } from '@/lib/editorReturn';

/** "Megan Rivers" reads as "Megan R." under an avatar this small. */
export const shortName = (displayName: string) => {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length < 2) return displayName;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

/**
 * Featured friends — the old-school wall of people, deliberately.
 *
 * The owner picks who and how many (4, 8 or 12) — the count saves the moment
 * they press it, since there is nothing else to confirm. Visitors see the same
 * grid without the selector. Who appears is edited in Edit my page, which is
 * where reordering already lives.
 */
const FriendsModule = ({
  friends,
  handle,
  isOwner,
  ownerId,
  count,
}: {
  friends: TopFriend[];
  handle: string;
  isOwner: boolean;
  ownerId: string;
  count: FeaturedFriendCount;
}) => {
  const saveCount = useSaveFeaturedFriendsCount(ownerId);
  const shown = friends.slice(0, count);

  return (
    <section className="paper module friends-module" aria-labelledby="friends-heading">
      <div className="module-head">
        <h2 id="friends-heading">Friends</h2>
        {isOwner && (
          <div className="count-switch" role="group" aria-label="How many friends to feature">
            {FEATURED_FRIEND_COUNTS.map(n => (
              <button
                key={n}
                type="button"
                className={n === count ? 'is-active' : undefined}
                aria-pressed={n === count}
                onClick={() => saveCount.mutate(n)}
              >
                {n === 4 ? 'Top 4' : n}
              </button>
            ))}
          </div>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="quiet">
          {isOwner ? (
            <>Nobody pinned up yet. <Link to="/me/edit" state={editorReturnState()} className="album-link">Choose your friends →</Link></>
          ) : (
            <>No friends featured here yet.</>
          )}
        </p>
      ) : (
        <ul className={`friend-grid friend-grid-${count}`}>
          {shown.map(f => (
            <li key={f.friend_id}>
              <Link to={`/${f.profile.handle}`} className="friend-chip">
                <UserAvatar
                  avatarUrl={f.profile.avatar_url}
                  defaultAvatarKey={f.profile.default_avatar_key}
                  displayName={f.profile.display_name}
                  size={62}
                />
                <span>{shortName(f.profile.display_name)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link to={isOwner ? '/friends' : `/${handle}`} className="album-link">
        See all friends →
      </Link>
    </section>
  );
};

export default FriendsModule;
