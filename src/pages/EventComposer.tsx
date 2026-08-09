import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import StatePanel from '@/components/StatePanel';
import { useCreateEvent } from '@/hooks/useEvents';
import { useMyGroups } from '@/hooks/useGroups';
import '@/styles/customizer.css';
import '@/styles/groups.css';

/**
 * Plan an event.
 *
 * `starts_at` is a timestamptz and the input is a local datetime, so the value
 * is converted through a Date rather than sent as typed — "7:30pm" with no zone
 * is ambiguous the moment two people are in different ones.
 */
const EventComposer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const create = useCreateEvent();
  const { data: groups } = useMyGroups();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [starts, setStarts] = useState('');
  const [ends, setEnds] = useState('');
  const [campId, setCampId] = useState('');

  if (!user) {
    return (
      <div className="page-shell">
        <StatePanel title="Sign in first." action={<Link to="/login" className="outline-button">Sign in</Link>}>
          Only members can plan events.
        </StatePanel>
      </div>
    );
  }

  const endsBeforeStart = !!starts && !!ends && new Date(ends) < new Date(starts);
  const canSave = !!title.trim() && !!starts && !endsBeforeStart && !create.isPending;

  const save = async () => {
    if (!canSave) return;
    try {
      await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        starts_at: new Date(starts).toISOString(),
        ends_at: ends ? new Date(ends).toISOString() : null,
        camp_id: campId || null,
      });
      toast.success('Event planned.');
      navigate('/events');
    } catch {
      toast.error('Could not save that event.');
    }
  };

  return (
    <div className="page-shell customizer" style={{ maxWidth: 640 }}>
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-display text-2xl text-foreground">Plan an event</h1>
        <button type="button" className="solid-button ml-auto" onClick={save} disabled={!canSave}>
          {create.isPending ? 'Saving…' : 'Save event'}
        </button>
      </div>

      <section className="panel module">
        <h2>What and when</h2>

        <label className="field">
          <span>What is it</span>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={140} />
        </label>

        <label className="field">
          <span>Starts</span>
          <input type="datetime-local" value={starts} onChange={e => setStarts(e.target.value)} />
          <small>Shown to everyone else in their own timezone.</small>
        </label>

        <label className="field">
          <span>Ends</span>
          <input type="datetime-local" value={ends} onChange={e => setEnds(e.target.value)} />
          <small>Optional.</small>
        </label>

        {endsBeforeStart && <p className="warn">It cannot end before it starts.</p>}

        <label className="field">
          <span>Where</span>
          <input value={location} onChange={e => setLocation(e.target.value)} maxLength={200} placeholder="A place, or a link" />
        </label>

        <label className="field">
          <span>More about it</span>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} maxLength={2000} />
        </label>

        {!!groups?.length && (
          <label className="field">
            <span>Attach to a group</span>
            <select value={campId} onChange={e => setCampId(e.target.value)}>
              <option value="">Not a group event</option>
              {groups.map(g => <option key={g.camp_id} value={g.camp_id}>{g.group.name}</option>)}
            </select>
          </label>
        )}
      </section>
    </div>
  );
};

export default EventComposer;
