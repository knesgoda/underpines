import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { PostWithAuthor } from '@/components/feed/PostCard';

/**
 * The chronological feed.
 *
 * Same pipeline the old Feed page ran, moved behind React Query so it is
 * cached across navigations and deduped against other callers. Circles are
 * fetched inside the query rather than held in sibling state, which is what
 * used to make the whole thing run twice on every visit.
 */
export const useFeedPosts = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['feed', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<{ posts: PostWithAuthor[]; circleIds: string[] }> => {
      const uid = user!.id;

      const [circleResult, muteResult, campMemberResult] = await Promise.all([
        supabase
          .from('circles')
          .select('requester_id, requestee_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${uid},requestee_id.eq.${uid}`),
        supabase.from('mutes').select('muted_id').eq('muter_id', uid),
        supabase.from('camp_members').select('camp_id').eq('user_id', uid),
      ]);

      const circleIds = (circleResult.data || []).map(c =>
        c.requester_id === uid ? c.requestee_id : c.requester_id
      );
      const mutedIds = new Set(muteResult.data?.map(m => m.muted_id) || []);
      const campIds = campMemberResult.data?.map(cm => cm.camp_id) || [];
      const allowedAuthorIds = [uid, ...circleIds];

      const [postsResult, campPostsResult] = await Promise.all([
        supabase
          .from('posts')
          .select('*')
          .eq('is_published', true)
          .in('author_id', allowedAuthorIds)
          .order('created_at', { ascending: false })
          .limit(50),
        campIds.length > 0
          ? supabase
              .from('camp_posts')
              .select('*, camp:camps(name)')
              .in('camp_id', campIds)
              .eq('is_published', true)
              .order('created_at', { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const allPosts = postsResult.data || [];
      const campPosts = campPostsResult.data || [];
      if (allPosts.length === 0 && campPosts.length === 0) return { posts: [], circleIds };

      const authorIds = [...new Set([...allPosts.map(p => p.author_id), ...campPosts.map(p => p.author_id)])];
      const postIds = allPosts.map(p => p.id);
      const mediaPostIds = allPosts.filter(p => p.post_type === 'ember').map(p => p.id);

      const [profilesResult, reactionsResult, mediaResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, display_name, handle, accent_color, cabin_mood, avatar_url, default_avatar_key')
          .in('id', authorIds.length > 0 ? authorIds : ['00000000-0000-0000-0000-000000000000']),
        postIds.length > 0
          ? supabase.from('reactions').select('post_id, reaction_type, user_id').in('post_id', postIds)
          : Promise.resolve({ data: [] as any[] }),
        mediaPostIds.length > 0
          ? supabase.from('post_media').select('*').in('post_id', mediaPostIds).order('position')
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const profileMap = new Map((profilesResult.data || []).map(p => [p.id, p]));
      const allReactions = reactionsResult.data || [];
      const allMedia = mediaResult.data || [];

      const enrichedPersonal: PostWithAuthor[] = allPosts
        .filter(p => !mutedIds.has(p.author_id))
        .map(p => ({
          ...p,
          author: profileMap.get(p.author_id) as any,
          reactions: allReactions.filter(r => r.post_id === p.id),
          post_media: allMedia.filter(m => m.post_id === p.id),
        }));

      const enrichedCamp: PostWithAuthor[] = campPosts
        .filter(p => !mutedIds.has(p.author_id))
        .map(p => ({
          id: p.id,
          author_id: p.author_id,
          content: p.content,
          post_type: p.post_type || 'spark',
          is_published: true,
          created_at: p.created_at,
          is_quote_post: false,
          author: profileMap.get(p.author_id) as any,
          reactions: [],
          post_media: [],
          _campName: p.camp?.name,
        } as any));

      const posts = [...enrichedPersonal, ...enrichedCamp]
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 50);

      // Keep the offline cache warm for the service worker's benefit.
      import('@/lib/feedCache').then(({ cacheFeedPosts }) => cacheFeedPosts(posts)).catch(() => {});

      return { posts, circleIds };
    },
  });
};
