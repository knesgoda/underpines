import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PineTreeLoading from '@/components/PineTreeLoading';
import StatePanel from '@/components/StatePanel';
import { EVENTS_ENABLED } from '@/lib/features';
import '@/styles/groups.css';

/**
 * Events.
 *
 * The `events` and `event_responses` tables arrive with the Phase 3 migration,
 * which has not been applied. This is deliberately the thinnest honest thing:
 * it reads, it renders what it finds, and creating is disabled behind
 * EVENTS_ENABLED rather than offering a button that fails.
 *
 * Untestable against real rows until the schema lands, and this comment is
 * here so nobody mistakes a passing smoke test for a working feature.
 */

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  location: string | null;
}

const useEvents = () =>
  useQuery({
    queryKey: ['events'],
    queryFn: async (): Promise<EventRow[]> => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, description, starts_at, location')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at');
      if (error) throw error;
      return data ?? [];
    },
  });

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });

const Events = () => {
  const { data: events, isLoading } = useEvents();

  if (isLoading) return <PineTreeLoading />;

  return (
    <div className="page-shell">
      <div className="panel-title">
        <span>Events</span>
        {EVENTS_ENABLED && <Link to="/events/new" className="outline-button">Plan one</Link>}
      </div>

      {!events?.length ? (
        <StatePanel
          title="Nothing coming up."
          action={<Link to="/groups" className="outline-button">Find a group</Link>}
        >
          {EVENTS_ENABLED
            ? 'No events on the calendar. Groups are usually where they start.'
            : 'Events are not switched on yet.'}
        </StatePanel>
      ) : (
        <section className="panel group-list">
          {events.map(e => (
            <div key={e.id} className="group-row">
              <div className="group-meta">
                <b>{e.title}</b>
                <small>
                  {when(e.starts_at)}
                  {e.location ? ` · ${e.location}` : ''}
                </small>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

export default Events;
