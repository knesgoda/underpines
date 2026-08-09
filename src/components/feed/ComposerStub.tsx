import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import SparkComposer from './SparkComposer';
import EmberComposer from './EmberComposer';
import UserAvatar from '@/components/UserAvatar';
import type { PostWithAuthor } from './PostCard';
import { useSeedlingStatus } from './SeedlingBanner';

type PostType = 'spark' | 'story' | 'ember' | 'bulletin' | null;

/**
 * What you can post, in words.
 *
 * These were Spark, Story and "Ember Post" — and "Ember Post" sat in the same
 * product as "Daily Ember", which is the digest and an entirely different
 * thing. The stored post_type values are unchanged.
 *
 * The list was also written out three times in this file with different emoji
 * in each copy, so the desktop collapsed bar disagreed with the expanded one.
 *
 * Bulletins were behind a flag while the widened post_type CHECK was pending.
 * The constraint is applied, so the flag is gone rather than left permanently
 * true with nothing left to guard.
 */
const POST_TYPES: { type: Exclude<PostType, null>; icon: string; label: string }[] = [
  { type: 'spark', icon: '\u{1F33F}', label: 'A thought' },
  { type: 'story', icon: '\u{1F4D6}', label: 'Something longer' },
  { type: 'ember', icon: '\u{1F4F7}', label: 'Photos' },
  { type: 'bulletin', icon: '\u{1F4CC}', label: 'A bulletin' },
];

interface ComposerStubProps {
  onPost: (post: PostWithAuthor) => void;
  profile: { display_name: string; avatar_url?: string | null; default_avatar_key?: string | null } | null;
}

const ComposerStub = ({ onPost, profile }: ComposerStubProps) => {
  const navigate = useNavigate();
  const { composerOpen, setComposerOpen } = useNavigation();
  const isMobile = useIsMobile();
  const { isSeedling, daysLeft } = useSeedlingStatus();
  const [expanded, setExpanded] = useState(false);
  const [activeType, setActiveType] = useState<PostType>(null);

  // Sync external trigger with local UI — only on desktop (mobile uses the sheet)
  useEffect(() => {
    if (composerOpen && !isMobile) {
      setExpanded(true);
    }
  }, [composerOpen, isMobile]);

  const handleTypeSelect = (type: PostType) => {
    if (type === 'story') {
      setComposerOpen(false);
      navigate('/new/story');
      return;
    }
    setActiveType(type);
  };

  const handleCancel = () => {
    setActiveType(null);
    setExpanded(false);
    setComposerOpen(false);
  };

  const handlePost = (post: PostWithAuthor) => {
    onPost(post);
    setActiveType(null);
    setExpanded(false);
    setComposerOpen(false);
  };

  if (isSeedling) {
    return (
      <div className="rounded-xl bg-card border border-border shadow-soft p-4 mb-4">
        <p className="font-body text-sm text-muted-foreground">
          🌱 You're still settling in. Read, look around, set up your page — posting unlocks in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}.
        </p>
      </div>
    );
  }

  // Mobile: keep the simple stub (mobile uses bottom nav compose)
  if (isMobile) {
    return (
      <div className="rounded-xl bg-card border border-border shadow-soft p-4 mb-4">
        {!expanded && !activeType ? (
          <button
            onClick={() => { setExpanded(true); setComposerOpen(true); }}
            className="w-full flex items-center gap-3 text-left"
          >
            <UserAvatar
              avatarUrl={profile?.avatar_url}
              defaultAvatarKey={profile?.default_avatar_key}
              displayName={profile?.display_name}
              size={36}
            />
            <span className="font-body text-sm text-muted-foreground/50">
              A thought, something longer, a photo…
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
            {activeType === 'bulletin' && (
              <SparkComposer key="bulletin" postType="bulletin" onPost={handlePost} onCancel={handleCancel} />
            )}
          </AnimatePresence>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <div className="flex gap-2">
              {POST_TYPES.map(({ type, icon, label }) => (
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
  }

  // Desktop: inline compose card
  return (
    <div className="rounded-lg bg-card border border-border shadow-sm mb-4">
      {activeType ? (
        <div className="p-4">
          <AnimatePresence mode="wait">
            {activeType === 'spark' && (
              <SparkComposer key="spark" onPost={handlePost} onCancel={handleCancel} />
            )}
            {activeType === 'ember' && (
              <EmberComposer key="ember" onPost={handlePost} onCancel={handleCancel} />
            )}
            {activeType === 'bulletin' && (
              <SparkComposer key="bulletin" postType="bulletin" onPost={handlePost} onCancel={handleCancel} />
            )}
          </AnimatePresence>
        </div>
      ) : (
        <>
          {/* Main row: avatar + placeholder + button */}
          <button
            onClick={() => { setExpanded(true); setComposerOpen(true); }}
            className="w-full flex items-center gap-3 p-4 text-left"
          >
            <UserAvatar
              avatarUrl={profile?.avatar_url}
              defaultAvatarKey={profile?.default_avatar_key}
              displayName={profile?.display_name}
              size={40}
            />
            <span className="flex-1 font-body text-sm text-muted-foreground">
              What's on your mind?
            </span>
            <span className="shrink-0 px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-body text-sm font-medium">
              New Post
            </span>
          </button>

          {/* Divider */}
          <div className="h-px bg-border mx-4" />

          {/* Post type shortcuts */}
          {expanded ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 space-y-3"
            >
              <div className="flex gap-2">
                {POST_TYPES.map(({ type, icon, label }) => (
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
          ) : (
            <div className="flex items-center gap-1 px-4 py-2.5">
              {POST_TYPES.map(({ type, icon, label }, i) => (
                <span key={type} className="flex items-center">
                  <button
                    onClick={() => handleTypeSelect(type)}
                    className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {icon} {label}
                  </button>
                  {i < POST_TYPES.length - 1 && <span className="mx-1.5 text-border">·</span>}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ComposerStub;
