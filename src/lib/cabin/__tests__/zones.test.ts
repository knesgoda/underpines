import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CABIN_ZONES, zoneAllowed, zoneByKey } from '@/lib/cabin/zones';
import { CABIN_LOCATIONS } from '@/lib/cabin/locations';
import { CABIN_FIXTURES } from '@/lib/cabin/fixtures';

const MIGRATION = readFileSync(
  resolve(__dirname, '../../../../supabase/migrations/20260810210000_cabin_system.sql'),
  'utf8',
);

describe('cabin zones', () => {
  it('zone keys are unique', () => {
    expect(new Set(CABIN_ZONES.map(z => z.key)).size).toBe(CABIN_ZONES.length);
  });

  it('every client zone exists in the migration CHECK constraint, and vice versa', () => {
    // The migration's zone CHECK is the server half of the placement contract;
    // this keeps the two vocabularies from drifting apart silently.
    const checkBlock = MIGRATION.match(/zone text NOT NULL CHECK \(zone IN \(([\s\S]*?)\)\)/);
    expect(checkBlock).toBeTruthy();
    const sqlZones = [...checkBlock![1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]);
    expect(new Set(sqlZones)).toEqual(new Set(CABIN_ZONES.map(z => z.key)));
  });

  it('every seeded item definition only claims real zones', () => {
    // valid_zones arrays in the seed data must stay inside the vocabulary.
    const seeded = [...MIGRATION.matchAll(/'\{([a-z_,]+)\}'/g)]
      .flatMap(m => m[1].split(','))
      .filter(z => zoneByKey.has(z) || z.includes('_'));
    const zoneish = seeded.filter(z =>
      /^(porch|window|left_wall|right_wall|fireplace|desk|bookshelf|floor|ceiling|pet_area|exterior)/.test(z));
    for (const z of zoneish) {
      expect(zoneByKey.has(z), `unknown zone in seed data: ${z}`).toBe(true);
    }
  });

  it('zoneAllowed enforces the valid_zones contract', () => {
    expect(zoneAllowed(['desk', 'bookshelf_top'], 'desk')).toBe(true);
    expect(zoneAllowed(['desk'], 'ceiling')).toBe(false);
    expect(zoneAllowed(null, 'desk')).toBe(false);
  });

  it('zones carry render anchors inside the box', () => {
    for (const z of CABIN_ZONES) {
      expect(z.x).toBeGreaterThanOrEqual(0);
      expect(z.x).toBeLessThanOrEqual(100);
      expect(z.y).toBeGreaterThanOrEqual(0);
      expect(z.y).toBeLessThanOrEqual(100);
    }
  });
});

describe('cabin locations', () => {
  it('curated locations are unique, labeled, and on the planet', () => {
    expect(new Set(CABIN_LOCATIONS.map(l => l.key)).size).toBe(CABIN_LOCATIONS.length);
    for (const l of CABIN_LOCATIONS) {
      expect(l.label).toBeTruthy();
      expect(Math.abs(l.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(l.lng)).toBeLessThanOrEqual(180);
      expect(l.biome).toBeTruthy();
    }
  });
});

describe('cabin fixtures', () => {
  it('every fixture offers something to at least one role', () => {
    for (const f of CABIN_FIXTURES) {
      expect(f.ownerAction || f.visitorAction, f.key).toBeTruthy();
    }
    expect(new Set(CABIN_FIXTURES.map(f => f.key)).size).toBe(CABIN_FIXTURES.length);
  });
});
