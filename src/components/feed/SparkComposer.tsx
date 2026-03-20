import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface SparkComposerProps {
  onPost: (post: any) => void;
  onCancel: () => void;
}

const SparkComposer = ({ onPost, onCancel }: SparkComposerProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.max(el.scrollHeight, 80) + 'px';
    }
  };

  const handlePost = async () => {
    if (!content.trim() || !user) return;
    setPosting(true);

    // Optimistic post object
    const optimisticPost = {
      id: crypto.randomUUID(),
      author_id: user.id,
      post_type: 'spark' as const,
      content: content.trim(),
      title: null,
      is_published: true,
      is_quote_post: false,
      quoted_post_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _optimistic: true,
    };

    onPost(optimisticPost);
    setContent('');

    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        post_type: 'spark',
        content: content.trim(),
      })
      .select()
      .single();

    if (error) {
      onPost({ ...optimisticPost, _failed: true });
      toast.error("That one didn't make it. Try again?");
    }
    setPosting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-3"
    >
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => {
          if (e.target.value.length <= 300) {
            setContent(e.target.value);
            autoResize();
          }
        }}
        placeholder="What's alive in you right now?"
        className="w-full bg-transparent text-foreground font-body text-sm resize-none outline-none placeholder:text-muted-foreground/50 min-h-[80px]"
        rows={3}
      />

      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>

        <div className="flex items-center gap-3">
          {content.length >= 250 && (
            <span className="text-xs font-body text-muted-foreground">
              {content.length}/300
            </span>
          )}
          <button
            onClick={handlePost}
            disabled={!content.trim() || posting}
            className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium disabled:opacity-40 transition-opacity hover:opacity-90"
          >
            Post to Pines ↑
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default SparkComposer;
