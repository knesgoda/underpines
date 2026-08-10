/**
 * Moon phase utilities — deterministic astronomical calculation.
 * No API required. Works offline.
 */

const KNOWN_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime();
const SYNODIC_MONTH = 29.53059; // days
const MS_PER_DAY = 86400000;

/**
 * Returns the current moon phase as a value 0–1
 * 0 = new moon, 0.25 = first quarter, 0.5 = full moon, 0.75 = last quarter
 */
export function getMoonPhase(date: Date = new Date()): number {
  const daysSince = (date.getTime() - KNOWN_NEW_MOON) / MS_PER_DAY;
  const phase = (daysSince % SYNODIC_MONTH) / SYNODIC_MONTH;
  return phase < 0 ? phase + 1 : phase;
}

export type MoonPhaseName =
  | 'new-moon'
  | 'waxing-crescent'
  | 'first-quarter'
  | 'waxing-gibbous'
  | 'full-moon'
  | 'waning-gibbous'
  | 'last-quarter'
  | 'waning-crescent';

export function getMoonPhaseName(phase: number): MoonPhaseName {
  if (phase < 0.0625 || phase >= 0.9375) return 'new-moon';
  if (phase < 0.1875) return 'waxing-crescent';
  if (phase < 0.3125) return 'first-quarter';
  if (phase < 0.4375) return 'waxing-gibbous';
  if (phase < 0.5625) return 'full-moon';
  if (phase < 0.6875) return 'waning-gibbous';
  if (phase < 0.8125) return 'last-quarter';
  return 'waning-crescent';
}

const DISPLAY_NAMES: Record<MoonPhaseName, string> = {
  'new-moon': 'New Moon',
  'waxing-crescent': 'Waxing Crescent',
  'first-quarter': 'First Quarter',
  'waxing-gibbous': 'Waxing Gibbous',
  'full-moon': 'Full Moon',
  'waning-gibbous': 'Waning Gibbous',
  'last-quarter': 'Last Quarter',
  'waning-crescent': 'Waning Crescent',
};

export function getMoonPhaseDisplayName(phase: number): string {
  return DISPLAY_NAMES[getMoonPhaseName(phase)];
}

/**
 * Days until the next occurrence of a target phase value.
 */
function daysToPhase(currentPhase: number, targetPhase: number): number {
  let diff = targetPhase - currentPhase;
  if (diff < 0) diff += 1;
  return Math.round(diff * SYNODIC_MONTH);
}

export function getMoonPhaseDescription(phase: number): string {
  const name = getMoonPhaseDisplayName(phase);
  const daysToFull = daysToPhase(phase, 0.5);
  const daysToNew = daysToPhase(phase, 0);

  if (getMoonPhaseName(phase) === 'full-moon') {
    return `${name} · The Pines are bright tonight`;
  }
  if (getMoonPhaseName(phase) === 'new-moon') {
    return `${name} · The darkest night`;
  }
  if (daysToFull <= 14) {
    return `${name} · ${daysToFull} day${daysToFull !== 1 ? 's' : ''} to Full Moon`;
  }
  return `${name} · ${daysToNew} day${daysToNew !== 1 ? 's' : ''} to New Moon`;
}

/**
 * Star opacity should dim during bright moon phases.
 * Full moon → 0.4, New moon → 1.0
 */
export function getStarOpacityForPhase(phase: number): number {
  // Illumination peaks at 0.5 (full), min at 0 (new)
  const illumination = 1 - Math.abs(2 * phase - 1); // 0 at new, 1 at full
  return 1 - illumination * 0.6; // ranges 1.0 → 0.4
}
