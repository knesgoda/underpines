import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAlbums, isImage, type Album } from '@/hooks/usePhotos';

/**
 * The featured picks on someone's page: which albums go on the corkboard, in
 * what order, with which photo showing, and how many friends the page pins up.
 *
 * Both are presentation choices layered over data that already exists — albums
 * and friendships are untouched. A page with nothing chosen falls back to the
 * first four albums, so the corkboard is never empty for someone who has
 * photos but has never opened the editor.
 */

export interface FeaturedAlbum {
  album: Album;
  /** The cover the owner picked, when they picked one. */
  coverUrl: string | null;
  /** True when this came from the owner's own selection rather than the fallback. */
  chosen: boolean;
}

export interface FeaturedAlbumRow {
  album_id: string;
  position: number;
  cover_media_id: string | null;
}

/** The owner's raw picks — what the editor edits. */
export const useFeaturedAlbumRows = (profileId: string | undefined) =>
  useQuery({
    queryKey: ['featured-albums', profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<FeaturedAlbumRow[]> => {
      const { data, error } = await supabase
        .from('featured_albums')
        .select('album_id, position, cover_media_id')
        .eq('owner_id', profileId!)
        .order('position');
      if (error) throw error;
      return data ?? [];
    },
  });

/** Album covers resolve to a real photo: the chosen one, else the first. */
const coverOf = (album: Album, coverMediaId: string | null): string | null => {
  const usable = album.photos.filter(p => isImage(p.media_type));
  if (coverMediaId) {
    const picked = usable.find(p => p.id === coverMediaId);
    if (picked) return picked.url;
  }
  return usable[0]?.url ?? null;
};

/** The corkboard's albums, resolved and ordered. */
export const useFeaturedAlbums = (profileId: string | undefined, limit = 4) => {
  const albumsQuery = useAlbums(profileId);
  const rowsQuery = useFeaturedAlbumRows(profileId);

  const albums = albumsQuery.data ?? [];
  const rows = rowsQuery.data ?? [];
  const byId = new Map(albums.map(a => [a.id, a]));

  const chosen: FeaturedAlbum[] = rows
    .map(r => {
      const album = byId.get(r.album_id);
      if (!album) return null;
      return { album, coverUrl: coverOf(album, r.cover_media_id), chosen: true };
    })
    .filter((a): a is FeaturedAlbum => !!a);

  const featured =
    chosen.length > 0
      ? chosen.slice(0, limit)
      : albums.slice(0, limit).map(album => ({ album, coverUrl: coverOf(album, null), chosen: false }));

  return {
    featured,
    totalAlbums: albums.length,
    isLoading: albumsQuery.isLoading || rowsQuery.isLoading,
  };
};

/** Replace the whole featured set — a handful of rows, so wholesale is honest. */
export const useSaveFeaturedAlbums = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (picks: { album_id: string; cover_media_id: string | null }[]) => {
      const { error: delError } = await supabase
        .from('featured_albums')
        .delete()
        .eq('owner_id', userId!);
      if (delError) throw delError;

      if (picks.length === 0) return;

      const { error } = await supabase.from('featured_albums').insert(
        picks.map((p, i) => ({
          owner_id: userId!,
          album_id: p.album_id,
          cover_media_id: p.cover_media_id,
          position: i,
        })),
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['featured-albums'] }),
  });
};

export const FEATURED_FRIEND_COUNTS = [4, 8, 12] as const;
export type FeaturedFriendCount = (typeof FEATURED_FRIEND_COUNTS)[number];

/** How many friends this page pins up. Persisted per person on their profile. */
export const useSaveFeaturedFriendsCount = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (count: FeaturedFriendCount) => {
      const { error } = await supabase
        .from('profiles')
        .update({ featured_friends_count: count })
        .eq('id', userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-profile'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};
