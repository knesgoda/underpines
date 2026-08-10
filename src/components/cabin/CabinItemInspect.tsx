/**
 * Object inspection — where provenance lives (spec §10, §107).
 *
 * Tap anything and the cabin remembers out loud: where it came from, who
 * left it, and how long it has been exactly there.
 */
import CabinSheet from './CabinSheet';
import type { CabinPlacementView } from '@/lib/cabinApi';
import { zoneByKey } from '@/lib/cabin/zones';

const RARITY_LABEL: Record<string, string> = {
  everyday: 'Everyday',
  unusual: 'Unusual',
  hard_to_find: 'Hard to find',
  strange: 'Strange',
  very_strange: 'Very strange',
};

const SOURCE_LINE: Record<string, string> = {
  starter: 'Came with the cabin',
  discovery: 'Found outside',
  gift: 'A gift',
  trade: 'Arrived in a trade',
  event: 'From a moment worth keeping',
  recipe: 'Earned at the fire',
  ranger_station: 'From the Ranger Station',
};

const monthYear = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

const CabinItemInspect = ({
  item, onClose,
}: {
  item: CabinPlacementView | null;
  onClose: () => void;
}) => {
  if (!item) return null;
  const zone = zoneByKey.get(item.zone);
  return (
    <CabinSheet open onClose={onClose} title={item.custom_name || item.name}>
      <div className="cabin-inspect">
        <div className="cabin-inspect-art" aria-hidden="true">{item.emoji}</div>
        {item.custom_name && <p className="quiet">({item.name})</p>}
        {item.description && <p>{item.description}</p>}
        <dl className="cabin-inspect-facts">
          {item.rarity !== 'everyday' && (
            <div><dt>Rarity</dt><dd>{RARITY_LABEL[item.rarity] ?? item.rarity}</dd></div>
          )}
          <div><dt>Where</dt><dd>{zone?.label ?? item.zone}</dd></div>
          <div>
            <dt>Story</dt>
            <dd>
              {item.provenance_note
                || (item.gifted_by_name
                  ? `From ${item.gifted_by_name}`
                  : SOURCE_LINE[item.acquisition_source] ?? 'It has always been here')}
            </dd>
          </div>
          <div><dt>Since</dt><dd>{monthYear(item.acquired_at)}</dd></div>
        </dl>
      </div>
    </CabinSheet>
  );
};

export default CabinItemInspect;
