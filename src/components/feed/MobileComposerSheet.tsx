import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AnimatePresence } from 'framer-motion';
import SparkComposer from './SparkComposer';
import EmberComposer from './EmberComposer';
import { useSeedlingStatus } from './SeedlingBanner';

type PostType = 'spark' | 'story' | 'ember' | null;

const MobileComposerSheet = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { composerOpen, setComposerOpen } = useNavigation();
  const { isSeedling, daysLeft } = useSeedlingStatus();
  const [activeType, setActiveType] = useState<PostType>(null);

  // Reset type when sheet closes
  useEffect(() => {
    if (!composerOpen) setActiveType(null);
  }, [composerOpen]);

  if (!user) return null;

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
    setComposerOpen(false);
  };

  const handlePost = async (post: any) => {
    // If we're on the feed, the inline ComposerStub will handle optimistic updates
    // Otherwise just close the sheet and navigate to feed
    setActiveType(null);
    setComposerOpen(false);
    if (window.location.pathname !== '/') {
      navigate('/');
    }
  };

  return (
    <Sheet open={composerOpen} onOpenChange={setComposerOpen}>
      <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-8 pt-4 max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-5" />

        {isSeedling ? (
          <div className="py-4">
            <p className="font-body text-sm text-muted-foreground">
              🌱 You're still getting settled. Posting unlocks in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}.
            </p>
          </div>
        ) : !activeType ? (
          <div className="space-y-4">
            <h3 className="font-display text-lg text-foreground">What would you like to share?</h3>
            <div className="space-y-2">
              {[
                { type: 'spark' as PostType, icon: '🌿', label: 'Spark', desc: 'A quick thought · 300 characters' },
                { type: 'story' as PostType, icon: '📖', label: 'Story', desc: 'Long-form with rich text editor' },
                { type: 'ember' as PostType, icon: '📷', label: 'Ember Post', desc: 'Up to 10 photos or a short video' },
              ].map(({ type, icon, label, desc }) => (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border hover:bg-muted transition-colors text-left"
                >
                  <span className="text-xl">{icon}</span>
                  <div>
                    <span className="font-body text-sm font-medium text-foreground">{label}</span>
                    <p className="font-body text-xs text-muted-foreground">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={handleCancel}
              className="w-full text-center text-sm font-body text-muted-foreground hover:text-foreground transition-colors pt-2"
            >
              Cancel
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeType === 'spark' && (
              <SparkComposer key="spark" onPost={handlePost} onCancel={handleCancel} />
            )}
            {activeType === 'ember' && (
              <EmberComposer key="ember" onPost={handlePost} onCancel={handleCancel} />
            )}
          </AnimatePresence>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default MobileComposerSheet;
