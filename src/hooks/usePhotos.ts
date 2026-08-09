import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Photos.
 *
 * The Phase 3 migration adds `albums` and `album_media` and backfills them
 * from `post_media`. It has not been applied, and rather than ship a screen
 * that waits for it, this reads albums when they exist and otherwise derives
 * them from what is already there: every post that carries media is an album.
 *
 * That is not a placeholder — it is how the backfill defines an album anyway,
 * so the derived view shows the same photos in the same groups the real tables
 * will. When the migration lands, `useAlbums` starts returning real rows and
 * the fallback below can be deleted outright.
 */

export interface Photo {
  id: string;
  url: string;
  media_type: string;
  /** The post it came from, so a photo can link back to its context. */
  postId: string;
  created_at: string | null;
}

export interface Album {
  id: string;
  title: string;
  created_at: string | null;
  photos: Photo[];
  /** True while these are derived from posts rather than read from `albums`. */
  derived: boolean;
}

interface PostWithMedia {
  id: string;
  title: string | null;
  content: string | null;
  created_at: string | null;
  post_media: { id: string; url: string; media_type: string; position: number }[] | null;
}

const albumTitle = (post: PostWithMedia): string => {
  if (post.title?.trim()) return post.title.trim();

  const words = (post.content ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 6).join(' ');
  if (words) return words.length < (post.content ?? '').trim().length ? `${words}…` : words;

  return post.created_at
    ? new Date(post.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : 'Photos';
};

export const useAlbums = (profileId: string | undefined) =>
  useQuery({
    queryKey: ['albums', profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<Album[]> => {
      // The real tables, once they exist.
      const real = await supabase
        .from('albums' as never)
        .select('id, title, created_at, album_media(id, url, media_type, position, post_id)')
        .eq('owner_id', profileId!)
        .order('created_at', { ascending: false });

      if (!real.error && real.data) {
        type RealAlbum = {
          id: string; title: string | null; created_at: string | null;
          album_media: { id: string; url: string; media_type: string; position: number; post_id: string | null }[] | null;
        };
        return (real.data as unknown as RealAlbum[]).map(a => ({
          id: a.id,
          title: a.title ?? 'Photos',
          created_at: a.created_at,
          derived: false,
          photos: [...(a.album_media ?? [])]
            .sort((x, y) => x.position - y.position)
            .map(m => ({
              id: m.id, url: m.url, media_type: m.media_type,
              postId: m.post_id ?? '', created_at: a.created_at,
            })),
        }));
      }

      // Fallback: one album per post that carries media.
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, content, created_at, post_media(id, url, media_type, position)')
        .eq('author_id', profileId!)
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (error) throw error;

      return ((data ?? []) as PostWithMedia[])
        .filter(p => (p.post_media?.length ?? 0) > 0)
        .map(p => ({
          id: p.id,
          title: albumTitle(p),
          created_at: p.created_at,
          derived: true,
          photos: [...(p.post_media ?? [])]
            .sort((a, b) => a.position - b.position)
            .map(m => ({
              id: m.id, url: m.url, media_type: m.media_type,
              postId: p.id, created_at: p.created_at,
            })),
        }));
    },
  });

/** Every photo, newest first — the "all" grid above the albums. */
export const useAllPhotos = (profileId: string | undefined) => {
  const { data: albums, ...rest } = useAlbums(profileId);
  const photos = (albums ?? []).flatMap(a => a.photos).filter(p => p.media_type?.startsWith('image'));
  return { ...rest, data: photos };
};
