import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Groups — the surface formerly called Camps.
 *
 * Tables stay `camps` / `camp_members` / `camp_posts`; only the words change.
 * The roles change with them: a new arrival could not tell whether a
 * "Trailblazer" outranked a "Firekeeper", which matters the moment someone
 * needs to know who can remove their post.
 */

export interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  visibility: string;
  member_count: number | null;
}

export interface Membership {
  camp_id: string;
  role: string;
  scout_ends_at: string | null;
}

/** Plain-language role names. The stored values are unchanged. */
export const roleLabel = (role: string): string =>
  ({
    firekeeper: 'Owner',
    trailblazer: 'Moderator',
    scout: 'Settling in',
  }[role] ?? 'Member');

export const useGroups = () =>
  useQuery({
    queryKey: ['groups'],
    queryFn: async (): Promise<GroupRow[]> => {
      const { data, error } = await supabase
        .from('camps')
        .select('id, name, description, cover_image_url, visibility, member_count')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

/** Which groups the signed-in user is in. Empty, not pending, when signed out. */
export const useMemberships = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['group-memberships', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Membership[]> => {
      const { data, error } = await supabase
        .from('camp_members')
        .select('camp_id, role, scout_ends_at')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });
};

export interface MyGroup extends Membership {
  group: GroupRow;
}

export const useMyGroups = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-groups', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MyGroup[]> => {
      const { data: memberships, error } = await supabase
        .from('camp_members')
        .select('camp_id, role, scout_ends_at')
        .eq('user_id', user!.id);
      if (error) throw error;
      if (!memberships?.length) return [];

      const { data: groups } = await supabase
        .from('camps')
        .select('id, name, description, cover_image_url, visibility, member_count')
        .in('id', memberships.map(m => m.camp_id))
        .eq('is_active', true);

      const byId = new Map((groups ?? []).map(g => [g.id, g as GroupRow]));

      // A membership whose group is gone or deactivated is dropped rather than
      // rendered as a placeholder row nobody can open.
      return memberships
        .map(m => {
          const group = byId.get(m.camp_id);
          return group ? { ...m, group } : null;
        })
        .filter((m): m is MyGroup => !!m);
    },
  });
};

/** Days left in the settling-in window, or null once it is over. */
export const settlingDaysLeft = (endsAt: string | null): number | null => {
  if (!endsAt) return null;
  const days = Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86400000);
  return days > 0 ? days : null;
};
