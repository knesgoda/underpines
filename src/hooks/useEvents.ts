import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Events, and who is coming.
 *
 * `event_responses` predates `events` by some margin — it existed with no
 * parent table to point at until the Phase 3 migration gave it one, a foreign
 * key and a `status`. The three statuses are all it accepts:
 * going / interested / cannot.
 */

export type Rsvp = 'going' | 'interested' | 'cannot';

export const RSVP_LABELS: Record<Rsvp, string> = {
  going: 'Going',
  interested: 'Maybe',
  cannot: "Can't",
};

export interface EventRow {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  host_id: string;
  camp_id: string | null;
}

export interface EventWithRsvps extends EventRow {
  going: number;
  /** The signed-in user's own answer, if they have given one. */
  mine: Rsvp | null;
}

/** Upcoming events, soonest first, with RSVP counts folded in. */
export const useUpcomingEvents = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['events', 'upcoming', user?.id],
    queryFn: async (): Promise<EventWithRsvps[]> => {
      const { data: events, error } = await supabase
        .from('events')
        .select('id, title, description, location, starts_at, ends_at, host_id, camp_id')
        // An event that started an hour ago is still happening; only drop the
        // ones whose end has passed, falling back to the start when open-ended.
        .gte('starts_at', new Date(Date.now() - 6 * 3600_000).toISOString())
        .order('starts_at');
      if (error) throw error;
      if (!events?.length) return [];

      const { data: responses } = await supabase
        .from('event_responses')
        .select('event_id, user_id, status')
        .in('event_id', events.map(e => e.id));

      const going = new Map<string, number>();
      const mine = new Map<string, Rsvp>();
      (responses ?? []).forEach(r => {
        if (r.status === 'going') going.set(r.event_id, (going.get(r.event_id) ?? 0) + 1);
        if (user && r.user_id === user.id) mine.set(r.event_id, r.status as Rsvp);
      });

      return events.map(e => ({
        ...e,
        going: going.get(e.id) ?? 0,
        mine: mine.get(e.id) ?? null,
      }));
    },
  });
};

export const useCreateEvent = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: {
      title: string;
      description: string | null;
      location: string | null;
      starts_at: string;
      ends_at: string | null;
      camp_id: string | null;
    }) => {
      const { data, error } = await supabase
        .from('events')
        .insert({ ...event, host_id: user!.id })
        .select('id')
        .single();
      if (error) throw error;

      // The host is going to their own event. Saying so up front means the
      // count is never a lonely zero on a real event.
      await supabase.from('event_responses').insert({
        event_id: data.id,
        user_id: user!.id,
        status: 'going',
      });

      return data.id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });
};

export const useRsvp = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: Rsvp }) => {
      // (event_id, user_id) is unique, so changing your mind is an upsert
      // rather than a second row.
      const { error } = await supabase
        .from('event_responses')
        .upsert(
          { event_id: eventId, user_id: user!.id, status },
          { onConflict: 'event_id,user_id' },
        );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });
};
