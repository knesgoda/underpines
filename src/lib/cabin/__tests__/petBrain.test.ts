import { describe, expect, it } from 'vitest';
import {
  behaviorWeights, pickBehavior, behaviorDurationMs, SPOT_FOR_BEHAVIOR,
  PET_TRAITS, MAX_TRAITS, type PetContext,
} from '@/lib/cabin/petBrain';
import type { EnvironmentState } from '@/lib/cabin/environment';

const env = (over: Partial<EnvironmentState> = {}): EnvironmentState => ({
  slot: 'afternoon',
  season: 'summer',
  weather: 'clear',
  isRaining: false,
  isSnowing: false,
  windIntensity: 'calm',
  temperature: 20,
  ...over,
});

const ctx = (over: Partial<PetContext> = {}): PetContext => ({
  env: env(),
  visitorPresent: false,
  wildlifeVisible: false,
  cookingActive: false,
  ...over,
});

describe('petBrain', () => {
  it('a sleepy pet sleeps more than it plays', () => {
    const w = behaviorWeights(['sleepy'], ctx());
    expect(w.sleep).toBeGreaterThan(w.play);
    expect(w.sleep).toBeGreaterThan(behaviorWeights([], ctx()).sleep);
  });

  it('storm-nervous pets hide in thunderstorms; others do not', () => {
    const stormy = ctx({ env: env({ weather: 'thunderstorm' }) });
    expect(behaviorWeights(['storm_nervous'], stormy).hide)
      .toBeGreaterThan(behaviorWeights(['storm_nervous'], ctx()).hide);
    expect(behaviorWeights([], stormy).hide).toBe(behaviorWeights([], ctx()).hide);
  });

  it('a food-obsessed pet begs hard when something is cooking', () => {
    const cooking = ctx({ cookingActive: true });
    const obsessed = behaviorWeights(['food_obsessed'], cooking);
    const normal = behaviorWeights([], cooking);
    expect(obsessed.beg).toBeGreaterThan(normal.beg);
    expect(behaviorWeights(['food_obsessed'], ctx()).beg).toBe(0);
  });

  it('shy pets hide from visitors, friendly pets greet them', () => {
    const visited = ctx({ visitorPresent: true });
    expect(behaviorWeights(['shy'], visited).hide)
      .toBeGreaterThan(behaviorWeights(['shy'], visited).greet);
    expect(behaviorWeights(['friendly'], visited).greet)
      .toBeGreaterThan(behaviorWeights(['friendly'], ctx()).greet);
  });

  it('wildlife pulls a bird watcher to the window', () => {
    const wildlife = ctx({ wildlifeVisible: true });
    expect(behaviorWeights(['bird_watcher'], wildlife).window_watch)
      .toBeGreaterThan(behaviorWeights([], wildlife).window_watch);
  });

  it('night leans everyone toward sleep', () => {
    const night = ctx({ env: env({ slot: 'night' }) });
    expect(behaviorWeights([], night).sleep).toBeGreaterThan(behaviorWeights([], ctx()).sleep);
  });

  it('pickBehavior is deterministic under a fixed rng and always valid', () => {
    const first = pickBehavior(['sleepy'], ctx(), () => 0.01);
    const again = pickBehavior(['sleepy'], ctx(), () => 0.01);
    expect(first).toBe(again);
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      const b = pickBehavior(['chaotic', 'goofy'], ctx(), () => r);
      expect(Object.keys(SPOT_FOR_BEHAVIOR)).toContain(b);
    }
  });

  it('unknown traits are ignored rather than crashing', () => {
    expect(() => behaviorWeights(['definitely_not_a_trait'], ctx())).not.toThrow();
  });

  it('every behavior has a duration and a spot', () => {
    for (const b of Object.keys(SPOT_FOR_BEHAVIOR) as (keyof typeof SPOT_FOR_BEHAVIOR)[]) {
      expect(behaviorDurationMs(b, () => 0.5)).toBeGreaterThan(0);
      expect(SPOT_FOR_BEHAVIOR[b]).toBeTruthy();
    }
  });

  it('the trait vocabulary stays within the editor cap', () => {
    expect(PET_TRAITS.length).toBeGreaterThan(MAX_TRAITS);
    expect(new Set(PET_TRAITS).size).toBe(PET_TRAITS.length);
  });
});
