/**
 * Environment normalization — one derived state, many consumers (spec §92).
 *
 * The scene keeps its own richer internals (useSolarCycle's eight-way time,
 * useWeather's WMO mapping); this module flattens those into the normalized
 * vocabulary the server's event engine and the pet brain share:
 *
 *   slot:    dawn | morning | afternoon | dusk | night
 *   season:  spring | summer | autumn | winter
 *   weather: clear | partly-cloudy | overcast | fog | light-rain | heavy-rain
 *          | light-snow | heavy-snow | thunderstorm | hail
 */

export type TimeSlot = 'dawn' | 'morning' | 'afternoon' | 'dusk' | 'night';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface EnvironmentState {
  slot: TimeSlot;
  season: Season;
  weather: string;
  isRaining: boolean;
  isSnowing: boolean;
  windIntensity: string;
  temperature: number | null;
}

/** Collapse the scene's granular time-of-day into the shared five slots. */
export const toTimeSlot = (timeOfDay: string): TimeSlot => {
  switch (timeOfDay) {
    case 'pre-dawn':
    case 'dawn':
      return 'dawn';
    case 'morning':
      return 'morning';
    case 'afternoon':
      return 'afternoon';
    case 'golden-hour':
    case 'sunset':
    case 'dusk':
      return 'dusk';
    default:
      return 'night';
  }
};

/**
 * Season by month, hemisphere-aware — a cabin "in" the Norwegian fjords and
 * one in the mountains of the north island would disagree otherwise.
 */
export const seasonFor = (date: Date, latitude: number | null | undefined): Season => {
  const m = date.getMonth();
  const northern = latitude == null || latitude >= 0;
  const bySouth: Record<number, Season> = { 0: 'summer', 1: 'summer', 2: 'autumn', 3: 'autumn', 4: 'autumn', 5: 'winter', 6: 'winter', 7: 'winter', 8: 'spring', 9: 'spring', 10: 'spring', 11: 'summer' };
  const byNorth: Record<number, Season> = { 0: 'winter', 1: 'winter', 2: 'spring', 3: 'spring', 4: 'spring', 5: 'summer', 6: 'summer', 7: 'summer', 8: 'autumn', 9: 'autumn', 10: 'autumn', 11: 'winter' };
  return northern ? byNorth[m] : bySouth[m];
};

export interface EnvironmentInputs {
  timeOfDay: string;
  condition: string;
  isRaining: boolean;
  isSnowing: boolean;
  windIntensity: string;
  temperature: number | null;
  latitude: number | null;
  now?: Date;
}

export const deriveEnvironment = (i: EnvironmentInputs): EnvironmentState => ({
  slot: toTimeSlot(i.timeOfDay),
  season: seasonFor(i.now ?? new Date(), i.latitude),
  weather: i.condition || 'clear',
  isRaining: i.isRaining,
  isSnowing: i.isSnowing,
  windIntensity: i.windIntensity || 'calm',
  temperature: i.temperature,
});

/**
 * Automatic cabin lighting (spec §15): how "on" the warm interior light is,
 * 0–1. Fully off midday, warming through dusk, full at night. The renderer
 * turns this into lamp glow and window contrast; owners can disable it.
 */
export const interiorLightLevel = (slot: TimeSlot): number => {
  switch (slot) {
    case 'night':
      return 1;
    case 'dusk':
      return 0.75;
    case 'dawn':
      return 0.5;
    case 'morning':
      return 0.15;
    default:
      return 0;
  }
};
