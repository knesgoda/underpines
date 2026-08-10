import { describe, expect, it } from 'vitest';
import {
  toTimeSlot, seasonFor, deriveEnvironment, interiorLightLevel,
} from '@/lib/cabin/environment';

describe('environment normalization', () => {
  it('collapses the scene’s granular times into five slots', () => {
    expect(toTimeSlot('pre-dawn')).toBe('dawn');
    expect(toTimeSlot('dawn')).toBe('dawn');
    expect(toTimeSlot('morning')).toBe('morning');
    expect(toTimeSlot('afternoon')).toBe('afternoon');
    expect(toTimeSlot('golden-hour')).toBe('dusk');
    expect(toTimeSlot('sunset')).toBe('dusk');
    expect(toTimeSlot('dusk')).toBe('dusk');
    expect(toTimeSlot('night')).toBe('night');
    expect(toTimeSlot('anything-else')).toBe('night');
  });

  it('knows which hemisphere winter is in', () => {
    const january = new Date(2027, 0, 15);
    const july = new Date(2027, 6, 15);
    expect(seasonFor(january, 47.6)).toBe('winter');
    expect(seasonFor(july, 47.6)).toBe('summer');
    expect(seasonFor(january, -41.3)).toBe('summer');
    expect(seasonFor(july, -41.3)).toBe('winter');
    // no latitude → assume northern, the network's default
    expect(seasonFor(january, null)).toBe('winter');
  });

  it('derives one normalized state for every consumer', () => {
    const s = deriveEnvironment({
      timeOfDay: 'golden-hour',
      condition: 'light-rain',
      isRaining: true,
      isSnowing: false,
      windIntensity: 'moderate',
      temperature: 12,
      latitude: 47.6,
      now: new Date(2027, 9, 20),
    });
    expect(s).toEqual({
      slot: 'dusk',
      season: 'autumn',
      weather: 'light-rain',
      isRaining: true,
      isSnowing: false,
      windIntensity: 'moderate',
      temperature: 12,
    });
  });

  it('lamps come on at dusk, peak at night, off midday', () => {
    expect(interiorLightLevel('afternoon')).toBe(0);
    expect(interiorLightLevel('dusk')).toBeGreaterThan(interiorLightLevel('morning'));
    expect(interiorLightLevel('night')).toBe(1);
  });
});
