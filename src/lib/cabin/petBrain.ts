/**
 * petBrain — lightweight, personality-weighted behavior states (spec §37–38).
 *
 * Pure functions: (context, personality, rng) → next behavior. The renderer
 * owns timers and animation; nothing here touches the network or the DOM,
 * which is also what makes it testable. Every behavior is ambient — pets
 * never need anything and nothing here can go badly for them (§126: we don't
 * need pathfinding, we need Dawkins to curl up by the fire and feel like
 * Dawkins).
 */

import type { EnvironmentState } from './environment';

export type PetBehavior =
  | 'idle'
  | 'sleep'
  | 'walk'
  | 'sit'
  | 'window_watch'
  | 'fireplace_rest'
  | 'beg'
  | 'play'
  | 'hide'
  | 'greet';

export type PetSpot = 'pet_bed' | 'fireplace' | 'window' | 'floor' | 'doorway';

export const SPOT_FOR_BEHAVIOR: Record<PetBehavior, PetSpot> = {
  idle: 'floor',
  sleep: 'pet_bed',
  walk: 'floor',
  sit: 'floor',
  window_watch: 'window',
  fireplace_rest: 'fireplace',
  beg: 'floor',
  play: 'floor',
  hide: 'pet_bed',
  greet: 'doorway',
};

/** The trait vocabulary offered in the pet editor (spec §36). */
export const PET_TRAITS = [
  'sleepy', 'goofy', 'curious', 'chaotic', 'cuddly', 'independent',
  'food_obsessed', 'window_watcher', 'outdoorsy', 'shy', 'protective',
  'friendly', 'storm_nervous', 'bird_watcher', 'underfoot',
] as const;

export type PetTrait = (typeof PET_TRAITS)[number];

export const TRAIT_LABELS: Record<PetTrait, string> = {
  sleepy: 'Sleepy',
  goofy: 'Goofy',
  curious: 'Curious',
  chaotic: 'Chaotic',
  cuddly: 'Cuddly',
  independent: 'Independent',
  food_obsessed: 'Food obsessed',
  window_watcher: 'Window watcher',
  outdoorsy: 'Outdoorsy',
  shy: 'Shy',
  protective: 'Protective',
  friendly: 'Friendly',
  storm_nervous: 'Nervous during storms',
  bird_watcher: 'Bird watcher',
  underfoot: 'Always underfoot',
};

export const MAX_TRAITS = 4;
export const MAX_ACTIVE_PETS = 3;

export interface PetContext {
  env: EnvironmentState;
  visitorPresent: boolean;
  wildlifeVisible: boolean;
  cookingActive: boolean;
}

type Weights = Partial<Record<PetBehavior, number>>;

const BASE_WEIGHTS: Weights = {
  idle: 3,
  sleep: 2,
  walk: 2,
  sit: 2,
  window_watch: 1.5,
  fireplace_rest: 1.5,
  play: 1,
};

const TRAIT_WEIGHTS: Record<PetTrait, Weights> = {
  sleepy: { sleep: 4, fireplace_rest: 2, play: -0.7, walk: -1 },
  goofy: { play: 3, walk: 1 },
  curious: { window_watch: 2, walk: 1.5 },
  chaotic: { play: 2.5, walk: 2, sleep: -1 },
  cuddly: { fireplace_rest: 2.5, sit: 1.5 },
  independent: { sit: 2, window_watch: 1 },
  food_obsessed: {},                        // handled by cooking context below
  window_watcher: { window_watch: 4 },
  outdoorsy: { window_watch: 2, walk: 1.5 },
  shy: { hide: 1.5, sleep: 1 },
  protective: { sit: 1.5, window_watch: 1 },
  friendly: { greet: 1.5, play: 1 },
  storm_nervous: {},                        // handled by weather context below
  bird_watcher: { window_watch: 3 },
  underfoot: { walk: 2, idle: 1.5 },
};

const merge = (into: Record<PetBehavior, number>, w: Weights) => {
  for (const [k, v] of Object.entries(w)) {
    into[k as PetBehavior] = Math.max(0, (into[k as PetBehavior] ?? 0) + (v as number));
  }
};

/**
 * Behavior weights for a pet right now. Exported separately from the picker
 * so the tests can assert on the whole distribution, not just one sample.
 */
export function behaviorWeights(traits: string[], ctx: PetContext): Record<PetBehavior, number> {
  const w: Record<PetBehavior, number> = {
    idle: 0, sleep: 0, walk: 0, sit: 0, window_watch: 0,
    fireplace_rest: 0, beg: 0, play: 0, hide: 0, greet: 0,
  };
  merge(w, BASE_WEIGHTS);
  for (const t of traits) {
    const tw = TRAIT_WEIGHTS[t as PetTrait];
    if (tw) merge(w, tw);
  }

  // Night leans everyone toward sleep; the fire is best after dark.
  if (ctx.env.slot === 'night') {
    merge(w, { sleep: 3, fireplace_rest: 1.5, play: -1, walk: -1 });
  }
  if (ctx.env.slot === 'dawn' || ctx.env.slot === 'morning') {
    merge(w, { walk: 1, window_watch: 1 });
  }

  // Storms: nervous pets hide, everyone else mostly ignores it.
  if (ctx.env.weather === 'thunderstorm') {
    if (traits.includes('storm_nervous')) {
      merge(w, { hide: 8, sleep: 1 });
    } else {
      merge(w, { fireplace_rest: 1 });
    }
  }

  // Something is outside.
  if (ctx.wildlifeVisible) {
    const boost = traits.includes('bird_watcher') || traits.includes('curious')
      || traits.includes('protective') ? 6 : 2.5;
    merge(w, { window_watch: boost });
  }

  // Something is cooking.
  if (ctx.cookingActive) {
    merge(w, { beg: traits.includes('food_obsessed') ? 8 : 2 });
  }

  // Someone came over.
  if (ctx.visitorPresent) {
    if (traits.includes('shy')) {
      merge(w, { hide: 5 });
    } else if (traits.includes('friendly') || traits.includes('cuddly')) {
      merge(w, { greet: 5 });
    } else {
      merge(w, { greet: 1.5 });
    }
  }

  return w;
}

/** Weighted pick. `rng` defaults to Math.random; tests pass their own. */
export function pickBehavior(
  traits: string[],
  ctx: PetContext,
  rng: () => number = Math.random,
): PetBehavior {
  const w = behaviorWeights(traits, ctx);
  const entries = Object.entries(w).filter(([, v]) => v > 0) as [PetBehavior, number][];
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total <= 0) return 'idle';
  let r = rng() * total;
  for (const [behavior, weight] of entries) {
    r -= weight;
    if (r <= 0) return behavior;
  }
  return entries[entries.length - 1][0];
}

/** How long a behavior holds before re-rolling, in ms. Sleep is sticky. */
export function behaviorDurationMs(behavior: PetBehavior, rng: () => number = Math.random): number {
  const ranges: Record<PetBehavior, [number, number]> = {
    idle: [8000, 16000],
    sleep: [45000, 120000],
    walk: [6000, 10000],
    sit: [12000, 25000],
    window_watch: [15000, 40000],
    fireplace_rest: [40000, 90000],
    beg: [8000, 15000],
    play: [8000, 14000],
    hide: [20000, 45000],
    greet: [6000, 10000],
  };
  const [lo, hi] = ranges[behavior];
  return lo + rng() * (hi - lo);
}
