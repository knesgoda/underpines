import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import PineTreeLoading from '@/components/PineTreeLoading';
import StatePanel, { ErrorPanel } from '@/components/StatePanel';
import { useAuth } from '@/contexts/AuthContext';
import { useRangerLevel } from '@/hooks/useRangerLevel';
import {
  useDeleteOwnFeedback,
  useFeedbackBoard,
  useSetFeedbackStatus,
  useSubmitFeedback,
  useToggleVote,
  useUpdateOwnFeedback,
  type FeedbackBoardItem,
} from '@/hooks/useFeedback';
import {
  FEEDBACK_STATUSES,
  STATUS_LABELS,
  TYPE_LABELS,
  rpcErrorMessage,
  type FeedbackStatus,
  type FeedbackType,
  type RpcResult,
} from '@/lib/feedbackApi';
import '@/styles/ranger-station.css';

type TypeTab = 'all' | FeedbackType;
type StatusTab = 'all' | FeedbackStatus;
type Sort = 'top' | 'new';

const when = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/** The submit panel: what kind of thing, a title, and the details. */
const SubmitPanel = () => {
  const submit = useSubmitFeedback();
  const [type, setType] = useState<FeedbackType>('feature');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const send = async () => {
    if (!title.trim() || !body.trim()) return;
    try {
      const result = (await submit.mutateAsync({ type, title, body })) as RpcResult;
      if (!result.success) {
        toast.error(rpcErrorMessage(result.error));
        return;
      }
      setTitle('');
      setBody('');
      toast.success(type === 'bug' ? 'Bug reported. The Rangers will see it.' : 'Request filed. Others can vote it up now.');
    } catch {
      toast.error('That did not go through.');
    }
  };

  return (
    <section className="panel feedback-form">
      <h2 className="box-heading">File something</h2>
      <div className="feedback-form-type" role="radiogroup" aria-label="What kind of thing is this?">
        {(Object.keys(TYPE_LABELS) as FeedbackType[]).map(t => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            className={type === t ? 'solid-button' : 'outline-button'}
            onClick={() => setType(t)}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>
      <input
        type="text"
        maxLength={120}
        placeholder={type === 'bug' ? 'What went wrong, in a sentence' : 'What should exist, in a sentence'}
        value={title}
        onChange={e => setTitle(e.target.value)}
        aria-label="Title"
      />
      <textarea
        maxLength={4000}
        rows={4}
        placeholder={type === 'bug' ? 'What did you do, what did you expect, what happened instead?' : 'What would it do, and why would it make this place better?'}
        value={body}
        onChange={e => setBody(e.target.value)}
        aria-label="Details"
      />
      <div className="feedback-form-send">
        <span className="quiet">Up to five a day. Everyone can see and vote on what you file.</span>
        <button
          type="button"
          className="solid-button"
          disabled={submit.isPending || title.trim().length < 3 || !body.trim()}
          onClick={send}
        >
          {submit.isPending ? 'Sending…' : 'Send it in'}
        </button>
      </div>
    </section>
  );
};

/** Author-only inline edit, allowed while the item is still open. */
const EditForm = ({ item, onDone }: { item: FeedbackBoardItem; onDone: () => void }) => {
  const update = useUpdateOwnFeedback();
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body);

  const save = async () => {
    try {
      const result = (await update.mutateAsync({ itemId: item.id, title, body })) as RpcResult;
      if (!result.success) {
        toast.error(rpcErrorMessage(result.error));
        return;
      }
      onDone();
    } catch {
      toast.error('That did not go through.');
    }
  };

  return (
    <div className="feedback-edit">
      <input type="text" maxLength={120} value={title} onChange={e => setTitle(e.target.value)} aria-label="Title" />
      <textarea maxLength={4000} rows={3} value={body} onChange={e => setBody(e.target.value)} aria-label="Details" />
      <div className="feedback-edit-actions">
        <button type="button" className="solid-button" disabled={update.isPending} onClick={save}>Save</button>
        <button type="button" className="outline-button" onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
};

/**
 * Ranger-only board controls: move the item, optionally leave a note the
 * whole board sees. Render-only gate — the RPC re-checks ranger level.
 */
const RangerControls = ({ item }: { item: FeedbackBoardItem }) => {
  const setStatus = useSetFeedbackStatus();
  const [status, setStatus_] = useState<FeedbackStatus>(item.status);
  const [note, setNote] = useState(item.ranger_note ?? '');

  const save = async () => {
    try {
      const trimmed = note.trim();
      const result = (await setStatus.mutateAsync({
        itemId: item.id,
        status,
        note: trimmed && trimmed !== (item.ranger_note ?? '') ? trimmed : null,
      })) as RpcResult;
      if (!result.success) {
        toast.error(rpcErrorMessage(result.error));
        return;
      }
      toast.success('Board updated.');
    } catch {
      toast.error('That did not go through.');
    }
  };

  return (
    <div className="feedback-ranger">
      <select value={status} onChange={e => setStatus_(e.target.value as FeedbackStatus)} aria-label="Status">
        {FEEDBACK_STATUSES.map(s => (
          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
        ))}
      </select>
      <input
        type="text"
        maxLength={1000}
        placeholder="Note for the board (optional)"
        value={note}
        onChange={e => setNote(e.target.value)}
        aria-label="Ranger note"
      />
      <button type="button" className="outline-button" disabled={setStatus.isPending} onClick={save}>
        Save
      </button>
    </div>
  );
};

const ItemRow = ({ item, isRanger }: { item: FeedbackBoardItem; isRanger: boolean }) => {
  const { user } = useAuth();
  const toggle = useToggleVote();
  const remove = useDeleteOwnFeedback();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const isMine = user?.id === item.author_id;

  const vote = async () => {
    try {
      const result = (await toggle.mutateAsync(item.id)) as RpcResult;
      if (!result.success) toast.error(rpcErrorMessage(result.error));
    } catch {
      toast.error('That did not go through.');
    }
  };

  const del = async () => {
    try {
      const result = (await remove.mutateAsync(item.id)) as RpcResult;
      if (!result.success) toast.error(rpcErrorMessage(result.error));
    } catch {
      toast.error('That did not go through.');
    }
    setConfirming(false);
  };

  return (
    <section className="panel feedback-row">
      <button
        type="button"
        className="feedback-vote"
        aria-pressed={item.mine_voted}
        aria-label={item.mine_voted ? 'Withdraw your vote' : 'Vote this up'}
        disabled={toggle.isPending}
        onClick={vote}
      >
        <span aria-hidden="true">▲</span>
        <b>{item.vote_count}</b>
      </button>

      <div className="feedback-main">
        <div className="feedback-head">
          <span className={`feedback-type is-${item.item_type}`}>{TYPE_LABELS[item.item_type]}</span>
          <span className={`feedback-status is-${item.status}`}>{STATUS_LABELS[item.status]}</span>
        </div>

        {editing ? (
          <EditForm item={item} onDone={() => setEditing(false)} />
        ) : (
          <>
            <h2>{item.title}</h2>
            <p className="feedback-body">{item.body}</p>
          </>
        )}

        {item.ranger_note && !editing && (
          <p className="feedback-note">Ranger note: {item.ranger_note}</p>
        )}

        <div className="feedback-meta">
          <span>
            {item.author?.display_name ?? 'Someone'} · {when(item.created_at)}
          </span>
          {isMine && item.status === 'open' && !editing && (
            <span className="feedback-owner-actions">
              <button type="button" onClick={() => setEditing(true)}>Edit</button>
              {confirming ? (
                <>
                  <button type="button" className="is-danger" onClick={del} disabled={remove.isPending}>Really remove?</button>
                  <button type="button" onClick={() => setConfirming(false)}>Keep it</button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirming(true)}>Remove</button>
              )}
            </span>
          )}
        </div>

        {isRanger && !editing && <RangerControls item={item} />}
      </div>
    </section>
  );
};

/**
 * The Ranger Station — the member-facing board. Anyone can file a feature
 * request or a bug report; votes raise items up the board; Rangers answer
 * by moving them across statuses.
 */
const RangerStation = () => {
  const { isRanger } = useRangerLevel();
  const { data: items, isLoading, isError } = useFeedbackBoard();
  const [typeTab, setTypeTab] = useState<TypeTab>('all');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [sort, setSort] = useState<Sort>('top');

  const visible = useMemo(() => {
    let list = items ?? [];
    if (typeTab !== 'all') list = list.filter(i => i.item_type === typeTab);
    if (statusTab !== 'all') list = list.filter(i => i.status === statusTab);
    return [...list].sort((a, b) =>
      sort === 'top'
        ? b.vote_count - a.vote_count || b.created_at.localeCompare(a.created_at)
        : b.created_at.localeCompare(a.created_at),
    );
  }, [items, typeTab, statusTab, sort]);

  if (isLoading) return <PineTreeLoading />;
  if (isError) return <div className="page-shell"><ErrorPanel what="the Ranger Station" /></div>;

  return (
    <div className="page-shell ranger-station">
      <div className="panel-title">
        <span>Ranger Station</span>
        <button
          type="button"
          className="outline-button"
          aria-pressed={sort === 'top'}
          onClick={() => setSort(s => (s === 'top' ? 'new' : 'top'))}
        >
          {sort === 'top' ? 'Top voted' : 'Newest'}
        </button>
      </div>

      <p className="feedback-intro">
        Ask for what this place is missing, report what is broken, and vote up
        what matters to you. The Rangers read everything here.
      </p>

      <SubmitPanel />

      <div className="tab-strip">
        {([
          ['all', 'Everything'],
          ['feature', 'Feature requests'],
          ['bug', 'Bug reports'],
        ] as [TypeTab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTypeTab(key)} className={typeTab === key ? 'is-active' : ''}>
            {label}
          </button>
        ))}
      </div>

      <div className="feedback-status-filter" role="group" aria-label="Filter by status">
        {(['all', ...FEEDBACK_STATUSES] as StatusTab[]).map(s => (
          <button
            key={s}
            type="button"
            className={statusTab === s ? 'is-active' : ''}
            onClick={() => setStatusTab(s)}
          >
            {s === 'all' ? 'Any status' : STATUS_LABELS[s as FeedbackStatus]}
          </button>
        ))}
      </div>

      {!visible.length ? (
        <StatePanel title="Nothing on the board here yet.">
          {typeTab === 'bug'
            ? 'No bugs reported under this filter. Long may it last.'
            : 'Be the first — file something above.'}
        </StatePanel>
      ) : (
        <div className="feedback-list">
          {visible.map(item => (
            <ItemRow key={item.id} item={item} isRanger={isRanger} />
          ))}
        </div>
      )}
    </div>
  );
};

export default RangerStation;
