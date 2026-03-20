import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import SparkComposer from './SparkComposer';
import EmberComposer from './EmberComposer';
import UserAvatar from '@/components/UserAvatar';

type PostType = 'spark' | 'story' | 'ember' | null;

interface ComposerStubProps {
  onPost: (post: any) => void;
  profile: { display_name: string; avatar_url?: string | null; default_avatar_key?: string | null } | null;
}

const ComposerStub = ({ onPost, profile }: ComposerStubProps) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [activeType, setActiveType] = useState<PostType>(null);

  const handleTypeSelect = (type: PostType) => {
    if (type === 'story') {
      navigate('/new/story');
      return;
    }
    setActiveType(type);
  };

  const handleCancel = () => {
    setActiveType(null);
    setExpanded(false);
  };

  const handlePost = (post: any) => {
    onPost(post);
    setActiveType(null);
    setExpanded(false);
  };

  return (
    <div className="rounded-xl bg-card border border-border shadow-soft p-4 mb-4">
      {!expanded && !activeType ? (
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center gap-3 text-left"
        >
          <UserAvatar
            avatarUrl={profile?.avatar_url}
            defaultAvatarKey={profile?.default_avatar_key}
            displayName={profile?.display_name}
            size={36}
          />
          <span className="font-body text-sm text-muted-foreground/50">
            A thought, a story, a photo...
          </span>
        </button>
      ) : activeType ? (
        <AnimatePresence mode="wait">
          {activeType === 'spark' && (
            <SparkComposer key="spark" onPost={handlePost} onCancel={handleCancel} />
          )}
          {activeType === 'ember' && (
            <EmberComposer key="ember" onPost={handlePost} onCancel={handleCancel} />
          )}
        </AnimatePresence>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <div className="flex gap-2">
            {[
              { type: 'spark' as PostType, icon: '🌿', label: 'Spark' },
              { type: 'story' as PostType, icon: '📖', label: 'Story' },
              { type: 'ember' as PostType, icon: '📷', label: 'Ember Post' },
            ].map(({ type, icon, label }) => (
              <button
                key={type}
                onClick={() => handleTypeSelect(type)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors font-body text-sm"
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={handleCancel}
            className="text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default ComposerStub;
