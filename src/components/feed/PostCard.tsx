import { useState, useRef, useEffect } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, Copy, Trash2, Quote, Flame, Flag } from 'lucide-react';
import { formatTimeAgo } from '@/lib/time';
import ReactionBar from './ReactionBar';
import ReplyThread from './ReplyThread';
import QuoteComposer from './QuoteComposer';
import ShareToCampfire from './ShareToCampfire';
import ReportSheet from '@/components/reporting/ReportSheet';
import { useBlockMute } from '@/hooks/useBlockMute';
import { toast } from 'sonner';

export interface PostWithAuthor {
  id: string;
  author_id: string;
  post_type: string;
  content: string | null;
  title: string | null;
  image_url?: string | null;
  is_published: boolean | null;
  is_quote_post: boolean | null;
  quoted_post_id: string | null;
  created_at: string;
  author?: { display_name: string; handle: string; accent_color: string | null; cabin_mood: string | null };
  reactions?: { reaction_type: string; user_id: string }[];
  post_media?: { url: string; media_type: string; position: number }[];
  quoted_post?: PostWithAuthor | null;
  _optimistic?: boolean;
  _failed?: boolean;
}

interface PostCardProps {
  post: PostWithAuthor;
  circleIds?: string[];
  onRemove?: (id: string) => void;
  onRefresh?: () => void;
  onImageClick?: (images: string[], index: number) => void;
}

const PostCard = ({ post, circleIds = [], onRemove, onRefresh, onImageClick }: PostCardProps) => {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactions, setReactions] = useState(post.reactions || []);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isOwner = user?.id === post.author_id;
  const accent = post.author?.accent_color || 'hsl(var(--primary))';
  const moodIcon = post.author?.cabin_mood || '🕯️';

  const { openBlockDialog, handleMute, BlockConfirmDialog } = useBlockMute({
    targetUserId: post.author_id,
    targetDisplayName: post.author?.display_name,
    onComplete: () => onRemove?.(post.id),
  });

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  const fetchReactions = async () => {
    const { data } = await supabase
      .from('reactions')
      .select('reaction_type, user_id')
      .eq('post_id', post.id);
    if (data) setReactions(data);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return;
    await supabase.from('posts').delete().eq('id', post.id);
    onRemove?.(post.id);
    setMenuOpen(false);
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/${post.author?.handle}#post-${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast.success('Link copied');
    }
    setMenuOpen(false);
  };

  if (post._failed) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: post._optimistic ? 0.7 : 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-xl bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] mb-3 overflow-hidden"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">{moodIcon}</span>
            <div>
              <Link
                to={`/${post.author?.handle}`}
                className="font-body text-sm font-medium text-foreground hover:opacity-80"
              >
                {post.author?.display_name}
              </Link>
              <p className="font-body text-xs text-muted-foreground">
                @{post.author?.handle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-body text-muted-foreground">
              {formatTimeAgo(post.created_at)}
            </span>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 rounded-md text-muted-foreground hover:bg-muted transition-colors"
              >
                <MoreHorizontal size={16} />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-xl shadow-card overflow-hidden z-20"
                  >
                    <MenuBtn onClick={() => { setQuoteOpen(true); setMenuOpen(false); }}><Quote size={14} /> Quote post</MenuBtn>
                    <MenuBtn onClick={() => { setShareOpen(true); setMenuOpen(false); }}><Flame size={14} /> Share to Campfire</MenuBtn>
                    <MenuBtn onClick={handleCopyLink}><Copy size={14} /> Copy link</MenuBtn>
                    {!isOwner && (
                      <>
                        <div className="h-px bg-border" />
                        <MenuBtn onClick={() => { setReportOpen(true); setMenuOpen(false); }}><Flag size={14} /> Report</MenuBtn>
                        <MenuBtn onClick={() => { openBlockDialog(); setMenuOpen(false); }}>🚫 Step away from the fire</MenuBtn>
                        <MenuBtn onClick={() => { handleMute(); setMenuOpen(false); }}>🔇 Bank the fire</MenuBtn>
                      </>
                    )}
                    {isOwner && (
                      <>
                        <div className="h-px bg-border" />
                        <MenuBtn onClick={handleDelete} destructive><Trash2 size={14} /> Delete</MenuBtn>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Content by type */}
        {post.post_type === 'spark' && (
          <div>
            <p className="font-body text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {post.content}
            </p>
            {post.image_url && (
              <button
                type="button"
                onClick={() => onImageClick?.([post.image_url!], 0)}
                className="mt-3 rounded-lg overflow-hidden block w-full text-left cursor-zoom-in"
                style={{ minHeight: '1px' }}
                aria-label="View full image"
              >
                <img
                  src={post.image_url}
                  alt=""
                  crossOrigin="anonymous"
                  className="block w-full h-auto rounded-lg bg-muted"
                  style={{ maxHeight: '600px', objectFit: 'contain' }}
                  loading="lazy"
                />
              </button>
            )}
          </div>
        )}

        {post.post_type === 'story' && (
          <div>
            {post.title && (
              <h3 className="font-display text-lg font-semibold text-foreground mb-1.5">
                {post.title}
              </h3>
            )}
            <p className="font-body text-sm text-foreground/70 line-clamp-3">
              {stripHtml(post.content || '')}
            </p>
            <Link
              to={`/${post.author?.handle}`}
              className="inline-block mt-2 text-xs font-body text-primary hover:opacity-80"
            >
              ▸ Read in {post.author?.display_name}'s Cabin
            </Link>
          </div>
        )}

        {post.post_type === 'ember' && (
          <div>
            {post.content && (
              <p className="font-body text-sm text-foreground/80 mb-2">{post.content}</p>
            )}
            {post.post_media && post.post_media.length > 0 && (() => {
              const sorted = [...post.post_media].sort((a, b) => a.position - b.position);
              const imageUrls = sorted.filter(m => m.media_type !== 'video').map(m => m.url);
              return (
                <div className={`rounded-lg overflow-hidden ${
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
                        <video
                          src={media.url}
                          className="w-full h-auto rounded-lg"
                          style={{ maxHeight: '600px' }}
                          controls
                          muted
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => onImageClick?.(imageUrls, imageUrls.indexOf(media.url))}
                          className="block w-full cursor-zoom-in"
                          style={{ minHeight: '1px' }}
                          aria-label="View full image"
                        >
                          <img
                            src={media.url}
                            alt=""
                            crossOrigin="anonymous"
                            className="block w-full h-auto rounded-lg bg-muted"
                            style={{ maxHeight: sorted.length === 1 ? '600px' : '300px', objectFit: sorted.length === 1 ? 'contain' : 'cover' }}
                            loading="lazy"
                          />
                        </button>
                      )}
                      {i === 0 && sorted.length > 3 && (
                        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs font-body px-2 py-0.5 rounded-full">
                          +{sorted.length - 1} more
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Quoted post */}
        {post.is_quote_post && post.quoted_post && (() => {
          const quotedAuthorId = post.quoted_post.author_id;
          const canSeeQuote = quotedAuthorId === user?.id || circleIds.includes(quotedAuthorId);

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
              <p className="font-body text-xs text-foreground/70 line-clamp-2">
                {post.quoted_post.post_type === 'story' ? post.quoted_post.title : post.quoted_post.content}
              </p>
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 opacity-50">
              <p className="font-body text-xs text-muted-foreground italic">
                A post from someone outside your Circles.
              </p>
            </div>
          );
        })()}

        {/* Actions */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50">
          <ReactionBar
            postId={post.id}
            reactions={reactions}
            onReactionChange={fetchReactions}
          />
          <ReplyThread postId={post.id} />
        </div>
      </div>

      {/* Modals */}
      <QuoteComposer
        post={post}
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        onQuoted={(newPost) => { onRefresh?.(); }}
      />
      <ShareToCampfire
        postId={post.id}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        reportedPostId={post.id}
        reportedUserId={post.author_id}
      />
      <BlockConfirmDialog />
    </motion.div>
  );
};

const MenuBtn = ({ children, onClick, destructive }: { children: React.ReactNode; onClick: () => void; destructive?: boolean }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-3 py-2 text-sm font-body flex items-center gap-2 transition-colors ${
      destructive ? 'text-destructive hover:bg-destructive/10' : 'text-foreground hover:bg-muted'
    }`}
  >
    {children}
  </button>
);

const stripHtml = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

export default PostCard;
