import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { formatTimeAgo } from '@/lib/time';
import { toast } from 'sonner';
import type { PostWithAuthor } from './PostCard';

interface QuoteComposerProps {
  post: PostWithAuthor;
  open: boolean;
  onClose: () => void;
  onQuoted: (newPost: any) => void;
}

const QuoteComposer = ({ post, open, onClose, onQuoted }: QuoteComposerProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);

  const handleQuote = async () => {
    if (!content.trim() || !user) return;
    setPosting(true);

    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        post_type: 'spark',
        content: content.trim(),
        is_quote_post: true,
        quoted_post_id: post.id,
      })
      .select()
      .single();

    if (error) {
      toast.error("That one didn't make it. Try again?");
    } else {
      // Create deferred notification
      if (post.author_id !== user.id) {
        await supabase.from('notifications').insert({
          recipient_id: post.author_id,
          notification_type: 'quote_post',
          actor_id: user.id,
          post_id: data.id,
          is_delivered_in_ember: true,
        });
      }
      onQuoted(data);
      setContent('');
      onClose();
      toast.success('Quote posted');
    }
    setPosting(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="relative bg-card rounded-t-2xl md:rounded-2xl w-full max-w-lg overflow-hidden border border-border shadow-card"
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-body text-sm font-medium text-foreground">Quote post</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Say something about this..."
            className="w-full bg-transparent text-foreground font-body text-sm resize-none outline-none placeholder:text-muted-foreground/50 min-h-[60px]"
            rows={2}
            autoFocus
          />

          {/* Inset original post preview */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-body text-xs font-medium text-foreground">
                {post.author?.display_name}
              </span>
              <span className="text-xs font-body text-muted-foreground">
                · {formatTimeAgo(post.created_at)}
              </span>
            </div>
            <p className="font-body text-xs text-foreground/70 line-clamp-3">
              {post.post_type === 'story' ? post.title : post.content}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button onClick={onClose} className="text-sm font-body text-muted-foreground hover:text-foreground">
              Cancel
            </button>
            <button
              onClick={handleQuote}
              disabled={!content.trim() || posting}
              className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium disabled:opacity-40 hover:opacity-90"
            >
              Quote post ↑
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default QuoteComposer;
