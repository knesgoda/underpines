/**
 * CabinExterior — the little cabin in the scene, plus the porch strip.
 *
 * Layered over the restored CabinScene banner: a timber silhouette with a
 * glowing window, chimney smoke and a porch light that translate presence
 * into environment (spec §25 — no green dots here), the exterior placement
 * zones, and whatever the event engine says is out there right now.
 */
import type { CabinPlacementView } from '@/lib/cabinApi';
import { EXTERIOR_ZONES, zoneByKey } from '@/lib/cabin/zones';
import type { CabinEventResult } from '@/lib/cabinApi';

interface CabinExteriorProps {
  presence: 'active' | 'today' | 'away' | 'hidden';
  isNight: boolean;
  placements: CabinPlacementView[];
  activeEvent: CabinEventResult['event'] | null;
  onInspectItem: (p: CabinPlacementView) => void;
  onEventTap: () => void;
  reducedMotion: boolean;
}

const CabinExterior = ({
  presence, isNight, placements, activeEvent, onInspectItem, onEventTap, reducedMotion,
}: CabinExteriorProps) => {
  const exterior = placements.filter(p => zoneByKey.get(p.zone)?.area === 'exterior');
  const smoke = presence === 'active' && !reducedMotion;
  const porchLight = presence === 'active' || presence === 'today';

  return (
    <div className="cabin-exterior" aria-hidden={false}>
      {/* The cabin itself */}
      <svg
        className="cabin-house"
        viewBox="0 0 200 120"
        preserveAspectRatio="xMidYMax meet"
        aria-hidden="true"
      >
        {/* chimney */}
        <rect x="140" y="18" width="14" height="34" fill="#4a3628" />
        {/* roof */}
        <polygon points="20,52 100,10 180,52" fill="#3a2a1c" />
        <polygon points="28,52 100,16 172,52" fill="#513a26" />
        {/* body */}
        <rect x="34" y="52" width="132" height="56" fill="#6b4e33" />
        <rect x="34" y="52" width="132" height="6" fill="#5a4029" />
        <rect x="34" y="70" width="132" height="3" fill="#5a4029" opacity="0.6" />
        <rect x="34" y="88" width="132" height="3" fill="#5a4029" opacity="0.6" />
        {/* door */}
        <rect x="90" y="70" width="22" height="38" rx="2" fill="#3d2c1c" />
        <circle cx="107" cy="90" r="1.6" fill="#c9a86a" />
        {/* window — glows when someone is home at night */}
        <rect x="48" y="66" width="26" height="22" rx="1.5"
          fill={isNight ? (porchLight ? '#ffd98a' : '#22304a') : '#bcd8ee'} />
        <line x1="61" y1="66" x2="61" y2="88" stroke="#3d2c1c" strokeWidth="2" />
        <line x1="48" y1="77" x2="74" y2="77" stroke="#3d2c1c" strokeWidth="2" />
        {/* porch */}
        <rect x="26" y="106" width="148" height="6" fill="#4a3628" />
        <rect x="30" y="112" width="4" height="8" fill="#3d2c1c" />
        <rect x="166" y="112" width="4" height="8" fill="#3d2c1c" />
        {/* porch light */}
        {porchLight && (
          <>
            <circle cx="122" cy="66" r="3.4" fill="#ffd98a" className="cabin-porch-light" />
            <circle cx="122" cy="66" r="7" fill="#ffd98a" opacity="0.25" />
          </>
        )}
      </svg>

      {/* Chimney smoke — someone's got the fire going */}
      {smoke && (
        <div className="cabin-smoke" aria-hidden="true">
          <span>˚</span><span>°</span><span>˚</span>
        </div>
      )}

      {/* Exterior placements along the porch strip */}
      {exterior.map(p => {
        const z = zoneByKey.get(p.zone)!;
        return (
          <button
            key={p.id}
            type="button"
            className="cabin-item cabin-item-exterior"
            style={{ left: `${z.x + p.slot * 3}%`, bottom: `${100 - z.y}%` }}
            onClick={() => onInspectItem(p)}
            aria-label={`${p.custom_name || p.name}, ${z.label}`}
            title={p.custom_name || p.name}
          >
            <span aria-hidden="true">{p.emoji}</span>
          </button>
        );
      })}

      {/* Something is out there. */}
      {activeEvent && (
        <button
          type="button"
          className={`cabin-event-marker event-${activeEvent.kind}`}
          onClick={onEventTap}
          aria-label={activeEvent.kind === 'discovery'
            ? `You notice something: ${activeEvent.name}. Take a closer look.`
            : activeEvent.name}
        >
          <span aria-hidden="true">{activeEvent.emoji}</span>
        </button>
      )}
    </div>
  );
};

export default CabinExterior;
