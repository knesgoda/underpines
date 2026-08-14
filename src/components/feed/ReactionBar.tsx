import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

import { REACTIONS } from '@/lib/reactionTypes';

interface ReactionBarProps {
  postId: string;
  reactions: { reaction_type: string; user_id: string }[];
  onReactionChange: () => void;
}

const ReactionBar = ({ postId, reactions, onReactionChange }: ReactionBarProps) => {
  const { user } = useAuth();
  const [showFan, setShowFan] = useState(false);
  const fanRef = useRef<HTMLDivElement>(null);

  const myReaction = reactions.find(r => r.user_id === user?.id);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (fanRef.current && !fanRef.current.contains(e.target as Node)) setShowFan(false);
    };
    if (showFan) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showFan]);

  const handleReact = async (type: string) => {
    if (!user) return;
    setShowFan(false);

    if (myReaction?.reaction_type === type) {
      // Remove reaction
      await supabase.from('reactions').delete().eq('post_id', postId).eq('user_id', user.id);
    } else if (myReaction) {
      // Change reaction - delete then insert (unique constraint)
      await supabase.from('reactions').delete().eq('post_id', postId).eq('user_id', user.id);
      await supabase.from('reactions').insert({ post_id: postId, user_id: user.id, reaction_type: type });
    } else {
      // New reaction. The trigger on reactions maintains the author's
      // aggregated "X and N others reacted" notification.
      await supabase.from('reactions').insert({ post_id: postId, user_id: user.id, reaction_type: type });
    }
    onReactionChange();
  };

  const myReactionIcon = myReaction ? REACTIONS.find(r => r.type === myReaction.reaction_type)?.icon : null;

  return (
    <div className="relative" ref={fanRef}>
      <button
        onClick={() => setShowFan(!showFan)}
        className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
      >
        {myReactionIcon ? (
          <span className="text-base">{myReactionIcon}</span>
        ) : (
          'React'
        )}
      </button>

      <AnimatePresence>
        {showFan && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 flex items-center gap-1 bg-card border border-border rounded-[3px] px-2 py-1.5 shadow-card z-20"
          >
            {REACTIONS.map((r, i) => (
              <motion.button
                key={r.type}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.015, duration: 0.15 }}
                onClick={() => handleReact(r.type)}
                className={`text-xl hover:scale-125 transition-transform p-0.5 ${myReaction?.reaction_type === r.type ? 'bg-primary/10 rounded-full' : ''}`}
                title={r.type}
              >
                {r.icon}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReactionBar;
