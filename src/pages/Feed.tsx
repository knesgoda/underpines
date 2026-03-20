import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import ComposerStub from '@/components/feed/ComposerStub';
import PostCard, { PostWithAuthor } from '@/components/feed/PostCard';
import SeasonalEventCard from '@/components/feed/SeasonalEventCard';
import PineTreeLoading from '@/components/PineTreeLoading';
import { Settings } from 'lucide-react';

const Feed = () => {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [circleIds, setCircleIds] = useState<string[]>([]);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState({
    feed_show_sparks: true,
    feed_show_stories: true,
    feed_show_embers: true,
    feed_show_quotes: true,
    feed_scroll_reminder: true,
  });
  const [scrollNudgeShown, setScrollNudgeShown] = useState(false);
  const scrollTimerRef = useRef(0);
  const scrollIntervalRef = useRef<number | null>(null);
  const nudgeDismissedUntilRef = useRef<number>(0);

  // Load profile + preferences
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setProfile(data);
        setPrefs({
          feed_show_sparks: data.feed_show_sparks ?? true,
          feed_show_stories: data.feed_show_stories ?? true,
          feed_show_embers: data.feed_show_embers ?? true,
          feed_show_quotes: data.feed_show_quotes ?? true,
          feed_scroll_reminder: data.feed_scroll_reminder ?? true,
        });
      }
    });
  }, [user]);

  // Load circles
  useEffect(() => {
    if (!user) return;
    const loadCircles = async () => {
      const { data } = await supabase
        .from('circles')
        .select('requester_id, requestee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},requestee_id.eq.${user.id}`);

      if (data) {
        const ids = data.map(c => c.requester_id === user.id ? c.requestee_id : c.requester_id);
        setCircleIds(ids);
      }
    };
    loadCircles();
  }, [user]);

  // Load feed posts
  const loadPosts = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get muted user IDs for frontend filtering
    const { data: muteRows } = await supabase
      .from('mutes')
      .select('muted_id')
      .eq('muter_id', user.id);
    const mutedIds = new Set(muteRows?.map(m => m.muted_id) || []);

    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      // Fetch authors
      const authorIds = [...new Set(data.map(p => p.author_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, handle, accent_color, cabin_mood')
        .in('id', authorIds);

      // Fetch reactions
      const postIds = data.map(p => p.id);
      const { data: allReactions } = await supabase
        .from('reactions')
        .select('post_id, reaction_type, user_id')
        .in('post_id', postIds);

      // Fetch media for ember posts
      const emberIds = data.filter(p => p.post_type === 'ember').map(p => p.id);
      let allMedia: any[] = [];
      if (emberIds.length > 0) {
        const { data: media } = await supabase
          .from('post_media')
          .select('*')
          .in('post_id', emberIds)
          .order('position');
        allMedia = media || [];
      }

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const enriched: PostWithAuthor[] = data
        .filter(p => !mutedIds.has(p.author_id)) // Filter muted users
        .map(p => ({
          ...p,
          author: profileMap.get(p.author_id) as any,
          reactions: allReactions?.filter(r => r.post_id === p.id) || [],
          post_media: allMedia.filter(m => m.post_id === p.id),
        }));

      setPosts(enriched);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  // Scroll timer for 20-minute nudge
  useEffect(() => {
    if (!prefs.feed_scroll_reminder) return;

    const startTimer = () => {
      scrollIntervalRef.current = window.setInterval(() => {
        scrollTimerRef.current += 1;
        if (scrollTimerRef.current >= 1200 && !scrollNudgeShown && Date.now() > nudgeDismissedUntilRef.current) {
          setScrollNudgeShown(true);
        }
      }, 1000);
    };

    const stopTimer = () => {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    };

    startTimer();
    const handleVisibility = () => document.hidden ? stopTimer() : startTimer();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopTimer();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [prefs.feed_scroll_reminder, scrollNudgeShown]);

  const handleOptimisticPost = (post: any) => {
    if (post._failed) {
      setPosts(prev => prev.filter(p => p.id !== post.id));
      return;
    }
    setPosts(prev => [{
      ...post,
      author: profile ? { display_name: profile.display_name, handle: profile.handle, accent_color: profile.accent_color, cabin_mood: profile.cabin_mood } : undefined,
      reactions: [],
      post_media: [],
    }, ...prev]);
  };

  const handleRemovePost = (id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  const updatePref = async (key: string, value: boolean) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    if (user) {
      await supabase.from('profiles').update({ [key]: value } as any).eq('id', user.id);
    }
  };

  const dismissNudge = (hours: number) => {
    setScrollNudgeShown(false);
    scrollTimerRef.current = 0;
    nudgeDismissedUntilRef.current = Date.now() + hours * 3600000;
  };

  // Filter posts by preferences
  const filteredPosts = posts.filter(p => {
    if (p.post_type === 'spark' && !prefs.feed_show_sparks) return false;
    if (p.post_type === 'story' && !prefs.feed_show_stories) return false;
    if (p.post_type === 'ember' && !prefs.feed_show_embers) return false;
    if (p.is_quote_post && !prefs.feed_show_quotes) return false;
    return true;
  });

  // If not logged in, show landing
  if (authLoading) return <PineTreeLoading />;
  if (!user) return <LandingRedirect />;

  // Empty states
  const allFiltered = posts.length > 0 && filteredPosts.length === 0;
  const noCircles = circleIds.length === 0 && posts.length === 0;
  const emptyFeed = circleIds.length > 0 && filteredPosts.length === 0 && !allFiltered;

  return (
    <div className="max-w-[680px] mx-auto px-4 md:px-0 py-4 md:py-6">
      {/* Feed preferences toggle (desktop) */}
      <div className="hidden md:flex justify-end mb-2">
        <button
          onClick={() => setShowPrefs(!showPrefs)}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
          title="Feed preferences"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Feed preferences panel */}
      <AnimatePresence>
        {showPrefs && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl bg-card border border-border p-4 mb-4 space-y-2"
          >
            <h3 className="font-body text-sm font-medium text-foreground mb-2">Feed Preferences</h3>
            {[
              { key: 'feed_show_sparks', label: 'Show Sparks' },
              { key: 'feed_show_stories', label: 'Show Stories' },
              { key: 'feed_show_embers', label: 'Show Ember Posts' },
              { key: 'feed_show_quotes', label: 'Show quote posts' },
              { key: 'feed_scroll_reminder', label: 'Scroll reminder' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between py-1">
                <span className="font-body text-sm text-foreground">{label}</span>
                <button
                  onClick={() => updatePref(key, !(prefs as any)[key])}
                  className={`w-10 h-5 rounded-full transition-colors relative ${(prefs as any)[key] ? 'bg-primary' : 'bg-muted'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${(prefs as any)[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </label>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seasonal event card */}
      <SeasonalEventCard onShareThought={(prompt) => {
        // Pre-fill composer with prompt
      }} />

      {/* Composer stub */}
      <ComposerStub onPost={handleOptimisticPost} profile={profile} />

      {/* Loading */}
      {loading && <div className="py-8"><PineTreeLoading /></div>}

      {/* Empty: no circles */}
      {!loading && noCircles && (
        <EmptyState icon="🌲" title="Your feed is quiet right now —" subtitle="which is kind of nice, isn't it?" />
      )}

      {/* Empty: circles but no posts */}
      {!loading && emptyFeed && (
        <EmptyState icon="🌿" title="Everyone's out on the trail." subtitle="Nothing new since your last visit." />
      )}

      {/* Empty: all filtered */}
      {!loading && allFiltered && (
        <EmptyState icon="🕯️" title="Your feed filters are hiding everything.">
          <button onClick={() => setShowPrefs(true)} className="text-sm font-body text-primary hover:opacity-80 mt-2">
            Adjust your feed preferences
          </button>
        </EmptyState>
      )}

      {/* Posts */}
      <AnimatePresence>
        {filteredPosts.map((post, i) => (
          <div key={post.id}>
            {/* Scroll nudge card — inserted after a few posts */}
            {scrollNudgeShown && i === 5 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-card border border-border p-6 mb-3 text-center"
              >
                <p className="text-2xl mb-2">🌲</p>
                <p className="font-body text-sm text-foreground">You've been here a while.</p>
                <p className="font-body text-sm text-muted-foreground mb-4">Maybe a good time for a walk.</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => dismissNudge(2)}
                    className="px-4 py-1.5 rounded-full border border-border font-body text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    Keep reading
                  </button>
                  <button
                    onClick={() => {
                      try { window.close(); } catch {
                        dismissNudge(2);
                        // toast instead
                      }
                    }}
                    className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground font-body text-sm hover:opacity-90 transition-opacity"
                  >
                    Close the app
                  </button>
                </div>
              </motion.div>
            )}
            <PostCard post={post} onRemove={handleRemovePost} onRefresh={loadPosts} />
          </div>
        ))}
      </AnimatePresence>

      {/* Feed bottom */}
      {!loading && filteredPosts.length > 0 && (
        <div className="text-center py-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px bg-border flex-1 max-w-[80px]" />
            <span className="text-xs font-body text-muted-foreground">You're all caught up</span>
            <div className="h-px bg-border flex-1 max-w-[80px]" />
          </div>
          <p className="font-body text-xs text-muted-foreground mb-2">
            Everything since your last visit is above.
          </p>
          <p className="text-lg mb-2">🌿</p>
          <p className="font-body text-xs text-muted-foreground">Check back later.</p>
        </div>
      )}
    </div>
  );
};

const EmptyState = ({ icon, title, subtitle, children }: { icon: string; title: string; subtitle?: string; children?: React.ReactNode }) => (
  <div className="text-center py-16">
    <p className="text-4xl mb-3">{icon}</p>
    <p className="font-body text-sm text-foreground">{title}</p>
    {subtitle && <p className="font-body text-sm text-muted-foreground">{subtitle}</p>}
    {children}
  </div>
);

const LandingRedirect = () => {
  // For non-authenticated users, show the existing Index page behavior
  return null;
};

export default Feed;
