import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import PineTreeLoading from '@/components/PineTreeLoading';
import StatePanel, { ErrorPanel } from '@/components/StatePanel';
import { useAuth } from '@/contexts/AuthContext';
import { RSVP_LABELS, useRsvp, useUpcomingEvents, type Rsvp } from '@/hooks/useEvents';
import '@/styles/events.css';

/** Same day, so a range does not print the date twice. */
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

const formatWhen = (startsAt: string, endsAt: string | null) => {
  const start = new Date(startsAt);
  const date = start.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const time = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (!endsAt) return `${date} · ${time}`;

  const end = new Date(endsAt);
  const endTime = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return sameDay(start, end)
    ? `${date} · ${time} – ${endTime}`
    : `${date} ${time} – ${end.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} ${endTime}`;
};

/**
 * Events.
 *
 * Times are stored as instants and rendered in the viewer's own zone, because
 * an event that says "7:30pm" with no zone is wrong for everyone who is not
 * standing where the host was.
 */
const Events = () => {
  const { user } = useAuth();
  const { data: events, isLoading, isError } = useUpcomingEvents();
  const rsvp = useRsvp();

  if (isLoading) return <PineTreeLoading />;
  if (isError) return <div className="page-shell"><ErrorPanel what="the calendar" /></div>;

  const answer = (eventId: string, status: Rsvp) =>
    rsvp.mutateAsync({ eventId, status }).catch(() => toast.error('That did not go through.'));

  return (
    <div className="page-shell">
      <div className="panel-title">
        <span>Events</span>
        {user && <Link to="/events/new" className="outline-button">Plan one</Link>}
      </div>

      {!events?.length ? (
        <StatePanel
          title="Nothing coming up."
          action={
            user
              ? <Link to="/events/new" className="outline-button">Plan the first one</Link>
              : <Link to="/login" className="outline-button">Sign in</Link>
          }
        >
          No events on the calendar yet.
        </StatePanel>
      ) : (
        <div className="event-list">
          {events.map(e => (
            <section key={e.id} className="panel event-card">
              <div className="event-head">
                <div className="event-when">
                  <h2>{e.title}</h2>
                  <small>{formatWhen(e.starts_at, e.ends_at)}</small>
                  {e.location && <small>{e.location}</small>}
                </div>
                <span className="event-going">
                  {e.going} going
                </span>
              </div>

              {e.description && <p className="event-body">{e.description}</p>}

              {user && (
                <div className="event-rsvp">
                  {(Object.keys(RSVP_LABELS) as Rsvp[]).map(status => (
                    <button
                      key={status}
                      type="button"
                      className={e.mine === status ? 'solid-button' : 'outline-button'}
                      aria-pressed={e.mine === status}
                      disabled={rsvp.isPending}
                      onClick={() => answer(e.id, status)}
                    >
                      {RSVP_LABELS[status]}
                    </button>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default Events;
