import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { primeSignedMediaUrls } from '@/lib/signedMedia';
import type { PostWithAuthor } from '@/components/feed/PostCard';

/**
 * The chronological feed.
 *
 * This used to be a three-step waterfall — the social graph, then the posts,
 * then a third round trip for authors, reactions and media. The author,
 * reaction and media rows now arrive embedded in the post queries themselves
 * (the foreign keys PostgREST needs for that have always existed), and the
 * social graph is cached under its own key, so a fresh feed visit costs two
 * round trips and a refetch inside the graph's stale window costs one.
 */

/** Who the viewer follows, mutes and camps with. Changes rarely relative to
 *  the feed itself, so it is cached separately and reused across refetches. */
const FEED_GRAPH_STALE_MS = 5 * 60 * 1000;

interface FeedGraph {
  circleIds: string[];
  mutedIds: string[];
  campIds: string[];
}

const fetchFeedGraph = async (uid: string): Promise<FeedGraph> => {
  const [circleResult, muteResult, campMemberResult] = await Promise.all([
    supabase
      .from('circles')
      .select('requester_id, requestee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${uid},requestee_id.eq.${uid}`),
    supabase.from('mutes').select('muted_id').eq('muter_id', uid),
    supabase.from('camp_members').select('camp_id').eq('user_id', uid),
  ]);

  return {
    circleIds: (circleResult.data || []).map(c =>
      c.requester_id === uid ? c.requestee_id : c.requester_id
    ),
    mutedIds: (muteResult.data || []).map(m => m.muted_id),
    campIds: (campMemberResult.data || []).map(cm => cm.camp_id),
  };
};

const AUTHOR_COLUMNS = 'id, display_name, handle, accent_color, cabin_mood, avatar_url, default_avatar_key';

/** The fields the camp_posts select string below actually returns. */
interface CampPostRow {
  id: string;
  author_id: string;
  camp_id: string;
  content: string | null;
  post_type: string | null;
  created_at: string;
  author: PostWithAuthor['author'];
  camp: { name: string } | null;
  place_name: string | null;
  place_lat: number | null;
  place_lng: number | null;
}

/** Where opening a feed item goes: camp posts have no /post/:id detail page,
 *  so they land on their camp instead. */
export const feedPostTarget = (post: PostWithAuthor): string =>
  post._isCampPost ? (post._campId ? `/camps/${post._campId}` : '/camps/mine') : `/post/${post.id}`;

export const useFeedPosts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['feed', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<{ posts: PostWithAuthor[]; circleIds: string[] }> => {
      const uid = user!.id;

      const { circleIds, mutedIds, campIds } = await queryClient.fetchQuery({
        queryKey: ['feed-graph', uid],
        queryFn: () => fetchFeedGraph(uid),
        staleTime: FEED_GRAPH_STALE_MS,
      });

      const muted = new Set(mutedIds);
      const allowedAuthorIds = [uid, ...circleIds];

      const [postsResult, campPostsResult] = await Promise.all([
        supabase
          .from('posts')
          .select(`*, author:profiles!posts_author_id_fkey(${AUTHOR_COLUMNS}), reactions(post_id, reaction_type, user_id), post_media(*)`)
          .eq('is_published', true)
          .in('author_id', allowedAuthorIds)
          .order('created_at', { ascending: false })
          .order('position', { referencedTable: 'post_media' })
          .limit(50),
        campIds.length > 0
          ? supabase
              .from('camp_posts')
              .select(`*, camp:camps(name), author:profiles!camp_posts_author_id_fkey(${AUTHOR_COLUMNS})`)
              .in('camp_id', campIds)
              .eq('is_published', true)
              .order('created_at', { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [] as CampPostRow[] }),
      ]);

      // The generated types cannot parse a select string built from a
      // constant, so the embedded rows come back untyped; these are the shapes
      // the two select strings actually produce.
      const allPosts = (postsResult.data || []) as unknown as PostWithAuthor[];
      const campPosts = (campPostsResult.data || []) as unknown as CampPostRow[];

      const enrichedPersonal: PostWithAuthor[] = allPosts
        .filter(p => !muted.has(p.author_id))
        .map(p => ({
          ...p,
          reactions: p.reactions ?? [],
          post_media: p.post_media ?? [],
        }));

      const enrichedCamp: PostWithAuthor[] = campPosts
        .filter(p => !muted.has(p.author_id))
        .map(p => ({
          id: p.id,
          author_id: p.author_id,
          content: p.content,
          title: null,
          post_type: p.post_type || 'spark',
          is_published: true,
          created_at: p.created_at,
          is_quote_post: false,
          quoted_post_id: null,
          place_name: p.place_name ?? null,
          place_lat: p.place_lat ?? null,
          place_lng: p.place_lng ?? null,
          author: p.author,
          reactions: [],
          post_media: [],
          _isCampPost: true,
          _campId: p.camp_id,
          _campName: p.camp?.name,
        }));

      const posts = [...enrichedPersonal, ...enrichedCamp]
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 50);

      // One signing request now covers every image on the screen; the
      // <MediaImage>s that mount in a moment join it instead of each firing
      // their own.
      primeSignedMediaUrls(
        posts.flatMap(p => [
          p.image_url,
          ...(p.post_media ?? []).map(m => m.url),
        ]),
      );

      // Keep the offline cache warm for the service worker's benefit.
      import('@/lib/feedCache').then(({ cacheFeedPosts }) => cacheFeedPosts(posts)).catch(() => {});

      return { posts, circleIds };
    },
  });
};
