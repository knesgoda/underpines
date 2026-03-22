import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowUpRight } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';

interface CrossPostCardProps {
  postId: string;
  note?: string | null;
  isMine: boolean;
}

interface PostData {
  id: string;
  content: string | null;
  author_id: string;
  post_type: string;
}

interface AuthorData {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  default_avatar_key: string | null;
}

const CrossPostCard = ({ postId, note, isMine }: CrossPostCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostData | null>(null);
  const [author, setAuthor] = useState<AuthorData | null>(null);
  const [inCircle, setInCircle] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !postId) return;

    const load = async () => {
      // Fetch the post
      const { data: postData } = await supabase
        .from('posts')
        .select('id, content, author_id, post_type')
        .eq('id', postId)
        .maybeSingle();

      if (!postData) {
        setLoading(false);
        return;
      }

      setPost(postData);

      // Check if viewer is the author or in their circles
      const isAuthor = postData.author_id === user.id;

      if (isAuthor) {
        setInCircle(true);
      } else {
        const { data: circleData } = await supabase
          .from('circles')
          .select('id')
          .or(
            `and(requester_id.eq.${user.id},requestee_id.eq.${postData.author_id}),and(requester_id.eq.${postData.author_id},requestee_id.eq.${user.id})`
          )
          .eq('status', 'accepted')
          .limit(1);

        setInCircle(!!(circleData && circleData.length > 0));
      }

      // Fetch author profile
      const { data: authorData } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url, default_avatar_key')
        .eq('id', postData.author_id)
        .maybeSingle();

      if (authorData) setAuthor(authorData);
      setLoading(false);
    };

    load();
  }, [postId, user]);

  const handleTap = () => {
    if (post && inCircle) {
      navigate(`/post/${post.id}`);
    }
  };

  if (loading) {
    return (
      <div className={`rounded-xl border border-border bg-muted/50 px-3 py-3 ${isMine ? 'rounded-br-md' : 'rounded-bl-md'}`}>
        <div className="h-3 w-24 bg-muted rounded animate-pulse mb-2" />
        <div className="h-3 w-40 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  // Post was deleted or inaccessible
  if (!post) {
    return (
      <div className={`rounded-xl border border-border bg-muted/40 px-3 py-3 ${isMine ? 'rounded-br-md' : 'rounded-bl-md'}`}>
        <p className="font-body text-xs text-muted-foreground italic">This post is no longer available.</p>
      </div>
    );
  }

  // Not in circles — redacted view
  if (!inCircle) {
    return (
      <div className={`rounded-xl border border-border bg-card px-3 py-3 ${isMine ? 'rounded-br-md' : 'rounded-bl-md'}`}>
        <p className="font-body text-xs text-muted-foreground">
          A post from someone outside your Circles
        </p>
        {note && <p className="font-body text-sm text-foreground mt-2">{note}</p>}
      </div>
    );
  }

  // Truncate content
  const truncated = post.content
    ? post.content.length > 140
      ? post.content.slice(0, 140).trimEnd() + '…'
      : post.content
    : null;

  return (
    <button
      onClick={handleTap}
      className={`w-full text-left rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors overflow-hidden ${isMine ? 'rounded-br-md' : 'rounded-bl-md'}`}
    >
      <div className="px-3 pt-3 pb-2">
        {/* Author row */}
        {author && (
          <div className="flex items-center gap-2 mb-2">
            <UserAvatar
              avatarUrl={author.avatar_url}
              defaultAvatarKey={author.default_avatar_key}
              displayName={author.display_name}
              size="xs"
            />
            <span className="font-body text-xs font-medium text-foreground truncate">
              {author.display_name}
            </span>
            <span className="font-body text-[10px] text-muted-foreground truncate">
              @{author.handle}
            </span>
          </div>
        )}

        {/* Post content preview */}
        {truncated && (
          <p className="font-body text-sm text-foreground/80 leading-snug line-clamp-2">
            {truncated}
          </p>
        )}

        {/* Note from sharer */}
        {note && (
          <p className="font-body text-sm text-foreground mt-2 pt-2 border-t border-border/50">
            {note}
          </p>
        )}
      </div>

      {/* Read post link */}
      <div className="px-3 py-2 border-t border-border/50 flex items-center gap-1">
        <span className="font-body text-[11px] text-primary">Read post</span>
        <ArrowUpRight size={10} className="text-primary" />
      </div>
    </button>
  );
};

export default CrossPostCard;
