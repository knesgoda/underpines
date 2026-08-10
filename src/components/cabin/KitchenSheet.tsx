/**
 * The pantry, the fire, and the cookbook (spec §45–51, §116–117).
 *
 * Owners pick ingredients and try them over the fire; the server decides
 * what (if anything) that makes, and the fire is forgiving — a miss consumes
 * nothing. The cookbook shows what's been discovered, silhouettes for what
 * hasn't, and never lists the secret ones. Visitors just see what people
 * around here make.
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import CabinSheet from './CabinSheet';
import {
  useIngredientDefinitions, usePantry, useRecipes, useCookbook, useCabinInvalidate,
} from '@/hooks/useCabin';
import { cook } from '@/lib/cabinApi';

const KitchenSheet = ({
  open, onClose, isOwner,
}: {
  open: boolean;
  onClose: () => void;
  isOwner: boolean;
}) => {
  const invalidate = useCabinInvalidate();
  const { data: ingredients } = useIngredientDefinitions(open);
  const { data: pantry } = usePantry(open && isOwner);
  const { data: recipes } = useRecipes(open);
  const { data: cookbook } = useCookbook(open && isOwner);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'fire' | 'cookbook'>('fire');

  const ingredientByKey = useMemo(
    () => new Map((ingredients ?? []).map(i => [i.key, i])),
    [ingredients],
  );
  const pantryMap = useMemo(
    () => new Map((pantry ?? []).map(p => [p.ingredient_key, p.quantity])),
    [pantry],
  );
  const discovered = useMemo(
    () => new Map((cookbook ?? []).map(c => [c.recipe_key, c])),
    [cookbook],
  );

  const pickedCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const k of picked) m.set(k, (m.get(k) ?? 0) + 1);
    return m;
  }, [picked]);

  const add = (key: string) => {
    if (picked.length >= 8) return;
    if ((pickedCounts.get(key) ?? 0) >= (pantryMap.get(key) ?? 0)) return;
    setPicked([...picked, key]);
  };

  const removeAt = (i: number) => setPicked(picked.filter((_, idx) => idx !== i));

  const tryFire = async () => {
    if (picked.length === 0) return;
    setBusy(true);
    try {
      const res = await cook(picked);
      if (!res.success) {
        toast.error(res.error === 'not_enough'
          ? 'The pantry disagrees about what you have.'
          : 'The fire was not having it.');
      } else if (!res.matched) {
        toast('That combination didn’t come together. Nothing wasted.', { icon: '🔥' });
      } else {
        const r = res.recipe as { name: string; emoji: string; description?: string };
        if (res.newly_discovered) {
          toast.success(`New recipe: ${r.emoji} ${r.name}!`, { duration: 6000 });
        } else {
          toast.success(`${r.emoji} ${r.name}. Well, that worked.`);
        }
        setPicked([]);
        invalidate(['cabin-pantry', 'cabin-cookbook', 'cabin-recipes', 'cabin-history']);
      }
    } catch {
      toast.error('The fire was not having it.');
    } finally {
      setBusy(false);
    }
  };

  const visibleRecipes = (recipes ?? []).filter(r => !r.secret || discovered.has(r.key));

  if (!isOwner) {
    return (
      <CabinSheet open={open} onClose={onClose} title="Around the fire">
        <p className="quiet">Things people make out here:</p>
        <div className="cabin-cookbook-grid">
          {(recipes ?? []).filter(r => !r.secret).map(r => (
            <div key={r.key} className="cabin-recipe-card">
              <span aria-hidden="true">{r.emoji}</span>
              <b>{r.name}</b>
              {r.description && <small>{r.description}</small>}
            </div>
          ))}
        </div>
      </CabinSheet>
    );
  }

  return (
    <CabinSheet open={open} onClose={onClose} title="Pantry & campfire" wide>
      <div className="tab-strip cabin-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'fire'}
          className={tab === 'fire' ? 'active' : ''} onClick={() => setTab('fire')}>
          The fire
        </button>
        <button type="button" role="tab" aria-selected={tab === 'cookbook'}
          className={tab === 'cookbook' ? 'active' : ''} onClick={() => setTab('cookbook')}>
          Cookbook
        </button>
      </div>

      {tab === 'fire' && (
        <>
          <div className="cabin-firepit" aria-live="polite">
            {picked.length === 0 && <p className="quiet">Pick ingredients from the pantry below.</p>}
            <div className="cabin-firepit-items">
              {picked.map((k, i) => (
                <button key={`${k}-${i}`} type="button" className="cabin-picked"
                  onClick={() => removeAt(i)}
                  aria-label={`Remove ${ingredientByKey.get(k)?.name ?? k}`}>
                  {ingredientByKey.get(k)?.emoji ?? '❓'}
                </button>
              ))}
            </div>
            <button type="button" className="solid-button" disabled={busy || picked.length === 0} onClick={tryFire}>
              {busy ? 'Cooking…' : 'Hold it over the fire'}
            </button>
          </div>

          <h3 className="cabin-subhead">Pantry</h3>
          {(pantry?.length ?? 0) === 0 && (
            <p className="quiet">The pantry is bare. Trades, gifts, and the forest restock it.</p>
          )}
          <div className="cabin-pantry-grid">
            {(pantry ?? []).map(p => {
              const def = ingredientByKey.get(p.ingredient_key);
              const left = p.quantity - (pickedCounts.get(p.ingredient_key) ?? 0);
              return (
                <button key={p.ingredient_key} type="button" className="cabin-pantry-item"
                  disabled={left <= 0}
                  onClick={() => add(p.ingredient_key)}
                  aria-label={`${def?.name ?? p.ingredient_key}, ${left} left. Add to the fire.`}>
                  <span aria-hidden="true">{def?.emoji ?? '❓'}</span>
                  <b>{def?.name ?? p.ingredient_key}</b>
                  <small>×{left}</small>
                </button>
              );
            })}
          </div>
        </>
      )}

      {tab === 'cookbook' && (
        <div className="cabin-cookbook-grid">
          {visibleRecipes.map(r => {
            const entry = discovered.get(r.key);
            if (!entry) {
              return (
                <div key={r.key} className="cabin-recipe-card cabin-recipe-unknown" aria-label="An undiscovered recipe">
                  <span aria-hidden="true">❓</span>
                  <b>?????</b>
                  <small>{r.required.length} ingredients</small>
                </div>
              );
            }
            return (
              <div key={r.key} className="cabin-recipe-card">
                <span aria-hidden="true">{r.emoji}</span>
                <b>{r.name}</b>
                {r.description && <small>{r.description}</small>}
                <small className="quiet">
                  Discovered {new Date(entry.discovered_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  {entry.times_cooked > 1 ? ` · made ${entry.times_cooked} times` : ''}
                </small>
              </div>
            );
          })}
        </div>
      )}
    </CabinSheet>
  );
};

export default KitchenSheet;
