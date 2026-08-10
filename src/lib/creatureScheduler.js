/**
 * creatureScheduler.js — Determines when a creature appears in a user's cabin scene.
 *
 * Uses a seeded PRNG so appearances are deterministic per user-per-day
 * but feel random. Supports multiple appearance windows per day.
 * Respects activeHours, weatherTrigger, and seasonLock.
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
  return hash >>> 0;
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

// Map creature's activeHours to hour ranges
const HOUR_RANGES = {
  dawn:      [5, 7],
  morning:   [7, 12],
  afternoon: [12, 17],
  dusk:      [17, 20],
  night:     [20, 5],
};

// How many appearance windows per day by tier
const WINDOWS_PER_DAY = {
  common:    3,
  uncommon:  2,
  rare:      1,
  legendary: 1,
};

// How often a creature gets a day with appearances (1 = every day)
const APPEARANCE_CHANCE = {
  common:    1.0,   // every day
  uncommon:  0.4,   // ~2-3 days
  rare:      0.15,  // ~once a week
  legendary: 0.07,  // ~once every 2 weeks
};

/**
 * Get all appearance windows for a creature today, and whether
 * the current time falls within one of them.
 *
 * @param {string} creatureKey
 * @param {string} userId
 * @param {Date}   currentTime
 * @param {object} [conditions] — { weather?: string, season?: string }
 * @returns {{ appearsAt: Date, duration: number, variant: number, direction: 'ltr'|'rtl', isActive: boolean, delayMs: number } | null}
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
    if (weather) return null;
  }

  // ── Seed for today ──
  const dayKey = currentTime.toISOString().slice(0, 10);
  const seed = hashString(`${userId}-${creatureKey}-${dayKey}`);
  const rng = mulberry32(seed);

  // ── Does this creature appear today? ──
  const tier = creature.tier || 'common';
  const chance = APPEARANCE_CHANCE[tier] ?? 1.0;
  if (rng() > chance) return null;

  // ── Generate multiple appearance windows ──
  const windowCount = WINDOWS_PER_DAY[tier] ?? 1;
  const activeSlots = creature.activeHours;
  const duration = creature.animationDuration;

  for (let w = 0; w < windowCount; w++) {
    // Pick a slot for this window
    const slotSeed = hashString(`${userId}-${creatureKey}-${dayKey}-w${w}`);
    const wRng = mulberry32(slotSeed);

    const slotIndex = Math.floor(wRng() * activeSlots.length);
    const chosenSlot = activeSlots[slotIndex];
    const [startHour, endHour] = HOUR_RANGES[chosenSlot] || [8, 12];

    const appearsAt = new Date(currentTime);
    appearsAt.setHours(0, 0, 0, 0);

    if (chosenSlot === 'night' && startHour > endHour) {
      const nightHour = wRng() < 0.7
        ? startHour + wRng() * (24 - startHour)
        : wRng() * endHour;
      appearsAt.setHours(Math.floor(nightHour), Math.floor(wRng() * 60));
    } else {
      const hour = startHour + wRng() * (endHour - startHour);
      appearsAt.setHours(Math.floor(hour), Math.floor(wRng() * 60));
    }

    // Window is active for duration + 90s buffer (for random delay)
    const windowEnd = new Date(appearsAt.getTime() + (duration + 90) * 1000);

    // Check if current time is within this window
    const currentSlot = getTimeSlot(currentTime);
    const isInWindow = currentTime >= appearsAt && currentTime <= windowEnd;
    const isRightTimeOfDay = activeSlots.includes(currentSlot);

    if (isInWindow && isRightTimeOfDay) {
      // Random delay 0–90s so it doesn't fire instantly
      const delayMs = Math.floor(wRng() * 90000);
      const variant = Math.floor(wRng() * 3);
      const direction = wRng() < 0.5 ? 'ltr' : 'rtl';

      return {
        appearsAt,
        duration,
        variant,
        direction,
        isActive: true,
        delayMs,
      };
    }
  }

  return null;
}

/**
 * Check if a creature should be visible right now.
 */
export function isCreatureVisible(creatureKey, userId, conditions = {}) {
  const result = getNextAppearance(creatureKey, userId, new Date(), conditions);
  return result?.isActive ?? false;
}

export default getNextAppearance;
