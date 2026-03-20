import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import PostCard, { PostWithAuthor } from '@/components/feed/PostCard';
import PineTreeLoading from '@/components/PineTreeLoading';
import { toast } from 'sonner';

const CollectionView = () => {
  const { handle, id } = useParams<{ handle: string; id: string }>();
  const { user } = useAuth();
  const [collection, setCollection] = useState<any>(null);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [authorProfile, setAuthorProfile] = useState<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [onWaitlist, setOnWaitlist] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;

      const { data: col } = await supabase.from('collections').select('*').eq('id', id).maybeSingle();
      if (!col) { setLoading(false); return; }
      setCollection(col);

      const { data: prof } = await supabase
        .from('profiles')
        .select('id, display_name, handle, accent_color, cabin_mood')
        .eq('id', col.author_id)
        .maybeSingle();
      setAuthorProfile(prof);

      // Check subscription
      if (user && col.is_paid) {
        const { data: sub } = await supabase
          .from('collection_subscriptions')
          .select('id')
          .eq('collection_id', id)
          .eq('subscriber_id', user.id)
          .eq('status', 'active')
          .maybeSingle();
        setIsSubscribed(!!sub);

        const { data: wl } = await supabase
          .from('collection_waitlist')
          .select('id')
          .eq('collection_id', id)
          .eq('user_id', user.id)
          .maybeSingle();
        setOnWaitlist(!!wl);
      }

      // Load posts
      const { data: cposts } = await supabase
        .from('collection_posts')
        .select('post_id, position')
        .eq('collection_id', id)
        .order('position', { ascending: true });

      if (cposts && cposts.length > 0) {
        const postIds = cposts.map(cp => cp.post_id);
        const { data: postRows } = await supabase
          .from('posts')
          .select('*')
          .in('id', postIds)
          .eq('is_published', true);

        if (postRows) {
          const { data: media } = await supabase
            .from('post_media')
            .select('*')
            .in('post_id', postIds);

          const ordered = cposts.map(cp => {
            const p = postRows.find(pr => pr.id === cp.post_id);
            if (!p) return null;
            return {
              ...p,
              created_at: p.created_at || '',
              author: prof ? { display_name: prof.display_name, handle: prof.handle, accent_color: prof.accent_color, cabin_mood: prof.cabin_mood } : undefined,
              post_media: media?.filter(m => m.post_id === p.id).sort((a, b) => a.position - b.position) || [],
            } as PostWithAuthor;
          }).filter(Boolean) as PostWithAuthor[];

          setPosts(ordered);
        }
      }
      setLoading(false);
    };
    load();
  }, [id, user]);

  const joinWaitlist = async () => {
    if (!user || !id) return;
    await supabase.from('collection_waitlist').insert({ collection_id: id, user_id: user.id });
    setOnWaitlist(true);
    toast.success("You'll be among the first to subscribe when it opens.");
  };

  if (loading) return <PineTreeLoading />;
  if (!collection) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="font-body text-sm text-muted-foreground">Collection not found.</p>
    </div>
  );

  const isOwner = user?.id === collection.author_id;
  const isPaid = collection.is_paid;
  const canViewAll = !isPaid || isSubscribed || isOwner;

  // For paid: show 1 post as preview
  const visiblePosts = canViewAll ? posts : posts.slice(0, 1);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto px-4 py-8">
      {/* Cover */}
      {collection.cover_image_url && (
        <div className="w-full h-[200px] rounded-xl overflow-hidden mb-6">
          <img src={collection.cover_image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <h1 className="font-display text-2xl text-foreground">{collection.title}</h1>

      {authorProfile && (
        <Link to={`/${authorProfile.handle}`} className="flex items-center gap-2 mt-2">
          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-medium text-secondary-foreground">
            {authorProfile.display_name[0]?.toUpperCase()}
          </div>
          <span className="font-body text-sm text-muted-foreground">by {authorProfile.display_name}</span>
        </Link>
      )}

      {collection.description && (
        <p className="font-body text-sm text-muted-foreground mt-3">{collection.description}</p>
      )}

      <p className="font-body text-xs text-muted-foreground mt-2">
        {isPaid ? `$${((collection.price_cents || 0) / 100).toFixed(0)} / ${collection.price_type || 'month'}` : 'Free'} · {posts.length} posts
        {isSubscribed && <span className="ml-2 text-primary">Subscribed ✓</span>}
      </p>

      {isOwner && (
        <Link to={`/collections/edit/${collection.id}`} className="inline-block mt-3 font-body text-xs text-primary hover:underline">
          Edit Collection
        </Link>
      )}

      <div className="h-px bg-border my-6" />

      {/* Posts */}
      <div className="space-y-3">
        {visiblePosts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {/* Paid gate */}
      {isPaid && !canViewAll && (
        <div className="mt-6 rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-3xl mb-3">📚</p>
          <p className="font-body text-sm text-foreground mb-1">This Collection continues for subscribers.</p>
          <button
            onClick={() => toast.info("Collection subscriptions are coming very soon. We'll let the author know you're interested.")}
            className="mt-3 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-body text-sm"
          >
            ${((collection.price_cents || 0) / 100).toFixed(0)} / {collection.price_type || 'month'} — Subscribe to continue reading
          </button>
          {!onWaitlist ? (
            <button onClick={joinWaitlist} className="block mx-auto mt-3 font-body text-xs text-muted-foreground hover:underline">
              Notify me when subscriptions open →
            </button>
          ) : (
            <p className="mt-3 font-body text-xs text-primary">You're on the waitlist ✓</p>
          )}
          <p className="mt-4 font-body text-[10px] text-muted-foreground">
            Always a free preview. You've seen one post before we ask for anything.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default CollectionView;
