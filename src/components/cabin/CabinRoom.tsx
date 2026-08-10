/**
 * CabinRoom — the interior. Wood, window, fire, and everything placed.
 *
 * Pure presentation: placements, fixtures, pets and lighting all arrive as
 * props; every interactive thing is a real <button> so the room works by
 * touch, mouse, keyboard, and screen reader alike. Positions come from the
 * zone table; the DB trigger already guaranteed each item belongs where it
 * stands.
 */
import { useEffect, useMemo, useState } from 'react';
import type { CabinPlacementView, CabinPetView, CabinConfig } from '@/lib/cabinApi';
import { INTERIOR_ZONES, zoneByKey } from '@/lib/cabin/zones';
import { CABIN_FIXTURES, type CabinFixture, type FixtureAction } from '@/lib/cabin/fixtures';
import { interiorLightLevel, type TimeSlot } from '@/lib/cabin/environment';
import {
  pickBehavior, behaviorDurationMs, SPOT_FOR_BEHAVIOR,
  type PetBehavior, type PetContext, type PetSpot,
} from '@/lib/cabin/petBrain';

const PET_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', rabbit: '🐇', bird: '🐦', fish: '🐠', hamster: '🐹', turtle: '🐢',
};

const SPOT_POS: Record<PetSpot, { x: number; y: number }> = {
  pet_bed: { x: 88, y: 84 },
  fireplace: { x: 70, y: 80 },
  window: { x: 50, y: 52 },
  floor: { x: 42, y: 82 },
  doorway: { x: 8, y: 80 },
};

const BEHAVIOR_LINE: Record<PetBehavior, (name: string) => string> = {
  idle: n => `${n} is pottering around.`,
  sleep: n => `${n} is asleep.`,
  walk: n => `${n} is on a small patrol.`,
  sit: n => `${n} is sitting, thinking pet thoughts.`,
  window_watch: n => `${n} is watching the window.`,
  fireplace_rest: n => `${n} is curled up by the fire.`,
  beg: n => `${n} would like to discuss the food situation.`,
  play: n => `${n} is playing.`,
  hide: n => `${n} is hiding somewhere cozy.`,
  greet: n => `${n} came to say hello.`,
};

/** Window sky colors per slot — the room's view of the world outside. */
const WINDOW_SKY: Record<TimeSlot, string> = {
  dawn: 'linear-gradient(to bottom, #f4a460, #87ceeb)',
  morning: 'linear-gradient(to bottom, #87ceeb, #b0d4f1)',
  afternoon: 'linear-gradient(to bottom, #87ceeb, #6bb3e0)',
  dusk: 'linear-gradient(to bottom, #8b4789, #2d1b4e)',
  night: 'linear-gradient(to bottom, #0c1445, #1a1a3e)',
};

const WEATHER_GLYPH: Record<string, string> = {
  'light-rain': '🌧️', 'heavy-rain': '🌧️', thunderstorm: '⛈️',
  'light-snow': '🌨️', 'heavy-snow': '🌨️', fog: '🌫️', hail: '🌨️',
};

export interface RoomPet extends CabinPetView {
  behavior: PetBehavior;
}

interface CabinRoomProps {
  cabin: CabinConfig;
  placements: CabinPlacementView[];
  pets: CabinPetView[];
  slot: TimeSlot;
  weather: string;
  isOwner: boolean;
  petContext: PetContext;
  reducedMotion: boolean;
  onInspectItem: (p: CabinPlacementView) => void;
  onFixture: (action: FixtureAction) => void;
  onToggleCurtains?: () => void;
  onPetTap: (pet: RoomPet) => void;
}

const CabinRoom = ({
  cabin, placements, pets, slot, weather, isOwner, petContext,
  reducedMotion, onInspectItem, onFixture, onToggleCurtains, onPetTap,
}: CabinRoomProps) => {
  const light = cabin.auto_lighting ? interiorLightLevel(slot) : 0.25;
  const interior = placements.filter(p => zoneByKey.get(p.zone) && zoneByKey.get(p.zone)!.area !== 'exterior');

  // Pet behavior loop: pick a behavior, hold it, re-roll. Reduced motion
  // pins everyone to their favorite resting spots instead.
  const [behaviors, setBehaviors] = useState<Record<string, PetBehavior>>({});
  const activePets = useMemo(
    () => pets.filter(p => !p.is_resting).slice(0, 3),
    [pets],
  );

  useEffect(() => {
    if (reducedMotion) {
      const still: Record<string, PetBehavior> = {};
      activePets.forEach((p, i) => { still[p.id] = i === 0 ? 'fireplace_rest' : 'sleep'; });
      setBehaviors(still);
      return;
    }
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const loop = (petId: string, traits: string[]) => {
      if (cancelled) return;
      const behavior = pickBehavior(traits, petContext);
      setBehaviors(prev => ({ ...prev, [petId]: behavior }));
      timers.push(setTimeout(() => loop(petId, traits), behaviorDurationMs(behavior)));
    };
    activePets.forEach(p => loop(p.id, p.personality_traits ?? []));
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [activePets, petContext, reducedMotion]);

  const fixtures = CABIN_FIXTURES.filter(f => (isOwner ? f.ownerAction : f.visitorAction));

  return (
    <div
      className={`cabin-room theme-${cabin.theme} ${reducedMotion ? 'cabin-still' : ''}`}
      style={{ '--room-light': light } as React.CSSProperties}
      data-testid="cabin-room"
    >
      {/* Walls, floor, ceiling beam */}
      <div className="cabin-room-walls" aria-hidden="true" />
      <div className="cabin-room-floor" aria-hidden="true" />

      {/* Window with the world outside */}
      <div className={`cabin-window window-${cabin.window_style}`} aria-hidden={!onToggleCurtains}>
        <div className="cabin-window-sky" style={{ background: WINDOW_SKY[slot] }}>
          {WEATHER_GLYPH[weather] && <span className="cabin-window-weather">{WEATHER_GLYPH[weather]}</span>}
          {slot === 'night' && <span className="cabin-window-stars" aria-hidden="true">✦ ✧ ✦</span>}
          <span className="cabin-window-trees" aria-hidden="true">🌲🌲🌲</span>
        </div>
        <div className={`cabin-curtains curtains-${cabin.curtain_state}`} aria-hidden="true" />
        {onToggleCurtains && (
          <button
            type="button"
            className="cabin-curtain-toggle"
            onClick={onToggleCurtains}
            aria-label={`Curtains: ${cabin.curtain_state}. Toggle.`}
            title={`Curtains: ${cabin.curtain_state}`}
          >
            {cabin.curtain_state === 'open' ? '🪟' : '🎪'}
          </button>
        )}
      </div>

      {/* Fireplace */}
      <div className="cabin-fireplace" aria-hidden="true">
        <div className="cabin-fire" data-lit={light > 0.05 || slot === 'dusk' || slot === 'night'}>
          <span className="flame">🔥</span>
        </div>
      </div>

      {/* Warm-light wash over the whole room */}
      <div className="cabin-light-wash" aria-hidden="true" />

      {/* Placed decor */}
      {interior.map(p => {
        const z = zoneByKey.get(p.zone)!;
        return (
          <button
            key={p.id}
            type="button"
            className="cabin-item"
            style={{ left: `${z.x + p.slot * 4}%`, top: `${z.y}%` }}
            onClick={() => onInspectItem(p)}
            aria-label={`${p.custom_name || p.name}, ${z.label}`}
            title={p.custom_name || p.name}
          >
            <span aria-hidden="true">{p.emoji}</span>
          </button>
        );
      })}

      {/* Fixtures */}
      {fixtures.map((f: CabinFixture) => (
        <button
          key={f.key}
          type="button"
          className="cabin-fixture"
          style={{ left: `${f.x}%`, top: `${f.y}%` }}
          onClick={() => onFixture((isOwner ? f.ownerAction : f.visitorAction)!)}
          aria-label={`${f.label}. ${isOwner ? f.ownerHint : f.visitorHint}`}
          title={f.label}
        >
          <span aria-hidden="true">{f.emoji}</span>
        </button>
      ))}

      {/* Pets */}
      {activePets.map(p => {
        const behavior = behaviors[p.id] ?? 'idle';
        const pos = SPOT_POS[SPOT_FOR_BEHAVIOR[behavior]];
        return (
          <button
            key={p.id}
            type="button"
            className={`cabin-pet pet-${behavior}`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            onClick={() => onPetTap({ ...p, behavior })}
            aria-label={BEHAVIOR_LINE[behavior](p.name)}
            title={p.name}
          >
            <span aria-hidden="true">{PET_EMOJI[p.animal_type] ?? '🐾'}</span>
            {p.is_memorial && <span className="pet-memorial" aria-hidden="true">✨</span>}
            {behavior === 'sleep' && <span className="pet-zzz" aria-hidden="true">💤</span>}
          </button>
        );
      })}
    </div>
  );
};

export default CabinRoom;
