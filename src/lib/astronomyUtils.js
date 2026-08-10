/**
 * Astronomical utilities — pure math, no dependencies.
 * Moon phase, equinox/solstice dates, seasonal event mapping.
 */

const J2000_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime();
const LUNAR_CYCLE_MS = 29.53059 * 24 * 60 * 60 * 1000;

/**
 * Calculate lunar phase for a given date.
 * @param {Date} date
 * @returns {{ phase: string, cyclePosition: number, illumination: number, isVisible: boolean, isWaxing: boolean }}
 */
export function getMoonPhase(date = new Date()) {
  const elapsed = date.getTime() - J2000_NEW_MOON;
  const cyclePosition = ((elapsed % LUNAR_CYCLE_MS) / LUNAR_CYCLE_MS + 1) % 1;
  const illumination = Math.abs(Math.cos(cyclePosition * 2 * Math.PI));

  let phase;
  if (cyclePosition < 0.035 || cyclePosition >= 0.965) phase = 'new';
  else if (cyclePosition < 0.22) phase = 'waxing-crescent';
  else if (cyclePosition < 0.28) phase = 'first-quarter';
  else if (cyclePosition < 0.47) phase = 'waxing-gibbous';
  else if (cyclePosition < 0.53) phase = 'full';
  else if (cyclePosition < 0.72) phase = 'waning-gibbous';
  else if (cyclePosition < 0.78) phase = 'last-quarter';
  else phase = 'waning-crescent';

  return {
    phase,
    cyclePosition,
    illumination,
    isVisible: phase !== 'new',
    isWaxing: cyclePosition < 0.5,
  };
}

/**
 * Calculate equinox/solstice date using Jean Meeus algorithm (Chapter 27).
 * Accurate to ~15 minutes for 1951–2050.
 * @param {number} year
 * @param {'march-equinox'|'june-solstice'|'september-equinox'|'december-solstice'} event
 * @returns {Date}
 */
export function getEquinoxSolstice(year, event) {
  const Y = (year - 2000) / 1000;
  const Y2 = Y * Y;
  const Y3 = Y2 * Y;
  const Y4 = Y3 * Y;

  const JDE0 = {
    'march-equinox':     2451623.80984 + 365242.37404 * Y + 0.05169 * Y2 - 0.00411 * Y3 - 0.00057 * Y4,
    'june-solstice':     2451716.56767 + 365241.62603 * Y + 0.00325 * Y2 + 0.00888 * Y3 - 0.00030 * Y4,
    'september-equinox': 2451810.21715 + 365242.01767 * Y - 0.11575 * Y2 + 0.00337 * Y3 + 0.00078 * Y4,
    'december-solstice': 2451900.05952 + 365242.74049 * Y - 0.06223 * Y2 - 0.00823 * Y3 + 0.00032 * Y4,
  }[event];

  const unixMs = (JDE0 - 2440587.5) * 86400000;
  return new Date(unixMs);
}

const FIXED_FESTIVALS = {
  imbolc:  { month: 1, day: 1  },
  beltane: { month: 4, day: 1  },
  lammas:  { month: 7, day: 1  },
  samhain: { month: 9, day: 31 },
};

const ASTRONOMICAL_EVENTS = {
  ostara: 'march-equinox',
  litha:  'june-solstice',
  mabon:  'september-equinox',
  yule:   'december-solstice',
};

/**
 * Get the date of an Under Pines seasonal event.
 * @param {string} eventKey
 * @param {number} year
 * @returns {Date|null}
 */
export function getSeasonalEventDate(eventKey, year = new Date().getFullYear()) {
  const fixed = FIXED_FESTIVALS[eventKey];
  if (fixed) {
    return new Date(year, fixed.month, fixed.day, 0, 0, 0);
  }

  const astroKey = ASTRONOMICAL_EVENTS[eventKey];
  if (astroKey) {
    const exact = getEquinoxSolstice(year, astroKey);
    return new Date(exact.getFullYear(), exact.getMonth(), exact.getDate(), 0, 0, 0);
  }

  return null;
}

/**
 * Convenience props for SVG moon rendering.
 * @param {Date} date
 * @returns {object}
 */
export function getMoonSVGProps(date = new Date()) {
  const moon = getMoonPhase(date);
  const terminatorRx = Math.abs(Math.cos(moon.cyclePosition * 2 * Math.PI));

  return {
    ...moon,
    clipDirection: moon.cyclePosition < 0.5 ? 'right' : 'left',
    darkEllipseRx: terminatorRx,
    moonColor: '#e8f0f8',
    darkColor: 'rgba(15, 23, 42, 0.92)',
  };
}
