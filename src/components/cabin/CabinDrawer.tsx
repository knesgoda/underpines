/**
 * "Things in This Cabin" — the accessible interaction drawer (spec §76).
 *
 * Everything tappable in the scene is also a row here: fixtures, placed
 * objects, pets. Screen readers, keyboards, and menu-preferrers get the
 * whole cabin without pixel hunting.
 */
import CabinSheet from './CabinSheet';
import type { CabinPlacementView, CabinPetView } from '@/lib/cabinApi';
import { CABIN_FIXTURES, type FixtureAction } from '@/lib/cabin/fixtures';
import { zoneByKey } from '@/lib/cabin/zones';

const CabinDrawer = ({
  open, onClose, isOwner, placements, pets, onFixture, onInspectItem, onPetTap,
}: {
  open: boolean;
  onClose: () => void;
  isOwner: boolean;
  placements: CabinPlacementView[];
  pets: CabinPetView[];
  onFixture: (a: FixtureAction) => void;
  onInspectItem: (p: CabinPlacementView) => void;
  onPetTap: (p: CabinPetView) => void;
}) => {
  const fixtures = CABIN_FIXTURES.filter(f => (isOwner ? f.ownerAction : f.visitorAction));
  return (
    <CabinSheet open={open} onClose={onClose} title="Things in this Cabin">
      <ul className="cabin-drawer-list">
        {fixtures.map(f => (
          <li key={f.key}>
            <button
              type="button"
              className="cabin-drawer-row"
              onClick={() => { onClose(); onFixture((isOwner ? f.ownerAction : f.visitorAction)!); }}
            >
              <span aria-hidden="true">{f.emoji}</span>
              <span className="min-w-0">
                <b>{f.label}</b>
                <small>{isOwner ? f.ownerHint : f.visitorHint}</small>
              </span>
            </button>
          </li>
        ))}
        {pets.map(p => (
          <li key={p.id}>
            <button type="button" className="cabin-drawer-row" onClick={() => { onClose(); onPetTap(p); }}>
              <span aria-hidden="true">🐾</span>
              <span className="min-w-0">
                <b>{p.name}</b>
                <small>{p.is_memorial ? 'Lives here, always' : 'Lives here'}</small>
              </span>
            </button>
          </li>
        ))}
        {placements.map(p => (
          <li key={p.id}>
            <button type="button" className="cabin-drawer-row" onClick={() => { onClose(); onInspectItem(p); }}>
              <span aria-hidden="true">{p.emoji}</span>
              <span className="min-w-0">
                <b>{p.custom_name || p.name}</b>
                <small>{zoneByKey.get(p.zone)?.label ?? p.zone}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </CabinSheet>
  );
};

export default CabinDrawer;
