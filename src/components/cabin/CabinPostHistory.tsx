import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { PostWithAuthor } from '@/components/feed/PostCard';
import HandoffPostCard from '@/components/feed/HandoffPostCard';
import LightboxViewer from '@/components/feed/LightboxViewer';
import { MediaImage } from '@/components/MediaImage';

interface Props {
  profileId: string;
  isOwner: boolean;
  isInCircle: boolean;
  /** Narrow the history to certain kinds — the Journal tab asks for stories. */
  postTypes?: string[];
  emptyMessage?: string;
}

/**
 * The Posts section of My Page: the owner's history in the same card
 * language as the feed. Drafts show only to the owner; visitors outside the
 * circle get sparks and bulletins in full, stories as a title, embers behind
 * a blur.
 */
const CabinPostHistory = ({ profileId, isOwner, isInCircle, postTypes, emptyMessage }: Props) => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<{ open: boolean; images: string[]; index: number }>({ open: false, images: [], index: 0 });

  const typeKey = postTypes?.join(',') ?? '';

  useEffect(() => {
    const load = async () => {
      let query = supabase
        .from('posts')
        .select('*')
        .eq('author_id', profileId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!isOwner) {
        query = query.eq('is_published', true);
      }

      if (typeKey) {
        query = query.in('post_type', typeKey.split(','));
      }

      const { data } = await query;
      if (!data) { setLoading(false); return; }


      const { data: prof } = await supabase
        .from('profiles')
        .select('display_name, handle, accent_color, cabin_mood, avatar_url, default_avatar_key')
        .eq('id', profileId)
        .maybeSingle();

      const postIds = data.map(p => p.id);
      const { data: media } = await supabase
        .from('post_media')
        .select('*')
        .in('post_id', postIds);

      const { data: reactions } = await supabase
        .from('reactions')
        .select('post_id, reaction_type, user_id')
        .in('post_id', postIds);

      const enriched: PostWithAuthor[] = data.map(p => ({
        ...p,
        created_at: p.created_at || '',
        author: prof ?? undefined,
        post_media: media?.filter(m => m.post_id === p.id) || [],
        reactions: reactions?.filter(r => r.post_id === p.id) || [],
      }));

      setPosts(enriched);
      setLoading(false);
    };
    load();
  }, [profileId, isOwner, typeKey]);

  // Visibility gating for visitors outside the circle. Sparks and bulletins
  // are written for a wide audience; stories and embers only tease.
  const renderGatedPost = (post: PostWithAuthor) => {
    const card = (
      <HandoffPostCard
        key={post.id}
        post={post}
        draft={isOwner && !post.is_published}
        onOpen={() => navigate(`/post/${post.id}`)}
        onImageClick={(images, index) => setLightbox({ open: true, images, index })}
      />
    );

    if (isOwner || isInCircle) return card;
    if (post.post_type === 'spark' || post.post_type === 'bulletin') return card;

    return (
      <article key={post.id} className="panel post">
        {post.post_type === 'story' && post.title && (
          <div className="post-copy"><h2>{post.title}</h2></div>
        )}
        {post.post_type === 'ember' && post.post_media?.[0] && (
          <div className="post-image">
            <MediaImage
              src={post.post_media[0].url}
              alt=""
              style={{ width: '100%', height: 180, objectFit: 'cover', filter: 'blur(16px)' }}
            />
          </div>
        )}
        <div className="post-stats">
          <span>Add them to your Circle to {post.post_type === 'story' ? 'read this' : 'see this post'}.</span>
        </div>
      </article>
    );
  };

  if (loading) return null;

  if (posts.length === 0) {
    const empty = emptyMessage ?? 'Nothing posted yet.';
    return (
      <section className="paper module">
        {isOwner ? (
          <p className="quiet">
            {empty} <Link to="/" className="album-link">Write something →</Link>
          </p>
        ) : (
          <p className="quiet">{empty}</p>
        )}
      </section>
    );

  }

  return (
    <>
      {posts.map(renderGatedPost)}
      <LightboxViewer open={lightbox.open} images={lightbox.images} startIndex={lightbox.index} onClose={() => setLightbox(l => ({ ...l, open: false }))} />
    </>
  );
};

export default CabinPostHistory;
