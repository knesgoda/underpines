/**
 * biomeMapping.ts — Maps a member's postal code + country to a biome key.
 *
 * US: uses 3-digit zip prefix ranges.
 * International: uses country code.
 */

const US_RANGES: Array<{ min: number; max: number; biome: string }> = [
  { min: 10,  max: 99,  biome: 'northeast' },
  { min: 100, max: 199, biome: 'northeast' },
  { min: 200, max: 269, biome: 'northeast' },
  { min: 270, max: 349, biome: 'southeast' },
  { min: 350, max: 399, biome: 'southeast' },
  { min: 400, max: 499, biome: 'midwest' },
  { min: 500, max: 588, biome: 'midwest' },
  { min: 590, max: 599, biome: 'mountain-west' },
  { min: 600, max: 699, biome: 'midwest' },
  { min: 700, max: 799, biome: 'southeast' },
  { min: 800, max: 816, biome: 'mountain-west' },
  { min: 820, max: 831, biome: 'mountain-west' },
  { min: 832, max: 838, biome: 'mountain-west' },
  { min: 840, max: 847, biome: 'mountain-west' },
  { min: 850, max: 865, biome: 'california-sw' },
  { min: 870, max: 884, biome: 'california-sw' },
  { min: 889, max: 899, biome: 'california-sw' },
  { min: 900, max: 935, biome: 'california-sw' },
  { min: 936, max: 966, biome: 'california-sw' },
  // 967–968: default (Hawaii / misc)
  { min: 970, max: 979, biome: 'pacific-northwest' },
  { min: 980, max: 994, biome: 'pacific-northwest' },
  { min: 995, max: 999, biome: 'pacific-northwest' },
];

const COUNTRY_BIOME: Record<string, string> = {
  GB: 'british-isles',
  IE: 'british-isles',
  ES: 'mediterranean',
  PT: 'mediterranean',
  IT: 'mediterranean',
  GR: 'mediterranean',
  HR: 'mediterranean',
  FR: 'mediterranean',
  NO: 'nordic',
  SE: 'nordic',
  FI: 'nordic',
  DK: 'nordic',
  IS: 'nordic',
};

/**
 * Determine the biome key for a given postal code and country.
 */
export function getBiomeFromLocation(postalCode: string, countryCode: string): string {
  const cc = (countryCode || '').toUpperCase().trim();

  if (cc === 'US' && postalCode) {
    const prefix = parseInt(postalCode.replace(/\D/g, '').slice(0, 3), 10);
    if (!isNaN(prefix)) {
      for (const range of US_RANGES) {
        if (prefix >= range.min && prefix <= range.max) {
          return range.biome;
        }
      }
    }
    return 'default';
  }

  if (cc && COUNTRY_BIOME[cc]) {
    return COUNTRY_BIOME[cc];
  }

  return 'default';
}
