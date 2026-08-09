import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Listening — what someone has on right now.
 *
 * Spotify is the only one of the three with a real currently-playing endpoint,
 * so it is the only one that can ever be live. Apple Music's MusicKit does not
 * expose now-playing server-side and YouTube Music has no official API at all,
 * so those are manual shares and the schema says so via `is_live` rather than
 * pretending the three are symmetric.
 *
 * The live Spotify path is not wired yet — it needs an OAuth app and Spotify's
 * extended-API review, which is an external approval nobody here can hurry.
 * Everything else works today: you can share a track by hand, choose who sees
 * it, and it appears on your page and in the buddy list. When the review
 * clears, a poller writes the same `now_playing` row with `is_live` true and
 * the UI already knows what to do with it. See docs/spotify-integration.md.
 */

export const PROVIDERS = ['spotify', 'apple', 'youtube'] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_LABELS: Record<Provider, string> = {
  spotify: 'Spotify',
  apple: 'Apple Music',
  youtube: 'YouTube',
};

/** Only Spotify can report playback without being asked. */
export const PROVIDER_SUPPORTS_LIVE: Record<Provider, boolean> = {
  spotify: true,
  apple: false,
  youtube: false,
};

export const AUDIENCES = [
  { value: 'circles', label: 'Friends' },
  { value: 'circles_and_camps', label: 'Friends and group members' },
  { value: 'everyone', label: 'All members' },
] as const;

export type Audience = (typeof AUDIENCES)[number]['value'];

export interface NowPlaying {
  user_id: string;
  provider: Provider;
  track_title: string;
  artist: string;
  album: string | null;
  artwork_url: string | null;
  track_url: string | null;
  duration_ms: number | null;
  progress_ms: number | null;
  is_live: boolean;
  is_sharing: boolean;
  audience: Audience;
  updated_at: string;
}

export interface ListeningConnection {
  id: string;
  provider: Provider;
  provider_account_id: string | null;
  connected_at: string;
}

/**
 * The generated types predate these tables. The casts come out when types.ts
 * is regenerated; they are confined to this file so nothing else carries them.
 */
const table = (name: string) => supabase.from(name as never);

/** Someone's current track — yours, or a page you are visiting. RLS decides. */
export const useNowPlaying = (userId: string | undefined) =>
  useQuery({
    queryKey: ['now-playing', userId],
    enabled: !!userId,
    // Playback moves; a stale track is worse than a missing one.
    staleTime: 30_000,
    queryFn: async (): Promise<NowPlaying | null> => {
      const { data, error } = await table('now_playing')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle();
      // RLS returning nothing is the normal "not shared with you" case, not an
      // error worth surfacing.
      if (error) return null;
      return (data as unknown as NowPlaying) ?? null;
    },
  });

export const useMyConnections = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['listening-connections', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ListeningConnection[]> => {
      const { data, error } = await table('listening_connections')
        .select('id, provider, provider_account_id, connected_at')
        .eq('user_id', user!.id);
      if (error) return [];
      return (data ?? []) as unknown as ListeningConnection[];
    },
  });
};

export interface ShareInput {
  provider: Provider;
  track_title: string;
  artist: string;
  album?: string | null;
  track_url?: string | null;
}

export const useListeningActions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['now-playing'] });
    queryClient.invalidateQueries({ queryKey: ['listening-connections'] });
  };

  return {
    /** Post a track by hand. Turns sharing on — you asked for it to be seen. */
    share: useMutation({
      mutationFn: async (input: ShareInput) => {
        const { error } = await table('now_playing').upsert({
          user_id: user!.id,
          provider: input.provider,
          track_title: input.track_title.trim(),
          artist: input.artist.trim(),
          album: input.album?.trim() || null,
          track_url: input.track_url?.trim() || null,
          is_live: false,
          is_sharing: true,
          updated_at: new Date().toISOString(),
        } as never, { onConflict: 'user_id' } as never);
        if (error) throw error;
      },
      onSuccess: refresh,
    }),

    /** Pause or resume without losing the track or the audience setting. */
    setSharing: useMutation({
      mutationFn: async (is_sharing: boolean) => {
        const { error } = await table('now_playing')
          .update({ is_sharing } as never)
          .eq('user_id', user!.id);
        if (error) throw error;
      },
      onSuccess: refresh,
    }),

    setAudience: useMutation({
      mutationFn: async (audience: Audience) => {
        const { error } = await table('now_playing')
          .update({ audience } as never)
          .eq('user_id', user!.id);
        if (error) throw error;
      },
      onSuccess: refresh,
    }),

    /** Take it down entirely, rather than just hiding it. */
    clear: useMutation({
      mutationFn: async () => {
        const { error } = await table('now_playing').delete().eq('user_id', user!.id);
        if (error) throw error;
      },
      onSuccess: refresh,
    }),

    /**
     * Manual providers only. Spotify's row is written by the OAuth callback
     * once that exists, because it carries tokens this cannot produce.
     */
    connect: useMutation({
      mutationFn: async (provider: Provider) => {
        const { error } = await table('listening_connections')
          .insert({ user_id: user!.id, provider } as never);
        if (error) throw error;
      },
      onSuccess: refresh,
    }),

    disconnect: useMutation({
      mutationFn: async (provider: Provider) => {
        const { error } = await table('listening_connections')
          .delete()
          .eq('user_id', user!.id)
          .eq('provider', provider);
        if (error) throw error;
      },
      onSuccess: refresh,
    }),
  };
};
