/**
 * Proposing a trade from someone's cabin (spec §52–53).
 *
 * Offer: your pantry and your tradable objects. Ask: their placed objects
 * (the ones you can see) and any ingredient. Both sides confirm; the server
 * moves everything atomically or not at all. No prices, anywhere, ever.
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import CabinSheet from './CabinSheet';
import {
  useIngredientDefinitions, usePantry, useInventory, useItemDefinitions, useCabinInvalidate,
} from '@/hooks/useCabin';
import { proposeTrade, type TradeLine, type CabinPlacementView } from '@/lib/cabinApi';

const TradeSheet = ({
  open, onClose, ownerId, ownerName, ownerPlacements,
}: {
  open: boolean;
  onClose: () => void;
  ownerId: string;
  ownerName: string;
  ownerPlacements: CabinPlacementView[];
}) => {
  const invalidate = useCabinInvalidate();
  const { data: ingredients } = useIngredientDefinitions(open);
  const { data: pantry } = usePantry(open);
  const { data: myItems } = useInventory(open);
  const { data: defs } = useItemDefinitions(open);
  const [offer, setOffer] = useState<TradeLine[]>([]);
  const [ask, setAsk] = useState<TradeLine[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const ingredientByKey = useMemo(() => new Map((ingredients ?? []).map(i => [i.key, i])), [ingredients]);
  const defByKey = useMemo(() => new Map((defs ?? []).map(d => [d.key, d])), [defs]);

  const lineLabel = (l: TradeLine): string => {
    if ('ingredient_key' in l) {
      const d = ingredientByKey.get(l.ingredient_key);
      return `${d?.emoji ?? ''} ${d?.name ?? l.ingredient_key}${l.quantity > 1 ? ` ×${l.quantity}` : ''}`;
    }
    const mine = (myItems ?? []).find(i => i.id === l.user_item_id);
    const theirs = ownerPlacements.find(p => p.user_item_id === l.user_item_id);
    const key = mine?.item_key ?? theirs?.item_key;
    const d = key ? defByKey.get(key) : undefined;
    return `${d?.emoji ?? theirs?.emoji ?? '📦'} ${theirs?.custom_name || d?.name || theirs?.name || 'object'}`;
  };

  const addIngredient = (side: 'offer' | 'ask', key: string) => {
    const [list, set] = side === 'offer' ? [offer, setOffer] : [ask, setAsk];
    if (list.length >= 6) return;
    const existing = list.find(l => 'ingredient_key' in l && l.ingredient_key === key);
    if (existing && 'ingredient_key' in existing) {
      set(list.map(l => (l === existing ? { ...existing, quantity: existing.quantity + 1 } : l)));
    } else {
      set([...list, { ingredient_key: key, quantity: 1 }]);
    }
  };

  const addItem = (side: 'offer' | 'ask', userItemId: string) => {
    const [list, set] = side === 'offer' ? [offer, setOffer] : [ask, setAsk];
    if (list.length >= 6) return;
    if (list.some(l => 'user_item_id' in l && l.user_item_id === userItemId)) return;
    set([...list, { user_item_id: userItemId }]);
  };

  const removeLine = (side: 'offer' | 'ask', idx: number) => {
    const [list, set] = side === 'offer' ? [offer, setOffer] : [ask, setAsk];
    set(list.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    setBusy(true);
    try {
      const res = await proposeTrade(ownerId, message.trim(), offer, ask);
      if (!res.success) {
        toast.error(res.error === 'offer_not_owned'
          ? 'You do not have everything you offered.'
          : 'The trade did not go out.');
      } else {
        toast.success(`Trade offered to ${ownerName}. They will find it in their mailbox.`);
        invalidate(['cabin-trades']);
        setOffer([]); setAsk([]); setMessage('');
        onClose();
      }
    } catch {
      toast.error('The trade did not go out.');
    } finally {
      setBusy(false);
    }
  };

  const myTradableItems = (myItems ?? []).filter(i => defByKey.get(i.item_key)?.tradable !== false);
  const theirTradables = ownerPlacements.filter(p => defByKey.get(p.item_key)?.tradable !== false);

  return (
    <CabinSheet open={open} onClose={onClose} title={`Trade with ${ownerName}`} wide>
      <div className="cabin-trade-build">
        <div>
          <h3 className="cabin-subhead">You give</h3>
          {offer.length === 0 && <p className="quiet">Nothing yet.</p>}
          <ul className="cabin-trade-lines">
            {offer.map((l, i) => (
              <li key={i}>
                {lineLabel(l)}{' '}
                <button type="button" onClick={() => removeLine('offer', i)} aria-label="Remove">✕</button>
              </li>
            ))}
          </ul>
          <details>
            <summary>From your pantry</summary>
            <div className="cabin-gift-grid">
              {(pantry ?? []).map(p => (
                <button key={p.ingredient_key} type="button" className="cabin-gift-option"
                  onClick={() => addIngredient('offer', p.ingredient_key)}>
                  <span aria-hidden="true">{ingredientByKey.get(p.ingredient_key)?.emoji}</span>
                  <b>{ingredientByKey.get(p.ingredient_key)?.name}</b>
                  <small>×{p.quantity}</small>
                </button>
              ))}
            </div>
          </details>
          <details>
            <summary>From your things</summary>
            <div className="cabin-gift-grid">
              {myTradableItems.map(i => (
                <button key={i.id} type="button" className="cabin-gift-option"
                  onClick={() => addItem('offer', i.id)}>
                  <span aria-hidden="true">{defByKey.get(i.item_key)?.emoji ?? '📦'}</span>
                  <b>{i.custom_name || defByKey.get(i.item_key)?.name || i.item_key}</b>
                </button>
              ))}
            </div>
          </details>
        </div>

        <div>
          <h3 className="cabin-subhead">For</h3>
          {ask.length === 0 && <p className="quiet">Anything of theirs you have your eye on.</p>}
          <ul className="cabin-trade-lines">
            {ask.map((l, i) => (
              <li key={i}>
                {lineLabel(l)}{' '}
                <button type="button" onClick={() => removeLine('ask', i)} aria-label="Remove">✕</button>
              </li>
            ))}
          </ul>
          {theirTradables.length > 0 && (
            <details>
              <summary>Things in their cabin</summary>
              <div className="cabin-gift-grid">
                {theirTradables.map(p => (
                  <button key={p.user_item_id} type="button" className="cabin-gift-option"
                    onClick={() => addItem('ask', p.user_item_id)}>
                    <span aria-hidden="true">{p.emoji}</span>
                    <b>{p.custom_name || p.name}</b>
                  </button>
                ))}
              </div>
            </details>
          )}
          <details>
            <summary>Ingredients</summary>
            <div className="cabin-gift-grid">
              {(ingredients ?? []).map(d => (
                <button key={d.key} type="button" className="cabin-gift-option"
                  onClick={() => addIngredient('ask', d.key)}>
                  <span aria-hidden="true">{d.emoji}</span>
                  <b>{d.name}</b>
                </button>
              ))}
            </div>
          </details>
        </div>
      </div>

      <label className="cabin-label" htmlFor="trade-msg">A word with the offer (optional)</label>
      <textarea id="trade-msg" className="cabin-gift-note" value={message} maxLength={280}
        onChange={e => setMessage(e.target.value)} placeholder="Marshmallows for chili. A classic." />

      <button type="button" className="solid-button" disabled={busy || (offer.length === 0 && ask.length === 0)} onClick={submit}>
        {busy ? 'Sending…' : 'Offer the trade'}
      </button>
    </CabinSheet>
  );
};

export default TradeSheet;
