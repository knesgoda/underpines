import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Photos.
 *
 * Albums group existing media rather than replacing it: a photo stays attached
 * to the post it was shared in and also appears in an album, so nothing is
 * moved and nothing can be lost.
 *
 * This used to carry a second code path that derived albums by grouping
 * `post_media` per post, for the window before the albums tables existed. They
 * exist now and are backfilled, so the fallback is gone — it was always meant
 * to be temporary, and the branch nobody exercises is the branch that rots.
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
}

export const useAlbums = (profileId: string | undefined) =>
  useQuery({
    queryKey: ['albums', profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<Album[]> => {
      const { data, error } = await supabase
        .from('albums')
        .select('id, title, created_at, album_media(id, position, post_media(id, url, media_type, post_id))')
        .eq('owner_id', profileId!)
        .order('created_at', { ascending: false });
      if (error) throw error;

      return (data ?? []).map(album => ({
        id: album.id,
        title: album.title ?? 'Photos',
        created_at: album.created_at,
        photos: [...(album.album_media ?? [])]
          .sort((a, b) => a.position - b.position)
          .flatMap(entry => {
            // album_media -> post_media is the join that carries the file; a
            // row whose media was deleted is dropped rather than rendered as a
            // broken image.
            const media = entry.post_media;
            if (!media) return [];
            return [{
              id: media.id,
              url: media.url,
              media_type: media.media_type,
              postId: media.post_id,
              created_at: album.created_at,
            }];
          }),
      }));
    },
  });

/**
 * Is this row something an `<img>` can render?
 *
 * `post_media.media_type` stores the app's own words — 'photo' and 'video' —
 * not MIME types. An earlier version of this filtered on
 * `startsWith('image')`, which matches neither, so the Photos surface came up
 * empty against all 25 real rows while looking perfectly healthy in a
 * signed-out smoke test. Anything that is not explicitly a video is treated as
 * an image, so a new media_type shows up rather than silently vanishing.
 */
export const isImage = (mediaType: string | null | undefined) =>
  !!mediaType && mediaType !== 'video';

/** Every photo, newest first — the "all" grid above the albums. */
export const useAllPhotos = (profileId: string | undefined) => {
  const { data: albums, ...rest } = useAlbums(profileId);
  const photos = (albums ?? []).flatMap(a => a.photos).filter(p => isImage(p.media_type));
  return { ...rest, data: photos };
};
