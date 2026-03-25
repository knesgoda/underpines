import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTimeAgo } from '@/lib/time';
import { Flame } from 'lucide-react';
import { toast } from 'sonner';
import GifPickerModal from '@/components/GifPickerModal';

interface Reply {
  id: string;
  content: string;
  author_id: string;
  parent_reply_id: string | null;
  created_at: string;
  gif_url?: string | null;
  author?: { display_name: string; handle: string };
}

interface ReplyThreadProps {
  postId: string;
  autoExpand?: boolean;
}

const ReplyContent = ({ reply }: { reply: Reply }) => (
  <>
    {reply.content && <p className="text-sm font-body text-foreground/80 mt-0.5">{reply.content}</p>}
    {reply.gif_url && (
      <img src={reply.gif_url} alt="GIF" className="mt-1 rounded-lg max-w-[240px] max-h-[180px] object-cover" />
    )}
  </>
);

const ReplyThread = ({ postId, autoExpand = false }: ReplyThreadProps) => {
  const { user } = useAuth();
  const [replies, setReplies] = useState<Reply[]>([]);
  const [expanded, setExpanded] = useState(autoExpand);
  const [composerOpen, setComposerOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyGifUrl, setReplyGifUrl] = useState<string | null>(null);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchReplies = async () => {
    const { data } = await supabase
      .from('replies')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (data) {
      const authorIds = [...new Set(data.map(r => r.author_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, handle')
        .in('id', authorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setReplies(data.map(r => ({
        ...r,
        author: profileMap.get(r.author_id) as any,
      })));
    }
  };

  useEffect(() => { fetchReplies(); }, [postId]);

  const topLevelReplies = replies.filter(r => !r.parent_reply_id);
  const nestedReplies = (parentId: string) => replies.filter(r => r.parent_reply_id === parentId);

  const handleReply = async () => {
    if ((!replyText.trim() && !replyGifUrl) || !user) return;
    setPosting(true);

    const content = replyText.trim();
    const gifUrl = replyGifUrl;

    const optimistic: Reply = {
      id: crypto.randomUUID(),
      content,
      author_id: user.id,
      parent_reply_id: replyingTo,
      created_at: new Date().toISOString(),
      gif_url: gifUrl,
      author: { display_name: 'You', handle: '' },
    };

    setReplies(prev => [...prev, optimistic]);
    setReplyText('');
    setReplyGifUrl(null);
    setComposerOpen(false);
    setReplyingTo(null);

    const { error } = await supabase.from('replies').insert({
      post_id: postId,
      author_id: user.id,
      content: content || '',
      parent_reply_id: replyingTo,
      gif_url: gifUrl,
    } as any);

    if (error) {
      setReplies(prev => prev.filter(r => r.id !== optimistic.id));
      toast.error("That reply didn't make it. Try again?");
    } else {
      const { data: post } = await supabase.from('posts').select('author_id').eq('id', postId).single();
      if (post && post.author_id !== user.id) {
        await supabase.from('notifications').insert({
          recipient_id: post.author_id,
          notification_type: 'reply',
          actor_id: user.id,
          post_id: postId,
        });
      }
      fetchReplies();
    }
    setPosting(false);
  };

  const previewReply = topLevelReplies[topLevelReplies.length - 1];

  return (
    <div className="mt-3">
      {/* Inline reply composer trigger */}
      {!composerOpen && (
        <button
          onClick={() => { setComposerOpen(true); setReplyingTo(null); }}
          className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
        >
          Reply
        </button>
      )}

      {/* Reply composer */}
      <AnimatePresence>
        {composerOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 pl-4 border-l-2 border-border"
          >
            <textarea
              ref={textareaRef}
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Add to the conversation..."
              className="w-full bg-transparent text-foreground font-body text-sm resize-none outline-none placeholder:text-muted-foreground/50 min-h-[52px]"
              rows={2}
              autoFocus
            />
            {replyGifUrl && (
              <div className="relative inline-block mt-1 mb-1">
                <img src={replyGifUrl} alt="GIF" className="rounded-lg max-w-[160px] max-h-[120px] object-cover" />
                <button
                  onClick={() => setReplyGifUrl(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </div>
            )}
            <div className="flex items-center justify-between mt-1">
              <button
                onClick={() => setGifPickerOpen(true)}
                className="font-body text-[10px] font-semibold px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                GIF
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setComposerOpen(false); setReplyText(''); setReplyGifUrl(null); setReplyingTo(null); }}
                  className="text-xs font-body text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReply}
                  disabled={(!replyText.trim() && !replyGifUrl) || posting}
                  className="px-3 py-1 rounded-full bg-primary text-primary-foreground font-body text-xs font-medium disabled:opacity-40"
                >
                  Reply ↑
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GIF Picker */}
      <GifPickerModal
        open={gifPickerOpen}
        onClose={() => setGifPickerOpen(false)}
        onSelect={(url) => setReplyGifUrl(url)}
      />

      {/* Reply preview (when not expanded) */}
      {!expanded && previewReply && topLevelReplies.length > 0 && (
        <div className="mt-3 pl-4 border-l-2 border-border">
          <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
            <span className="font-medium text-foreground">{previewReply.author?.display_name}</span>
            <span>· {formatTimeAgo(previewReply.created_at)}</span>
          </div>
          <p className="text-sm font-body text-foreground/80 mt-0.5 line-clamp-2">{previewReply.content}</p>
          {previewReply.gif_url && (
            <img src={previewReply.gif_url} alt="GIF" className="mt-1 rounded-lg max-w-[160px] max-h-[100px] object-cover" />
          )}
          {topLevelReplies.length > 1 && (
            <button
              onClick={() => { setExpanded(true); fetchReplies(); }}
              className="text-xs font-body text-primary mt-1 hover:opacity-80"
            >
              See all {topLevelReplies.length} replies ↓
            </button>
          )}
        </div>
      )}

      {/* Full thread */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 space-y-2"
          >
            {topLevelReplies.map(reply => (
              <div key={reply.id} className="pl-4 border-l-2 border-border">
                <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
                  <span className="font-medium text-foreground">{reply.author?.display_name}</span>
                  <span>· {formatTimeAgo(reply.created_at)}</span>
                </div>
                <ReplyContent reply={reply} />

                {/* Depth-2 nested replies */}
                {nestedReplies(reply.id).map(nested => {
                  const depth3 = nestedReplies(nested.id);
                  return (
                    <div key={nested.id} className="pl-4 mt-2 border-l-2 border-border/50">
                      <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
                        <span className="font-medium text-foreground">{nested.author?.display_name}</span>
                        <span>· {formatTimeAgo(nested.created_at)}</span>
                      </div>
                      <ReplyContent reply={nested} />

                      {/* Depth 3+ → campfire prompt */}
                      {depth3.length > 0 && (
                        <div className="mt-2 py-2 px-3 rounded-lg bg-primary/5 border border-primary/10 flex items-center gap-2">
                          <Flame size={14} className="text-primary shrink-0" />
                          <p className="text-xs font-body text-muted-foreground">
                            This conversation is getting good — take it to a Campfire?{' '}
                            <button className="text-primary hover:opacity-80 font-medium">Start one →</button>
                          </p>
                        </div>
                      )}

                      {/* Reply at depth 2 posts flat to depth-1 parent */}
                      <button
                        onClick={() => { setComposerOpen(true); setReplyingTo(reply.id); }}
                        className="text-xs font-body text-muted-foreground hover:text-foreground mt-1"
                      >
                        Reply
                      </button>
                    </div>
                  );
                })}

                {/* Reply to top-level */}
                <button
                  onClick={() => { setComposerOpen(true); setReplyingTo(reply.id); }}
                  className="text-xs font-body text-muted-foreground hover:text-foreground mt-1"
                >
                  Reply
                </button>
              </div>
            ))}

            <button
              onClick={() => setExpanded(false)}
              className="text-xs font-body text-muted-foreground hover:text-foreground"
            >
              Collapse replies
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReplyThread;
