/**
 * biomeMapping — maps a user's location to a biome key.
 *
 * getBiomeForLocation(countryCode, postalCode) → string biome key
 */

// US zip-code prefix → biome
const US_RANGES = [
  // Pacific Northwest: WA, OR
  { min: 970, max: 994, biome: 'pacific-northwest' },

  // California / Southwest: CA, AZ, NM, NV
  { min: 850, max: 869, biome: 'california-southwest' },
  { min: 890, max: 899, biome: 'california-southwest' },
  { min: 900, max: 969, biome: 'california-southwest' },

  // Mountain West: MT, WY, CO, UT, ID
  { min: 590, max: 599, biome: 'mountain-west' },
  { min: 800, max: 849, biome: 'mountain-west' },
  { min: 820, max: 839, biome: 'mountain-west' },

  // Midwest: OH, IN, IL, MI, WI, MN, IA, MO, NE, KS, ND, SD
  { min: 400, max: 499, biome: 'midwest' },
  { min: 500, max: 589, biome: 'midwest' },
  { min: 600, max: 699, biome: 'midwest' },

  // Northeast: New England, NY, NJ, PA, MD, VA, WV
  { min: 10,  max: 99,  biome: 'northeast' },
  { min: 100, max: 199, biome: 'northeast' },
  { min: 200, max: 269, biome: 'northeast' },

  // Southeast: NC, SC, GA, FL, AL, MS, TN, KY, LA, AR, TX east
  { min: 270, max: 399, biome: 'southeast' },
  { min: 700, max: 799, biome: 'southeast' },
];

// Country code → biome
const COUNTRY_MAP = {
  GB: 'british-isles',
  IE: 'british-isles',
  ES: 'mediterranean',
  PT: 'mediterranean',
  IT: 'mediterranean',
  GR: 'mediterranean',
  HR: 'mediterranean',
  FR: 'mediterranean',   // simplified — southern France
  NO: 'nordic',
  SE: 'nordic',
  FI: 'nordic',
  DK: 'nordic',
  IS: 'nordic',
};

/**
 * Determine the biome for a given location.
 * @param {string} [countryCode] — ISO 3166-1 alpha-2 (e.g. 'US', 'GB')
 * @param {string} [postalCode]  — zip or postal code
 * @returns {string} biome key
 */
export function getBiomeForLocation(countryCode, postalCode) {
  const cc = (countryCode || '').toUpperCase().trim();

  // US zip-code lookup
  if (cc === 'US' && postalCode) {
    const prefix = parseInt(postalCode.replace(/\D/g, '').slice(0, 3), 10);
    if (!isNaN(prefix)) {
      for (const range of US_RANGES) {
        if (prefix >= range.min && prefix <= range.max) {
          return range.biome;
        }
      }
    }
    // US zip not matched — default PNW
    return 'pacific-northwest';
  }

  // International country lookup
  if (cc && COUNTRY_MAP[cc]) {
    return COUNTRY_MAP[cc];
  }

  return 'default';
}

export default getBiomeForLocation;
