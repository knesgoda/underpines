/**
 * The mailbox: for visitors, "leave a note" (spec §30); for the owner,
 * notes received plus the trading ledger — accept, decline, or cancel.
 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import CabinSheet from './CabinSheet';
import { formatTimeAgo } from '@/lib/time';
import {
  useCabinNotes, useTrades, useIngredientDefinitions, useCabinInvalidate,
} from '@/hooks/useCabin';
import {
  leaveNote, respondTrade, cancelTrade, markNotesRead, type TradeRow, type TradeItemRow,
} from '@/lib/cabinApi';
import { useAuth } from '@/contexts/AuthContext';

const NOTE_ERRORS: Record<string, string> = {
  rate_limited: 'That is plenty of notes for one day.',
  not_allowed: 'Notes are closed here right now.',
};

const TradeLines = ({
  items, side, ingredientName,
}: {
  items: TradeItemRow[];
  side: 'proposer' | 'recipient';
  ingredientName: (k: string | null) => string;
}) => (
  <ul className="cabin-trade-lines">
    {items.filter(i => i.side === side).map(i => (
      <li key={i.id}>
        {i.ingredient_key
          ? `${ingredientName(i.ingredient_key)}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`
          : 'a cabin object'}
      </li>
    ))}
  </ul>
);

const MailboxSheet = ({
  open, onClose, isOwner, ownerId, ownerName,
}: {
  open: boolean;
  onClose: () => void;
  isOwner: boolean;
  ownerId: string;
  ownerName: string;
}) => {
  const { user } = useAuth();
  const invalidate = useCabinInvalidate();
  const { data: notes } = useCabinNotes(open && isOwner);
  const { data: trades } = useTrades(open && isOwner);
  const { data: ingredients } = useIngredientDefinitions(open && isOwner);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const ingredientName = useMemo(() => {
    const byKey = new Map((ingredients ?? []).map(i => [i.key, i.name]));
    return (k: string | null) => (k ? byKey.get(k) ?? k : '');
  }, [ingredients]);

  useEffect(() => {
    if (open && isOwner) markNotesRead();
  }, [open, isOwner]);

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const res = await leaveNote(ownerId, text.trim());
      if (!res.success) toast.error(NOTE_ERRORS[res.error ?? ''] ?? 'The note did not send.');
      else {
        toast.success(`Left a note for ${ownerName}.`);
        setText('');
        onClose();
      }
    } catch {
      toast.error('The note did not send.');
    } finally {
      setBusy(false);
    }
  };

  const answer = async (tradeId: string, accept: boolean) => {
    try {
      const res = await respondTrade(tradeId, accept);
      if (!res.success) {
        toast.error(res.error === 'trade_item_missing'
          ? 'Part of that trade is gone — it fell through.'
          : 'Could not resolve the trade.');
      } else {
        toast.success(accept ? 'Traded. Everything has moved.' : 'Declined, no hard feelings.');
      }
      invalidate(['cabin-trades', 'cabin-inventory', 'cabin-pantry', 'cabin-history', 'cabin-view']);
    } catch {
      toast.error('Could not resolve the trade.');
    }
  };

  const withdraw = async (tradeId: string) => {
    await cancelTrade(tradeId);
    invalidate(['cabin-trades']);
  };

  if (!isOwner) {
    return (
      <CabinSheet open={open} onClose={onClose} title={`Leave a note for ${ownerName}`}>
        <div className="cabin-form">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={600}
            placeholder="Only they will read it."
            aria-label={`Note for ${ownerName}`}
          />
          <button type="button" className="solid-button" disabled={busy || !text.trim()} onClick={send}>
            {busy ? 'Leaving it…' : 'Leave the note'}
          </button>
        </div>
      </CabinSheet>
    );
  }

  const openTrades = (trades ?? []).filter(t => t.status === 'open');
  const pastTrades = (trades ?? []).filter(t => t.status !== 'open').slice(0, 5);

  const tradeTitle = (t: TradeRow) =>
    t.proposer_id === user?.id
      ? `You offered ${t.recipient?.display_name ?? 'someone'}`
      : `${t.proposer?.display_name ?? 'Someone'} offers you`;

  return (
    <CabinSheet open={open} onClose={onClose} title="Mailbox" wide>
      <h3 className="cabin-subhead">Notes</h3>
      {(notes?.length ?? 0) === 0 && <p className="quiet">No notes yet.</p>}
      {notes?.map(n => (
        <div key={n.id} className="cabin-note-row">
          <p>{n.content}</p>
          <small>{n.author?.display_name ?? 'Someone'} · {formatTimeAgo(n.created_at)}</small>
        </div>
      ))}

      <h3 className="cabin-subhead">Trades</h3>
      {openTrades.length === 0 && <p className="quiet">No open trades.</p>}
      {openTrades.map(t => (
        <div key={t.id} className="cabin-trade-row">
          <b>{tradeTitle(t)}</b>
          {t.message && <p className="cabin-gift-message">“{t.message}”</p>}
          <div className="cabin-trade-sides">
            <div>
              <small>They give</small>
              <TradeLines items={t.items ?? []} side="proposer" ingredientName={ingredientName} />
            </div>
            <div>
              <small>For</small>
              <TradeLines items={t.items ?? []} side="recipient" ingredientName={ingredientName} />
            </div>
          </div>
          <span className="cabin-entry-tools">
            {t.recipient_id === user?.id ? (
              <>
                <button type="button" className="solid-button" onClick={() => answer(t.id, true)}>Accept</button>
                <button type="button" onClick={() => answer(t.id, false)}>Decline</button>
              </>
            ) : (
              <button type="button" onClick={() => withdraw(t.id)}>Withdraw</button>
            )}
          </span>
        </div>
      ))}
      {pastTrades.length > 0 && (
        <>
          <h3 className="cabin-subhead">Settled</h3>
          {pastTrades.map(t => (
            <p key={t.id} className="quiet">
              {tradeTitle(t)} — {t.status} · {formatTimeAgo(t.created_at)}
            </p>
          ))}
        </>
      )}
    </CabinSheet>
  );
};

export default MailboxSheet;
