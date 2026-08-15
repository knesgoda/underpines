import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Everything the shell needs, in one request.
 *
 * Before this, an authenticated boot made nine requests before anything
 * rendered, and read `profiles` four separate times for the same row — the
 * viewer profile, the theme, the onboarding guard and the age gate each
 * fetching it independently. Two of the nine were chained behind another, so
 * there were two extra round trips of latency on top of the count.
 *
 * There is deliberately no fallback to those nine queries. Keeping them alive
 * as a dead-until-broken path means the untested one is the one that runs on
 * the day something goes wrong; if the RPC fails, the app shows an error state
 * exactly as it would have if the profile read had failed before.
 */

/** The key NavigationContext has always written. Defined here now so the
 *  reader and the writer cannot drift apart. */
export const CAMPFIRE_LAST_SEEN_KEY = 'campfire_last_seen';

export interface BootProfile {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  default_avatar_key: string | null;
  accent_color: string | null;
  cabin_mood: string | null;
  bio: string | null;
  created_at: string | null;
  theme: string | null;
  messenger_skin: string | null;
  onboarding_completed_at: string | null;
  is_age_verified: boolean | null;
  age_bracket: string | null;
}

export interface BootSuspension {
  reason: string;
  suspended_until: string | null;
  is_permanent: boolean;
}

export interface BootState {
  profile: BootProfile | null;
  roles: string[];
  is_admin: boolean;
  suspension: BootSuspension | null;
  unread_notifications: number;
  has_unread_messages: boolean;
}

/**
 * "Last seen" is client state, so the server cannot know it — it goes in as an
 * argument. Read once per boot rather than per render, because it is part of
 * the query key and a fresh string each time would refetch forever.
 */
const readCampfiresSeenAt = (): string | null => {
  try {
    return localStorage.getItem(CAMPFIRE_LAST_SEEN_KEY);
  } catch {
    // Private browsing with storage disabled. Treat as never seen.
    return null;
  }
};

export const useBootState = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['boot-state', user?.id],
    enabled: !!user,
    // The shell blocks on this, so a stale-while-revalidate window is the
    // difference between an instant navigation and a spinner.
    staleTime: 60_000,
    queryFn: async (): Promise<BootState> => {
      // types.ts is generated from the live database and predates this
      // function, so the generated union does not list it yet. The cast comes
      // out when types are regenerated after the migration lands.
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>)(
        'get_boot_state',
        { _campfires_seen_at: readCampfiresSeenAt() },
      );
      if (error) throw error;

      const state = data as unknown as Partial<BootState> | null;
      return {
        profile: state?.profile ?? null,
        roles: state?.roles ?? [],
        is_admin: state?.is_admin ?? false,
        suspension: state?.suspension ?? null,
        unread_notifications: state?.unread_notifications ?? 0,
        has_unread_messages: state?.has_unread_messages ?? false,
      };
    },
  });
};
