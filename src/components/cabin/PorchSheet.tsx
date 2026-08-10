/**
 * The porch (spec §31): visitors leave small things, owners find them.
 *
 * Token gifts (a pinecone, a wildflower) cost nothing — the point is the
 * gesture. Ingredient gifts come out of the sender's own pantry. Everything
 * the owner keeps carries its sender and month forever.
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import CabinSheet from './CabinSheet';
import StatePanel from '@/components/StatePanel';
import { formatTimeAgo } from '@/lib/time';
import {
  useItemDefinitions, useIngredientDefinitions, usePantry, usePorchGifts, useCabinInvalidate,
} from '@/hooks/useCabin';
import { leaveGift, respondGift } from '@/lib/cabinApi';

const ERRORS: Record<string, string> = {
  rate_limited: 'The porch is getting crowded — try again tomorrow.',
  not_allowed: 'Gifts are closed here right now.',
  not_enough: 'Your pantry does not have that many.',
};

const PorchSheet = ({
  open, onClose, isOwner, ownerId, ownerName,
}: {
  open: boolean;
  onClose: () => void;
  isOwner: boolean;
  ownerId: string;
  ownerName: string;
}) => {
  const invalidate = useCabinInvalidate();
  const { data: defs } = useItemDefinitions(open && !isOwner);
  const { data: ingredients } = useIngredientDefinitions(open);
  const { data: pantry } = usePantry(open && !isOwner);
  const { data: gifts, isLoading } = usePorchGifts(open && isOwner);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const tokens = useMemo(() => (defs ?? []).filter(d => d.giftable), [defs]);
  const pantryRows = useMemo(
    () => (pantry ?? []).filter(p => p.quantity > 0),
    [pantry],
  );
  const ingredientByKey = useMemo(
    () => new Map((ingredients ?? []).map(i => [i.key, i])),
    [ingredients],
  );

  const give = async (gift: { item_key?: string; ingredient_key?: string }) => {
    setBusy(true);
    try {
      const res = await leaveGift(ownerId, { ...gift, message: message.trim() || undefined });
      if (!res.success) {
        toast.error(ERRORS[res.error ?? ''] ?? 'That did not make it to the porch.');
      } else {
        toast.success(`Left on ${ownerName}’s porch.`);
        setMessage('');
        invalidate(['cabin-pantry']);
        onClose();
      }
    } catch {
      toast.error('That did not make it to the porch.');
    } finally {
      setBusy(false);
    }
  };

  const resolve = async (id: string, keep: boolean) => {
    try {
      const res = await respondGift(id, keep);
      if (!res.success) toast.error('Could not do that.');
      else {
        toast.success(keep ? 'Kept. It is yours now.' : 'Quietly set aside.');
        invalidate(['cabin-porch-gifts', 'cabin-inventory', 'cabin-pantry', 'cabin-history']);
      }
    } catch {
      toast.error('Could not do that.');
    }
  };

  if (isOwner) {
    return (
      <CabinSheet open={open} onClose={onClose} title="On the porch">
        {!isLoading && (gifts?.length ?? 0) === 0 && (
          <p className="quiet">Nothing on the porch right now.</p>
        )}
        {gifts?.map(g => (
          <div key={g.id} className="cabin-gift-row">
            <span className="cabin-gift-art" aria-hidden="true">
              {g.item_key ? '🎁' : ingredientByKey.get(g.ingredient_key ?? '')?.emoji ?? '🎁'}
            </span>
            <div className="min-w-0">
              <b>
                {g.item_key
                  ? g.item_key.replace(/_/g, ' ')
                  : `${ingredientByKey.get(g.ingredient_key ?? '')?.name ?? g.ingredient_key}${g.quantity > 1 ? ` ×${g.quantity}` : ''}`}
              </b>
              <small>
                Left by {g.sender?.display_name ?? 'someone'} · {formatTimeAgo(g.created_at)}
              </small>
              {g.message && <p className="cabin-gift-message">“{g.message}”</p>}
            </div>
            <span className="cabin-entry-tools">
              <button type="button" className="solid-button" onClick={() => resolve(g.id, true)}>Keep</button>
              <button type="button" onClick={() => resolve(g.id, false)}>Pass</button>
            </span>
          </div>
        ))}
      </CabinSheet>
    );
  }

  return (
    <CabinSheet open={open} onClose={onClose} title={`Leave something for ${ownerName}`}>
      <label className="cabin-label" htmlFor="gift-note">A word to go with it (optional)</label>
      <textarea
        id="gift-note"
        className="cabin-gift-note"
        value={message}
        onChange={e => setMessage(e.target.value)}
        maxLength={280}
        placeholder="Found this and thought of you."
      />

      <h3 className="cabin-subhead">Little things</h3>
      {tokens.length === 0 && <StatePanel title="Nothing giftable right now." />}
      <div className="cabin-gift-grid">
        {tokens.map(t => (
          <button
            key={t.key}
            type="button"
            className="cabin-gift-option"
            disabled={busy}
            onClick={() => give({ item_key: t.key })}
          >
            <span aria-hidden="true">{t.emoji}</span>
            <b>{t.name}</b>
          </button>
        ))}
      </div>

      {pantryRows.length > 0 && (
        <>
          <h3 className="cabin-subhead">From your pantry</h3>
          <div className="cabin-gift-grid">
            {pantryRows.map(p => {
              const def = ingredientByKey.get(p.ingredient_key);
              if (!def?.giftable) return null;
              return (
                <button
                  key={p.ingredient_key}
                  type="button"
                  className="cabin-gift-option"
                  disabled={busy}
                  onClick={() => give({ ingredient_key: p.ingredient_key })}
                >
                  <span aria-hidden="true">{def.emoji}</span>
                  <b>{def.name}</b>
                  <small>you have {p.quantity}</small>
                </button>
              );
            })}
          </div>
        </>
      )}
    </CabinSheet>
  );
};

export default PorchSheet;
