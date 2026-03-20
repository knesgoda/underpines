import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import PostCard, { PostWithAuthor } from '@/components/feed/PostCard';

interface Props {
  profileId: string;
  isOwner: boolean;
  isInCircle: boolean;
  atmosphere: any;
}

const CabinPostHistory = ({ profileId, isOwner, isInCircle, atmosphere }: Props) => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);

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

      const { data } = await query;
      if (!data) { setLoading(false); return; }

      // Get author profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('display_name, handle, accent_color, cabin_mood')
        .eq('id', profileId)
        .maybeSingle();

      // Get media
      const postIds = data.map(p => p.id);
      const { data: media } = await supabase
        .from('post_media')
        .select('*')
        .in('post_id', postIds);

      // Get reactions
      const { data: reactions } = await supabase
        .from('reactions')
        .select('post_id, reaction_type, user_id')
        .in('post_id', postIds);

      const enriched: PostWithAuthor[] = data.map(p => ({
        ...p,
        created_at: p.created_at || '',
        author: prof ? { display_name: prof.display_name, handle: prof.handle, accent_color: prof.accent_color, cabin_mood: prof.cabin_mood } : undefined,
        post_media: media?.filter(m => m.post_id === p.id) || [],
        reactions: reactions?.filter(r => r.post_id === p.id) || [],
      }));

      setPosts(enriched);
      setLoading(false);
    };
    load();
  }, [profileId, isOwner]);

  const handleRemove = (id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  // Visibility gating for non-circle visitors
  const renderGatedPost = (post: PostWithAuthor) => {
    if (isOwner || isInCircle) return <PostCard key={post.id} post={post} onRemove={handleRemove} />;

    // Non-circle: sparks visible, stories title-only, embers blurred
    if (post.post_type === 'spark') {
      return <PostCard key={post.id} post={post} />;
    }

    return (
      <div key={post.id} className="rounded-xl bg-card shadow-sm border border-border p-5 mb-3">
        {post.post_type === 'story' && post.title && (
          <h3 className="font-display text-lg text-foreground mb-2">{post.title}</h3>
        )}
        {post.post_type === 'ember' && post.post_media?.[0] && (
          <div className="rounded-lg overflow-hidden mb-2 relative">
            <img src={post.post_media[0].url} alt="" className="w-full max-h-[200px] object-cover blur-lg" />
          </div>
        )}
        <p className="font-body text-xs text-muted-foreground">
          Add to your Circle to {post.post_type === 'story' ? 'read in their Cabin' : 'see this post'}.
        </p>
      </div>
    );
  };

  if (loading) return null;

  if (posts.length === 0) {
    return (
      <div
        className="rounded-2xl p-8 text-center shadow-soft transition-colors duration-700"
        style={{ backgroundColor: atmosphere.cardBg, borderColor: atmosphere.border, borderWidth: 1 }}
      >
        <p className="text-2xl mb-2">🌿</p>
        {isOwner ? (
          <>
            <p className="font-body text-sm" style={{ color: atmosphere.text, opacity: 0.6 }}>Your Cabin is quiet.</p>
            <p className="font-body text-xs mt-1" style={{ color: atmosphere.text, opacity: 0.4 }}>
              Share your first thought, story, or photo.
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-3 font-body text-xs text-primary hover:underline"
            >
              Write something →
            </button>
          </>
        ) : (
          <p className="font-body text-sm" style={{ color: atmosphere.text, opacity: 0.4 }}>Nothing posted yet.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map(post => {
        const isDraft = !post.is_published;
        return (
          <div key={post.id} className="relative">
            {isDraft && isOwner && (
              <div className="absolute top-3 left-6 z-10 px-2 py-0.5 rounded-md bg-muted font-body text-[10px] text-muted-foreground">
                Draft
              </div>
            )}
            {renderGatedPost(post)}
          </div>
        );
      })}
    </div>
  );
};

export default CabinPostHistory;
