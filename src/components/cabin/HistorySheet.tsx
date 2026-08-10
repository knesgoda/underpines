/**
 * The cabin ledger (spec §106): a quiet, owner-only timeline of what this
 * place has accumulated. Not analytics — memory.
 */
import CabinSheet from './CabinSheet';
import { useCabinHistory } from '@/hooks/useCabin';
import type { HistoryRow } from '@/lib/cabinApi';

const line = (h: HistoryRow): { emoji: string; text: string } => {
  const d = h.detail as Record<string, string | undefined>;
  switch (h.kind) {
    case 'cabin_created':
      return { emoji: '🏡', text: 'The cabin was built.' };
    case 'pet_added':
      return { emoji: '🐾', text: `${d.name ?? 'A pet'} moved in.` };
    case 'gift_kept':
      return {
        emoji: '🎁',
        text: `Kept ${d.item_key ? d.item_key.replace(/_/g, ' ') : d.ingredient_key?.replace(/_/g, ' ') ?? 'a gift'}${d.from ? ` from ${d.from}` : ''}.`,
      };
    case 'recipe_discovered':
      return { emoji: '🍳', text: `Discovered ${d.name ?? 'a recipe'}.` };
    case 'trade_completed':
      return { emoji: '🤝', text: `Traded with ${d.with ?? 'someone'}.` };
    case 'discovery':
      return { emoji: '🔍', text: `Found: ${d.name ?? 'something'}.` };
    case 'sighting':
      return { emoji: '👀', text: `${d.name ?? 'Something'}. You saw it.` };
    case 'keepsake':
      return { emoji: '✨', text: `${d.name ?? 'A moment'}, kept.` };
    default:
      return { emoji: '🪵', text: h.kind.replace(/_/g, ' ') };
  }
};

const HistorySheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { data: history, isLoading } = useCabinHistory(open);
  return (
    <CabinSheet open={open} onClose={onClose} title="What this cabin remembers">
      {!isLoading && (history?.length ?? 0) === 0 && (
        <p className="quiet">Nothing yet. Give it time — that is the whole idea.</p>
      )}
      <ul className="cabin-history-list">
        {history?.map(h => {
          const l = line(h);
          return (
            <li key={h.id}>
              <span aria-hidden="true">{l.emoji}</span>
              <span className="min-w-0">
                {l.text}
                <small>
                  {new Date(h.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </small>
              </span>
            </li>
          );
        })}
      </ul>
    </CabinSheet>
  );
};

export default HistorySheet;
