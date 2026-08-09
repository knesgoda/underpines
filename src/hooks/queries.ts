import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBootState } from '@/hooks/useBootState';

/**
 * Shared read hooks for the ported screens.
 *
 * The QueryClient has been configured in App.tsx since the beginning but had
 * no callers — every component hand-rolled useEffect + useState, which is why
 * the same profile was fetched from five places on a single boot. Screens
 * ported from here on use these instead, so identical reads dedupe and survive
 * a navigation.
 */

export interface ViewerProfile {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  default_avatar_key: string | null;
  accent_color: string | null;
  cabin_mood: string | null;
  bio: string | null;
  is_pines_plus: boolean | null;
  created_at: string | null;
}

/**
 * The signed-in user's own profile.
 *
 * Reads the boot payload rather than fetching, so the five callers of this
 * hook cost nothing beyond the one request the shell already makes. The
 * signature is unchanged, so nothing that consumes it had to move.
 */
export const useViewerProfile = () => {
  const boot = useBootState();
  return { ...boot, data: (boot.data?.profile ?? null) as ViewerProfile | null };
};

/** Accepted circle member ids for the signed-in user. */
export const useCircleIds = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['circle-ids', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('circles')
        .select('requester_id, requestee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user!.id},requestee_id.eq.${user!.id}`);
      if (error) throw error;
      return (data || []).map(c => (c.requester_id === user!.id ? c.requestee_id : c.requester_id));
    },
  });
};

/** How many people this account has brought in, for the identity card. */
export const useInviteeCount = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['invitee-count', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<number> => {
      const { data: invite } = await supabase
        .from('invites')
        .select('id')
        .eq('inviter_id', user!.id)
        .maybeSingle();
      if (!invite) return 0;
      const { count } = await supabase
        .from('invite_uses')
        .select('*', { count: 'exact', head: true })
        .eq('invite_id', invite.id);
      return count ?? 0;
    },
  });
};
