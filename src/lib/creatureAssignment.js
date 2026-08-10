/**
 * creatureAssignment.js — Assigns a creature to a user at signup.
 *
 * The creature key is stored on the user record and never changes.
 */

import { getBiomeForLocation } from '@/config/biomeMapping';
import { getCreaturesForBiome } from '@/config/creatures';

/** Tier weights for assignment probability */
const TIER_WEIGHTS = {
  common:    0.50,
  uncommon:  0.30,
  rare:      0.15,
  legendary: 0.05,
};

/**
 * Assign a creature to a user based on their location.
 *
 * @param {string} [countryCode] — ISO 3166-1 alpha-2
 * @param {string} [postalCode]  — zip / postal code
 * @returns {string} creature key (e.g. 'red-fox')
 */
export function assignCreature(countryCode, postalCode) {
  const biome = getBiomeForLocation(countryCode, postalCode);
  const pool = getCreaturesForBiome(biome);

  if (pool.length === 0) {
    // Fallback — shouldn't happen, but safety first
    return 'red-fox';
  }

  // Group by tier
  const byTier = {};
  for (const c of pool) {
    if (!byTier[c.tier]) byTier[c.tier] = [];
    byTier[c.tier].push(c);
  }

  // Weighted random tier selection
  const roll = Math.random();
  let cumulative = 0;
  let selectedTier = 'common';

  for (const [tier, weight] of Object.entries(TIER_WEIGHTS)) {
    cumulative += weight;
    if (roll <= cumulative && byTier[tier]?.length > 0) {
      selectedTier = tier;
      break;
    }
  }

  // If the selected tier has no creatures in this biome, fall back
  if (!byTier[selectedTier] || byTier[selectedTier].length === 0) {
    const available = Object.entries(byTier).find(([, arr]) => arr.length > 0);
    selectedTier = available ? available[0] : 'common';
  }

  const tierPool = byTier[selectedTier] || pool;
  const chosen = tierPool[Math.floor(Math.random() * tierPool.length)];

  return chosen.key;
}

export default assignCreature;
