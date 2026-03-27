import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';
import PostCard, { PostWithAuthor } from '@/components/feed/PostCard';
import ReplyThread from '@/components/feed/ReplyThread';
import ReactionBar from '@/components/feed/ReactionBar';
import LightboxViewer from '@/components/feed/LightboxViewer';
import PineTreeLoading from '@/components/PineTreeLoading';
import UserAvatar from '@/components/UserAvatar';
import { formatTimeAgo } from '@/lib/time';
import { extractFirstUrl, stripFirstUrl } from '@/lib/linkify';
import LinkPreviewCard from '@/components/feed/LinkPreviewCard';
import DOMPurify from 'dompurify';

const REACTION_ICONS: Record<string, string> = {
  warmth: '❤️', laughed: '😂', heavy: '😢', noted: '🤔',
  relatable: '🫠', eyeroll: '🙄', grounded: '🌲', delight: '✨',
  moonstruck: '🌕',
};

const stripHtml = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

const PostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostWithAuthor | null>(null);
  const [reactions, setReactions] = useState<{ reaction_type: string; user_id: string }[]>([]);
  const [circleIds, setCircleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (!id || !user) return;

    const load = async () => {
      // Fetch post
      const { data: postData } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!postData) {
        setLoading(false);
        return;
      }

      // Fetch author profile
      const { data: authorProfile } = await supabase
        .from('profiles')
        .select('display_name, handle, accent_color, cabin_mood, avatar_url, default_avatar_key')
        .eq('id', postData.author_id)
        .maybeSingle();

      // Fetch reactions
      const { data: rxns } = await supabase
        .from('reactions')
        .select('reaction_type, user_id')
        .eq('post_id', id);

      // Fetch media
      const { data: media } = await supabase
        .from('post_media')
        .select('url, media_type, position')
        .eq('post_id', id)
        .order('position');

      // Fetch quoted post if needed
      let quotedPost: PostWithAuthor | null = null;
      if (postData.is_quote_post && postData.quoted_post_id) {
        const { data: qp } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postData.quoted_post_id)
          .maybeSingle();
        if (qp) {
          const { data: qAuthor } = await supabase
            .from('profiles')
            .select('display_name, handle, accent_color, cabin_mood, avatar_url, default_avatar_key')
            .eq('id', qp.author_id)
            .maybeSingle();
          quotedPost = { ...qp, author: qAuthor || undefined } as PostWithAuthor;
        }
      }

      // Build circle IDs for quote visibility
      const { data: circles } = await supabase
        .from('circles')
        .select('requester_id, requestee_id')
        .or(`requester_id.eq.${user.id},requestee_id.eq.${user.id}`)
        .eq('status', 'accepted');

      const cIds = (circles || []).map(c =>
        c.requester_id === user.id ? c.requestee_id : c.requester_id
      );

      setCircleIds(cIds);
      setReactions(rxns || []);
      setPost({
        ...postData,
        author: authorProfile || undefined,
        reactions: rxns || [],
        post_media: media || [],
        quoted_post: quotedPost,
      } as PostWithAuthor);
      setLoading(false);
    };

    load();
  }, [id, user]);

  const fetchReactions = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('reactions')
      .select('reaction_type, user_id')
      .eq('post_id', id);
    if (data) setReactions(data);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <PineTreeLoading />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-4xl mb-4">🌲</p>
        <h2 className="font-display text-xl text-foreground mb-2">Post not found</h2>
        <p className="font-body text-sm text-muted-foreground mb-6">
          This post may have been removed or isn't visible to you.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="font-body text-sm text-primary hover:underline"
        >
          ← Go back
        </button>
      </div>
    );
  }

  const isOwner = user?.id === post.author_id;
  const accent = post.author?.accent_color || 'hsl(var(--primary))';

  // For story posts, redirect to the author's cabin
  if (post.post_type === 'story') {
    return (
      <div className="max-w-2xl mx-auto px-6 pt-4 pb-24">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 font-body text-sm"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <article
          className="rounded-xl bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden"
          style={{ borderLeft: `3px solid ${accent}` }}
        >
          <div className="p-6">
            {/* Author */}
            <div className="flex items-center gap-2.5 mb-6">
              <button onClick={() => navigate(`/${post.author?.handle}`)}>
                <UserAvatar
                  avatarUrl={post.author?.avatar_url}
                  defaultAvatarKey={post.author?.default_avatar_key}
                  displayName={post.author?.display_name}
                  size={36}
                />
              </button>
              <div>
                <button
                  onClick={() => navigate(`/${post.author?.handle}`)}
                  className="font-body text-sm font-medium text-foreground hover:opacity-80"
                >
                  {post.author?.display_name}
                </button>
                <p className="font-body text-xs text-muted-foreground">
                  {formatTimeAgo(post.created_at)}
                </p>
              </div>
            </div>

            {/* Title */}
            {post.title && (
              <h1 className="font-display text-2xl font-semibold text-foreground mb-4">
                {post.title}
              </h1>
            )}

            {/* Full story content */}
            <div
              className="font-body text-sm text-foreground/85 leading-relaxed prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content || '') }}
            />

            {/* Reaction summary */}
            <ReactionSummary reactions={reactions} isOwner={isOwner} />

            {/* Actions */}
            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border/50">
              <ReactionBar postId={post.id} reactions={reactions} onReactionChange={fetchReactions} />
            </div>
          </div>
        </article>

        {/* Full reply thread */}
        <div className="mt-4 rounded-xl bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
          <ReplyThread postId={post.id} autoExpand />
        </div>
      </div>
    );
  }

  // Spark / Ember detail
  return (
    <div className="max-w-2xl mx-auto px-6 pt-4 pb-24">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 font-body text-sm"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <article
        className="rounded-xl bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden"
        style={{ borderLeft: `3px solid ${accent}` }}
      >
        <div className="p-5">
          {/* Author header */}
          <div className="flex items-center gap-2.5 mb-4">
            <button onClick={() => navigate(`/${post.author?.handle}`)}>
              <UserAvatar
                avatarUrl={post.author?.avatar_url}
                defaultAvatarKey={post.author?.default_avatar_key}
                displayName={post.author?.display_name}
                size={36}
              />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => navigate(`/${post.author?.handle}`)}
                  className="font-body text-sm font-medium text-foreground hover:opacity-80"
                >
                  {post.author?.display_name}
                </button>
              </div>
              <p className="font-body text-xs text-muted-foreground">
                @{post.author?.handle} · {formatTimeAgo(post.created_at)}
              </p>
            </div>
          </div>

          {/* Full content */}
          {post.content && (() => {
            const url = extractFirstUrl(post.content);
            const text = url ? stripFirstUrl(post.content) : post.content;
            return (
              <>
                {text && <p className="font-body text-sm text-foreground whitespace-pre-wrap leading-relaxed">{text}</p>}
                {url && <LinkPreviewCard url={url} />}
              </>
            );
          })()}

          {/* Spark image */}
          {post.post_type === 'spark' && post.image_url && (
            <button
              onClick={() => { setLightboxImages([post.image_url!]); setLightboxIndex(0); }}
              className="mt-3 rounded-lg overflow-hidden block w-full text-left cursor-zoom-in"
            >
              <img
                src={post.image_url}
                alt=""
                className="block w-full h-auto rounded-lg bg-muted"
                style={{ maxHeight: '600px', objectFit: 'contain' }}
              />
            </button>
          )}

          {/* Ember media */}
          {post.post_type === 'ember' && post.post_media && post.post_media.length > 0 && (() => {
            const sorted = [...post.post_media].sort((a, b) => a.position - b.position);
            const imageUrls = sorted.filter(m => m.media_type !== 'video').map(m => m.url);
            return (
              <div className={`mt-3 rounded-lg overflow-hidden ${
                sorted.length === 1 ? '' :
                sorted.length === 2 ? 'grid grid-cols-2 gap-1' :
                'grid grid-cols-3 gap-1'
              }`}>
                {sorted.map((media, i) => (
                  <div
                    key={i}
                    className={`relative ${i === 0 && sorted.length >= 3 ? 'col-span-2 row-span-2' : ''}`}
                  >
                    {media.media_type === 'video' ? (
                      <video src={media.url} className="w-full h-auto rounded-lg" style={{ maxHeight: '600px' }} controls muted />
                    ) : (
                      <button
                        onClick={() => { setLightboxImages(imageUrls); setLightboxIndex(imageUrls.indexOf(media.url)); }}
                        className="block w-full cursor-zoom-in"
                      >
                        <img
                          src={media.url}
                          alt=""
                          className="block w-full h-auto rounded-lg bg-muted"
                          style={{ maxHeight: sorted.length === 1 ? '600px' : '300px', objectFit: sorted.length === 1 ? 'contain' : 'cover' }}
                        />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Quoted post */}
          {post.is_quote_post && post.quoted_post && (() => {
            const canSeeQuote = post.quoted_post.author_id === user?.id || circleIds.includes(post.quoted_post.author_id);
            return canSeeQuote ? (
              <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-body text-xs font-medium text-foreground">
                    {post.quoted_post.author?.display_name}
                  </span>
                  <span className="text-xs font-body text-muted-foreground">
                    · {formatTimeAgo(post.quoted_post.created_at)}
                  </span>
                </div>
                <p className="font-body text-xs text-foreground/70 line-clamp-3">
                  {post.quoted_post.post_type === 'story' ? post.quoted_post.title : post.quoted_post.content}
                </p>
              </div>
            ) : (
              <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 opacity-50">
                <p className="font-body text-xs text-muted-foreground italic">A post from someone outside your Circles.</p>
              </div>
            );
          })()}

          {/* Reaction summary */}
          <ReactionSummary reactions={reactions} isOwner={isOwner} />

          {/* Actions */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/50">
            <ReactionBar postId={post.id} reactions={reactions} onReactionChange={fetchReactions} />
          </div>
        </div>
      </article>

      {/* Full reply thread — auto-expanded */}
      <div className="mt-4 rounded-xl bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
        <ReplyThread postId={post.id} autoExpand />
      </div>

      {/* Lightbox */}
      {lightboxImages.length > 0 && (
        <LightboxViewer
          open={true}
          images={lightboxImages}
          startIndex={lightboxIndex}
          onClose={() => setLightboxImages([])}
        />
      )}
    </div>
  );
};

const ReactionSummary = ({ reactions, isOwner }: {
  reactions: { reaction_type: string; user_id: string }[];
  isOwner: boolean;
}) => {
  if (reactions.length === 0) return null;

  if (isOwner) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        {reactions.map((r, i) => {
          const emoji = REACTION_ICONS[r.reaction_type] || '💚';
          return (
            <span key={`${r.user_id}-${r.reaction_type}-${i}`} className="text-sm">{emoji}</span>
          );
        })}
      </div>
    );
  }

  const uniqueEmojis = [...new Set(reactions.map(r => r.reaction_type))]
    .map(type => REACTION_ICONS[type])
    .filter(Boolean);

  return (
    <div className="flex items-center gap-1 mt-3">
      {uniqueEmojis.map((emoji, i) => (
        <span key={i} className="text-sm">{emoji}</span>
      ))}
    </div>
  );
};

export default PostDetail;
