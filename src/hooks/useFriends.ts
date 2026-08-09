import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { MiniProfile } from '@/hooks/useProfilePage';

/**
 * Friends, requests, blocks and mutes.
 *
 * The table is still `circles` — renaming it would be a migration for a word,
 * and the migrations are not landing. What changes is the vocabulary on screen:
 * "your circles" and "the trail" told a new arrival nothing about what the
 * button did, which is half of why the product did not stick.
 *
 * Replaces the hand-rolled useEffect + five useStates the page carried, so the
 * lists survive a navigation and every mutation refreshes them from one place.
 */

export interface Friend extends MiniProfile {
  /** Row id in `circles`, needed to accept, decline or withdraw. */
  circleId: string;
  direction: 'sent' | 'received';
}

export interface Restricted {
  id: string;
  display_name: string;
  handle: string;
  rowId: string;
}

export interface FriendLists {
  friends: Friend[];
  incoming: Friend[];
  outgoing: Friend[];
  blocked: Restricted[];
  muted: Restricted[];
}

const EMPTY: FriendLists = { friends: [], incoming: [], outgoing: [], blocked: [], muted: [] };

const MINI = 'id, display_name, handle, avatar_url, default_avatar_key';

export const useFriendLists = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['friend-lists', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<FriendLists> => {
      const uid = user!.id;

      const [{ data: circles }, { data: blockRows }, { data: muteRows }] = await Promise.all([
        supabase.from('circles').select('*').or(`requester_id.eq.${uid},requestee_id.eq.${uid}`),
        supabase.from('blocks').select('id, blocked_id').eq('blocker_id', uid),
        supabase.from('mutes').select('id, muted_id').eq('muter_id', uid),
      ]);

      const ids = new Set<string>();
      (circles ?? []).forEach(c => ids.add(c.requester_id === uid ? c.requestee_id : c.requester_id));
      (blockRows ?? []).forEach(b => ids.add(b.blocked_id));
      (muteRows ?? []).forEach(m => ids.add(m.muted_id));
      if (ids.size === 0) return EMPTY;

      const { data: profiles } = await supabase.from('profiles').select(MINI).in('id', [...ids]);
      const byId = new Map((profiles ?? []).map(p => [p.id, p as MiniProfile]));

      const result: FriendLists = { friends: [], incoming: [], outgoing: [], blocked: [], muted: [] };
      const seen = new Set<string>();

      (circles ?? []).forEach(c => {
        const otherId = c.requester_id === uid ? c.requestee_id : c.requester_id;
        const profile = byId.get(otherId);
        if (!profile) return;

        const entry: Friend = {
          ...profile,
          circleId: c.id,
          direction: c.requester_id === uid ? 'sent' : 'received',
        };

        if (c.status === 'accepted') {
          // Both directions can exist for one pair; show the person once.
          if (seen.has(otherId)) return;
          seen.add(otherId);
          result.friends.push(entry);
        } else if (c.status === 'pending') {
          (entry.direction === 'sent' ? result.outgoing : result.incoming).push(entry);
        }
      });

      const restricted = (rows: { id: string; otherId: string }[]): Restricted[] =>
        rows
          .map(({ id, otherId }) => {
            const p = byId.get(otherId);
            return p ? { id: p.id, display_name: p.display_name, handle: p.handle, rowId: id } : null;
          })
          .filter((r): r is Restricted => !!r);

      result.blocked = restricted((blockRows ?? []).map(b => ({ id: b.id, otherId: b.blocked_id })));
      result.muted = restricted((muteRows ?? []).map(m => ({ id: m.id, otherId: m.muted_id })));

      result.friends.sort((a, b) => a.display_name.localeCompare(b.display_name));
      return result;
    },
  });
};

/**
 * People your friends know that you do not.
 *
 * Generalises what CircleSuggestions did for one inviter: two hops out from
 * you, minus yourself, anyone you already have any circle row with, and anyone
 * you have blocked. Ranked by how many of your friends know them, which is the
 * only signal available and a genuinely useful one.
 */
export interface Suggestion extends MiniProfile {
  mutuals: number;
}

export const useSuggestions = (limit = 12) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['friend-suggestions', user?.id, limit],
    enabled: !!user,
    queryFn: async (): Promise<Suggestion[]> => {
      const uid = user!.id;

      const [{ data: mine }, { data: blockRows }] = await Promise.all([
        supabase.from('circles').select('requester_id, requestee_id, status')
          .or(`requester_id.eq.${uid},requestee_id.eq.${uid}`),
        supabase.from('blocks').select('blocked_id').eq('blocker_id', uid),
      ]);

      // Anyone already connected in any state — accepted, pending or declined —
      // is not a suggestion. Re-suggesting someone you declined is a bug people
      // notice immediately.
      const known = new Set<string>([uid]);
      (mine ?? []).forEach(c => known.add(c.requester_id === uid ? c.requestee_id : c.requester_id));
      (blockRows ?? []).forEach(b => known.add(b.blocked_id));

      const friendIds = (mine ?? [])
        .filter(c => c.status === 'accepted')
        .map(c => (c.requester_id === uid ? c.requestee_id : c.requester_id));
      if (friendIds.length === 0) return [];

      const { data: theirs } = await supabase
        .from('circles')
        .select('requester_id, requestee_id')
        .eq('status', 'accepted')
        .or(`requester_id.in.(${friendIds.join(',')}),requestee_id.in.(${friendIds.join(',')})`);

      const counts = new Map<string, number>();
      (theirs ?? []).forEach(c => {
        // Whichever end is not one of my friends is the candidate.
        [c.requester_id, c.requestee_id].forEach(id => {
          if (known.has(id) || friendIds.includes(id)) return;
          counts.set(id, (counts.get(id) ?? 0) + 1);
        });
      });

      const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
      if (ranked.length === 0) return [];

      const { data: profiles } = await supabase.from('profiles').select(MINI).in('id', ranked.map(([id]) => id));
      const byId = new Map((profiles ?? []).map(p => [p.id, p as MiniProfile]));

      return ranked
        .map(([id, mutuals]) => {
          const p = byId.get(id);
          return p ? { ...p, mutuals } : null;
        })
        .filter((s): s is Suggestion => !!s);
    },
  });
};

/** Every friend mutation, sharing one invalidation so the lists never drift. */
export const useFriendActions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['friend-lists'] });
    queryClient.invalidateQueries({ queryKey: ['friend-suggestions'] });
    queryClient.invalidateQueries({ queryKey: ['circle-ids'] });
  };

  const stamp = () => ({ updated_at: new Date().toISOString() });

  return {
    accept: useMutation({
      mutationFn: async (circleId: string) => {
        const { error } = await supabase.from('circles')
          .update({ status: 'accepted', ...stamp() }).eq('id', circleId);
        if (error) throw error;
      },
      onSuccess: refresh,
    }),

    decline: useMutation({
      mutationFn: async (circleId: string) => {
        const { error } = await supabase.from('circles')
          .update({ status: 'declined', ...stamp() }).eq('id', circleId);
        if (error) throw error;
      },
      onSuccess: refresh,
    }),

    withdraw: useMutation({
      mutationFn: async (circleId: string) => {
        const { error } = await supabase.from('circles').delete().eq('id', circleId);
        if (error) throw error;
      },
      onSuccess: refresh,
    }),

    request: useMutation({
      mutationFn: async (profileId: string) => {
        const { error } = await supabase.from('circles')
          .insert({ requester_id: user!.id, requestee_id: profileId });
        if (error) throw error;
        await supabase.from('notifications').insert({
          recipient_id: profileId,
          notification_type: 'circle_request',
          actor_id: user!.id,
        });
      },
      onSuccess: refresh,
    }),

    block: useMutation({
      mutationFn: async (profileId: string) => {
        const { error } = await supabase.from('blocks')
          .insert({ blocker_id: user!.id, blocked_id: profileId });
        if (error) throw error;
        // Blocking also ends the friendship, in both directions.
        await supabase.from('circles').update({ status: 'declined' }).or(
          `and(requester_id.eq.${user!.id},requestee_id.eq.${profileId}),` +
          `and(requester_id.eq.${profileId},requestee_id.eq.${user!.id})`,
        );
      },
      onSuccess: refresh,
    }),

    mute: useMutation({
      mutationFn: async (profileId: string) => {
        const { error } = await supabase.from('mutes')
          .insert({ muter_id: user!.id, muted_id: profileId });
        if (error) throw error;
      },
      onSuccess: refresh,
    }),

    unblock: useMutation({
      mutationFn: async (rowId: string) => {
        const { error } = await supabase.from('blocks').delete().eq('id', rowId);
        if (error) throw error;
      },
      onSuccess: refresh,
    }),

    unmute: useMutation({
      mutationFn: async (rowId: string) => {
        const { error } = await supabase.from('mutes').delete().eq('id', rowId);
        if (error) throw error;
      },
      onSuccess: refresh,
    }),
  };
};
