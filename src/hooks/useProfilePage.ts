import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MiniProfile {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  default_avatar_key: string | null;
}

export interface TopFriend {
  friend_id: string;
  position: number;
  profile: MiniProfile;
}

export interface WallNote {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  profile?: MiniProfile;
}

export interface PageProfile {
  id: string;
  display_name: string;
  handle: string;
  bio: string | null;
  mantra: string | null;
  avatar_url: string | null;
  default_avatar_key: string | null;
  accent_color: string | null;
  cabin_mood: string | null;
  city: string | null;
  created_at: string | null;
  currently_type: string | null;
  currently_value: string | null;
  pinned_song_title: string | null;
  pinned_song_artist: string | null;
  pinned_song_preview_url: string | null;
}

const FIELDS =
  'id, display_name, handle, bio, mantra, avatar_url, default_avatar_key, accent_color, cabin_mood, city, created_at, currently_type, currently_value, pinned_song_title, pinned_song_artist, pinned_song_preview_url';

/**
 * The customizer's theme settings live in a reserved `cabin_widgets` row
 * rather than new profile columns.
 *
 * That table is already the per-user customization store, already has a jsonb
 * payload, and already carries the right RLS. Adding columns would mean another
 * migration, and the Phase 3 migrations have not landed — so the page theme
 * would have shipped dead. This ships working today. The row is filtered out of
 * the module list so it never renders as a module.
 */
export const PAGE_THEME_WIDGET = 'page_theme';

export interface PageTheme {
  /** HSL triplets, matching the token format in index.css. */
  background?: string;
  card?: string;
  foreground?: string;
  /** A full CSS colour — accent also lives on profiles.accent_color, which
   *  post cards already read, so it is stored in both places. */
  accent?: string;
  /** The loud preset: patterned ground, hard borders, display type. */
  full2006?: boolean;
}

/** The profile being viewed — by handle, or the signed-in user when omitted. */
export const usePageProfile = (handle?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['page-profile', handle ?? user?.id],
    enabled: !!handle || !!user,
    queryFn: async (): Promise<PageProfile | null> => {
      const query = supabase.from('profiles').select(FIELDS);
      const { data, error } = handle
        ? await query.eq('handle', handle).maybeSingle()
        : await query.eq('id', user!.id).maybeSingle();
      if (error) throw error;
      return data as PageProfile | null;
    },
  });
};

/**
 * Page modules, reusing the cabin_widgets table as-is — it is already
 * (user_id, widget_type, widget_data jsonb, position), which is exactly the
 * shape the handoff's Page Modules need.
 */
export const usePageModules = (profileId: string | undefined) =>
  useQuery({
    queryKey: ['page-modules', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cabin_widgets')
        .select('id, widget_type, widget_data, position')
        .eq('user_id', profileId!)
        .neq('widget_type', PAGE_THEME_WIDGET)
        .order('position');
      if (error) throw error;
      return data ?? [];
    },
  });

/** The page owner's theme, read so a visitor sees the page as they built it. */
export const usePageTheme = (profileId: string | undefined) =>
  useQuery({
    queryKey: ['page-theme', profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<PageTheme | null> => {
      const { data, error } = await supabase
        .from('cabin_widgets')
        .select('widget_data')
        .eq('user_id', profileId!)
        .eq('widget_type', PAGE_THEME_WIDGET)
        .maybeSingle();
      if (error) return null;
      return (data?.widget_data as PageTheme | null) ?? null;
    },
  });

/**
 * Owner-only view count. MySpace put this on the page for everyone; the
 * product promise here is "no metrics that make you feel small", so it is
 * shown to the page's owner and nobody else.
 */
export const useOwnVisitCount = (profileId: string | undefined, isOwner: boolean) =>
  useQuery({
    queryKey: ['visits', profileId],
    enabled: !!profileId && isOwner,
    queryFn: async (): Promise<number> => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('cabin_visits')
        .select('visit_count')
        .eq('profile_id', profileId!)
        .gte('visit_date', since);
      if (error) throw error;
      return (data ?? []).reduce((sum, r) => sum + (r.visit_count ?? 0), 0);
    },
  });

/**
 * Top friends. Returns an empty list until the Phase 3 migration lands rather
 * than throwing, so the section simply does not render.
 */
export const useTopFriends = (profileId: string | undefined) =>
  useQuery({
    queryKey: ['top-friends', profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<TopFriend[]> => {
      const { data, error } = await supabase
        .from('top_friends' as never)
        .select('friend_id, position')
        .eq('owner_id', profileId!)
        .order('position');
      if (error) return [];

      const rows = (data ?? []) as unknown as { friend_id: string; position: number }[];
      if (rows.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url, default_avatar_key')
        .in('id', rows.map(r => r.friend_id));

      const byId = new Map((profiles ?? []).map(p => [p.id, p as MiniProfile]));
      return rows
        .map(r => ({ ...r, profile: byId.get(r.friend_id) }))
        .filter((r): r is TopFriend => !!r.profile);
    },
  });

/** Wall notes. Same graceful-empty behaviour until the table exists. */
export const useWallNotes = (profileId: string | undefined) =>
  useQuery({
    queryKey: ['wall-notes', profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<WallNote[]> => {
      const { data, error } = await supabase
        .from('wall_notes' as never)
        .select('id, author_id, content, created_at')
        .eq('profile_id', profileId!)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) return [];

      const rows = (data ?? []) as unknown as { id: string; author_id: string; content: string; created_at: string }[];
      if (rows.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url, default_avatar_key')
        .in('id', [...new Set(rows.map(r => r.author_id))]);

      const byId = new Map((profiles ?? []).map(p => [p.id, p as MiniProfile]));
      return rows.map(r => ({ ...r, profile: byId.get(r.author_id) }));
    },
  });
