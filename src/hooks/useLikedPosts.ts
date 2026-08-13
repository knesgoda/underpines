import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PostWithAuthor } from '@/components/feed/PostCard';

/**
 * The Likes tab: posts this person reacted to, newest reaction first.
 *
 * Nothing new is stored — reactions already exist, and RLS already decides
 * which of those posts a visitor may see, so a post they cannot see simply
 * does not come back rather than showing as a gap.
 */
export const useLikedPosts = (profileId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: ['liked-posts', profileId],
    enabled: !!profileId && enabled,
    queryFn: async (): Promise<PostWithAuthor[]> => {
      const { data: reacted, error } = await supabase
        .from('reactions')
        .select('post_id, created_at')
        .eq('user_id', profileId!)
        .order('created_at', { ascending: false })
        .limit(40);
      if (error) throw error;

      const ids = [...new Set((reacted ?? []).map(r => r.post_id))];
      if (ids.length === 0) return [];

      const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .in('id', ids)
        .eq('is_published', true);
      if (!posts || posts.length === 0) return [];

      const authorIds = [...new Set(posts.map(p => p.author_id))];
      const [{ data: authors }, { data: media }, { data: reactions }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, display_name, handle, accent_color, cabin_mood, avatar_url, default_avatar_key')
          .in('id', authorIds),
        supabase.from('post_media').select('*').in('post_id', posts.map(p => p.id)),
        supabase.from('reactions').select('post_id, reaction_type, user_id').in('post_id', posts.map(p => p.id)),
      ]);

      const byAuthor = new Map((authors ?? []).map(a => [a.id, a]));
      const order = new Map(ids.map((id, i) => [id, i]));

      return posts
        .map(p => ({
          ...p,
          created_at: p.created_at || '',
          author: byAuthor.get(p.author_id) ?? undefined,
          post_media: media?.filter(m => m.post_id === p.id) || [],
          reactions: reactions?.filter(r => r.post_id === p.id) || [],
        }))
        .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)) as PostWithAuthor[];
    },
  });
