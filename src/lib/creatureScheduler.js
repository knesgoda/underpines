/**
 * creatureScheduler.js — Determines when a creature appears in a user's cabin scene.
 *
 * Uses a seeded PRNG so appearances are deterministic per user-per-day
 * but feel random. Respects activeHours, weatherTrigger, and seasonLock.
 */

import { creatureMap } from '@/config/creatures';

// ── Seeded PRNG (Mulberry32) ──────────────────────────────────────
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0; // unsigned
}

// ── Time-of-day helpers ───────────────────────────────────────────
function getTimeSlot(date) {
  const h = date.getHours();
  if (h >= 5 && h < 7) return 'dawn';
  if (h >= 7 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 20) return 'dusk';
  return 'night';
}

/**
 * Get the next (or current) appearance window for a creature.
 *
 * @param {string} creatureKey
 * @param {string} userId
 * @param {Date}   currentTime
 * @param {object} [conditions] — { weather?: string, season?: string }
 * @returns {{ appearsAt: Date, duration: number, variant: number, direction: 'ltr'|'rtl', isActive: boolean } | null}
 */
export function getNextAppearance(creatureKey, userId, currentTime, conditions = {}) {
  const creature = creatureMap[creatureKey];
  if (!creature) return null;

  const { weather, season } = conditions;

  // ── Season lock check ──
  if (creature.seasonLock && season && creature.seasonLock !== season) {
    return null;
  }

  // ── Weather trigger check ──
  if (creature.weatherTrigger && weather && creature.weatherTrigger !== weather) {
    // Weather-triggered creatures only appear when their weather is active
    // If no weather info provided, we allow the appearance (optimistic)
    if (weather) return null;
  }

  // ── Seed for today ──
  const dayKey = currentTime.toISOString().slice(0, 10); // YYYY-MM-DD
  const seed = hashString(`${userId}-${creatureKey}-${dayKey}`);
  const rng = mulberry32(seed);

  // ── Determine appearance time for today ──
  const { minHours, maxHours } = creature.frequency;
  const intervalHours = minHours + rng() * (maxHours - minHours);

  // Map creature's activeHours to hour ranges
  const hourRanges = {
    dawn:      [5, 7],
    morning:   [7, 12],
    afternoon: [12, 17],
    dusk:      [17, 20],
    night:     [20, 5], // wraps
  };

  // Pick one of the creature's active time slots for today
  const activeSlots = creature.activeHours;
  const slotIndex = Math.floor(rng() * activeSlots.length);
  const chosenSlot = activeSlots[slotIndex];
  const [startHour, endHour] = hourRanges[chosenSlot] || [8, 12];

  // Compute appearance time within the chosen slot
  const appearsAt = new Date(currentTime);
  appearsAt.setHours(0, 0, 0, 0); // start of day

  if (chosenSlot === 'night' && startHour > endHour) {
    // Night wraps — pick between 20–23 or 0–5
    const nightHour = rng() < 0.7
      ? startHour + rng() * (24 - startHour)
      : rng() * endHour;
    appearsAt.setHours(Math.floor(nightHour), Math.floor(rng() * 60));
  } else {
    const hour = startHour + rng() * (endHour - startHour);
    appearsAt.setHours(Math.floor(hour), Math.floor(rng() * 60));
  }

  // ── Determine if we're currently within the appearance window ──
  const duration = creature.animationDuration;
  const endTime = new Date(appearsAt.getTime() + duration * 1000);

  const isActive =
    currentTime >= appearsAt &&
    currentTime <= endTime &&
    creature.activeHours.includes(getTimeSlot(currentTime));

  // ── Animation variant & direction ──
  const variant = Math.floor(rng() * 3); // 0, 1, or 2
  const direction = rng() < 0.5 ? 'ltr' : 'rtl';

  return {
    appearsAt,
    duration,
    variant,
    direction,
    isActive,
  };
}

/**
 * Check if a creature should be visible right now.
 * Convenience wrapper around getNextAppearance.
 */
export function isCreatureVisible(creatureKey, userId, conditions = {}) {
  const result = getNextAppearance(creatureKey, userId, new Date(), conditions);
  return result?.isActive ?? false;
}

export default getNextAppearance;
