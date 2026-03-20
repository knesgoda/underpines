import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTimeAgo } from '@/lib/time';
import { Flame } from 'lucide-react';
import { toast } from 'sonner';

interface Reply {
  id: string;
  content: string;
  author_id: string;
  parent_reply_id: string | null;
  created_at: string;
  author?: { display_name: string; handle: string };
}

interface ReplyThreadProps {
  postId: string;
}

const ReplyThread = ({ postId }: ReplyThreadProps) => {
  const { user } = useAuth();
  const [replies, setReplies] = useState<Reply[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
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
      // Fetch author profiles
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
    if (!replyText.trim() || !user) return;
    setPosting(true);

    const optimistic: Reply = {
      id: crypto.randomUUID(),
      content: replyText.trim(),
      author_id: user.id,
      parent_reply_id: replyingTo,
      created_at: new Date().toISOString(),
      author: { display_name: 'You', handle: '' },
    };

    setReplies(prev => [...prev, optimistic]);
    setReplyText('');
    setComposerOpen(false);
    setReplyingTo(null);

    const { error } = await supabase.from('replies').insert({
      post_id: postId,
      author_id: user.id,
      content: replyText.trim(),
      parent_reply_id: replyingTo,
    });

    if (error) {
      setReplies(prev => prev.filter(r => r.id !== optimistic.id));
      toast.error("That reply didn't make it. Try again?");
    } else {
      // Create notification
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
            <div className="flex items-center justify-end gap-2 mt-1">
              <button
                onClick={() => { setComposerOpen(false); setReplyText(''); setReplyingTo(null); }}
                className="text-xs font-body text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleReply}
                disabled={!replyText.trim() || posting}
                className="px-3 py-1 rounded-full bg-primary text-primary-foreground font-body text-xs font-medium disabled:opacity-40"
              >
                Reply ↑
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply preview (when not expanded) */}
      {!expanded && previewReply && topLevelReplies.length > 0 && (
        <div className="mt-3 pl-4 border-l-2 border-border">
          <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
            <span className="font-medium text-foreground">{previewReply.author?.display_name}</span>
            <span>· {formatTimeAgo(previewReply.created_at)}</span>
          </div>
          <p className="text-sm font-body text-foreground/80 mt-0.5 line-clamp-2">{previewReply.content}</p>
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
                <p className="text-sm font-body text-foreground/80 mt-0.5">{reply.content}</p>

                {/* Nested replies (max 1 shown) */}
                {nestedReplies(reply.id).slice(0, 1).map(nested => (
                  <div key={nested.id} className="pl-4 mt-2 border-l-2 border-border/50">
                    <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
                      <span className="font-medium text-foreground">{nested.author?.display_name}</span>
                      <span>· {formatTimeAgo(nested.created_at)}</span>
                    </div>
                    <p className="text-sm font-body text-foreground/80 mt-0.5">{nested.content}</p>
                  </div>
                ))}

                {nestedReplies(reply.id).length > 1 && (
                  <div className="pl-4 mt-2 py-2 px-3 rounded-lg bg-muted/30 text-xs font-body text-muted-foreground">
                    This conversation is getting good — take it to a Campfire?{' '}
                    <button className="text-primary hover:opacity-80">Start one →</button>
                  </div>
                )}

                {/* Reply to this reply */}
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
