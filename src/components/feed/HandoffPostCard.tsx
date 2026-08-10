import { Link } from 'react-router-dom';
import UserAvatar from '@/components/UserAvatar';
import { formatTimeAgo } from '@/lib/time';
import { MediaImage } from '@/components/MediaImage';
import type { PostWithAuthor } from './PostCard';

/**
 * A post in the handoff's card language.
 *
 * Post types keep their stored values ('spark' | 'story' | 'ember') — nothing
 * migrates — but they are labelled the way the era named them: a Status, a
 * Blog entry, Photos. "Ember" meant four unrelated things across the product,
 * and this is one of the three that stops.
 */
const TYPE_LABEL: Record<string, string> = {
  spark: 'Status',
  story: 'Blog',
  ember: 'Photos',
  bulletin: 'Bulletin',
};

export const HandoffPostCard = ({
  post,
  draft = false,
  onOpen,
  onImageClick,
}: {
  post: PostWithAuthor;
  draft?: boolean;
  onOpen?: () => void;
  onImageClick?: (images: string[], index: number) => void;
}) => {
  const media = (post.post_media || []).slice().sort((a, b) => a.position - b.position);
  const images = media.filter(m => m.media_type !== 'video').map(m => m.url);
  // Sparks and bulletins carry their picture on the row itself, not post_media.
  if (images.length === 0 && post.image_url) images.push(post.image_url);
  const reactionCount = post.reactions?.length ?? 0;
  const label = TYPE_LABEL[post.post_type];

  return (
    <article className="panel post">
      <header className="post-header">
        <UserAvatar
          avatarUrl={post.author?.avatar_url ?? null}
          defaultAvatarKey={post.author?.default_avatar_key ?? null}
          displayName={post.author?.display_name ?? ''}
          size={38}
        />
        <div>
          <Link to={`/${post.author?.handle ?? ''}`} className="person-link">
            {post.author?.display_name ?? 'Someone'}
          </Link>
          <p>
            @{post.author?.handle ?? '—'} · {formatTimeAgo(post.created_at)}
            {label && post.post_type !== 'spark' && post.post_type !== 'bulletin' ? ` · ${label}` : ''}
            {draft ? ' · Draft — only you see this' : ''}
          </p>
        </div>
        <button type="button" className="more" onClick={onOpen} aria-label="Open post">
          •••
        </button>
      </header>

      {post.post_type === 'bulletin' && <span className="bulletin-label">Bulletin</span>}

      {(post.title || post.content) && (
        <div className="post-copy">
          {post.title && <h2>{post.title}</h2>}
          {post.content}
        </div>
      )}

      {images.length > 0 && (
        <div className="post-image">
          <button
            type="button"
            onClick={() => onImageClick?.(images, 0)}
            className="block w-full"
            aria-label="View photo"
          >
            <MediaImage src={images[0]} alt="" loading="lazy" style={{ width: '100%', minHeight: 160, objectFit: 'cover' }} />
          </button>
          {images.length > 1 && <span>{images.length} PHOTOS</span>}
        </div>
      )}

      <div className="post-stats">
        <span>{reactionCount === 0 ? 'No reactions yet' : `${reactionCount} reaction${reactionCount === 1 ? '' : 's'}`}</span>
        <span>{label ?? ''}</span>
      </div>

      <div className="post-actions">
        <button type="button" onClick={onOpen}>Reply</button>
        <button type="button" onClick={onOpen}>React</button>
        <button type="button" onClick={onOpen}>Share</button>
      </div>
    </article>
  );
};

export default HandoffPostCard;
