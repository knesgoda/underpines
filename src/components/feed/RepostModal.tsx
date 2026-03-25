import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatTimeAgo } from '@/lib/time';
import UserAvatar from '@/components/UserAvatar';
import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PostWithAuthor } from './PostCard';

interface RepostModalProps {
  post: PostWithAuthor;
  open: boolean;
  onClose: () => void;
  onReposted?: () => void;
}

const RepostModal = ({ post, open, onClose, onReposted }: RepostModalProps) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleRepost = async () => {
    if (!user) return;
    setStatus('loading');

    const { error } = await supabase
      .from('reposts')
      .insert({ user_id: user.id, post_id: post.id });

    if (error) {
      setStatus('idle');
      return;
    }

    setStatus('success');
    setTimeout(() => {
      onReposted?.();
      onClose();
      // Reset after close animation
      setTimeout(() => setStatus('idle'), 300);
    }, 1400);
  };

  const truncatedContent = (() => {
    const raw = post.post_type === 'story' ? (post.title || '') : (post.content || '');
    return raw.length > 140 ? raw.slice(0, 140) + '…' : raw;
  })();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setTimeout(() => setStatus('idle'), 300); } }}>
      <DialogContent className="sm:max-w-md rounded-2xl border-[#e5e7eb] bg-[#f9fafb] p-0 gap-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 px-6"
            >
              <div className="w-12 h-12 rounded-full bg-[#dcfce7] flex items-center justify-center mb-3">
                <Check className="text-[#16a34a]" size={24} />
              </div>
              <p className="font-display text-lg font-semibold text-[#1f2937]">
                Passed it along 🌲
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-6"
            >
              <h2 className="font-display text-lg font-semibold text-[#1f2937] mb-1">
                Share this to your feed?
              </h2>
              <p className="font-body text-sm text-[#1f2937]/60 mb-4">
                This post will appear in your Cabin and in the feeds of your Circles — no commentary added. Want to say something about it? Use Quote Post instead.
              </p>

              {/* Preview card */}
              <div className="rounded-lg border border-[#e5e7eb] bg-white p-3 mb-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <UserAvatar
                    avatarUrl={post.author?.avatar_url}
                    defaultAvatarKey={post.author?.default_avatar_key}
                    displayName={post.author?.display_name}
                    size={24}
                  />
                  <span className="font-body text-sm font-medium text-[#1f2937]">
                    {post.author?.display_name}
                  </span>
                  <span className="text-xs font-body text-[#1f2937]/40">
                    · {formatTimeAgo(post.created_at)}
                  </span>
                </div>
                {truncatedContent && (
                  <p className="font-body text-sm text-[#1f2937]/70 line-clamp-3">
                    {truncatedContent}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { onClose(); setTimeout(() => setStatus('idle'), 300); }}
                  className="px-4 py-2 rounded-lg font-body text-sm text-[#1f2937]/70 hover:bg-[#e5e7eb]/50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30"
                >
                  Never mind
                </button>
                <button
                  onClick={handleRepost}
                  disabled={status === 'loading'}
                  className="px-4 py-2 rounded-lg font-body text-sm font-medium bg-[#16a34a] text-white hover:bg-[#16a34a]/90 transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#16a34a]/40"
                >
                  {status === 'loading' ? 'Sharing…' : 'Share it 🌲'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default RepostModal;
