import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Client-side half of the profiles RLS regression suite.
 *
 * The server gate is column-level: SELECT/UPDATE on `public.profiles` is revoked
 * table-wide and re-granted column by column, deliberately skipping geolocation
 * and age. That gate is asserted by supabase/tests/profiles_rls_regression.sql.
 *
 * These tests catch the other direction of regression: client code that starts
 * reading or writing those columns off the table directly. Such a query fails at
 * runtime (permission denied on the column) rather than leaking, so it is a
 * broken-feature bug — and the failure only shows up for real users. Sensitive
 * fields must travel through the SECURITY DEFINER RPCs instead
 * (get_boot_state, get_cabin_view, admin_profile_age_flags,
 * set_age_verification, record_age_gate_event).
 */

const SENSITIVE = ['latitude', 'longitude', 'zip_code', 'age_bracket', 'birth_year'] as const;

const SRC = path.resolve(__dirname, '../..');
const REPO = path.resolve(SRC, '..');

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '__tests__') continue;
      walk(full, out);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry) && !full.includes('integrations/supabase/types')) {
      out.push(full);
    }
  }
  return out;
};

const files = walk(SRC);

/** Every `.from('profiles')` chain in a file, as a single-line snippet. */
const profileQueries = (source: string): string[] => {
  const found: string[] = [];
  const re = /\.from\(\s*['"]profiles['"]\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    const tail = source.slice(match.index, match.index + 600);
    const end = tail.indexOf(';');
    found.push((end === -1 ? tail : tail.slice(0, end)).replace(/\s+/g, ' '));
  }
  return found;
};

describe('profiles sensitive columns are never queried off the table', () => {
  it('finds profile queries to check (guards against the walker silently breaking)', () => {
    const total = files.reduce((n, f) => n + profileQueries(readFileSync(f, 'utf8')).length, 0);
    expect(files.length).toBeGreaterThan(50);
    expect(total).toBeGreaterThan(0);
  });

  for (const column of SENSITIVE) {
    it(`no direct profiles query touches ${column}`, () => {
      const offenders: string[] = [];
      for (const file of files) {
        for (const query of profileQueries(readFileSync(file, 'utf8'))) {
          // Ignore a column name that only appears as an RPC argument (_age_bracket).
          const bare = new RegExp(`(?<![_\\w])${column}(?![\\w])`);
          if (bare.test(query)) offenders.push(`${path.relative(REPO, file)}: ${query.slice(0, 160)}`);
        }
      }
      expect(offenders, `use a definer RPC instead of selecting/updating ${column}`).toEqual([]);
    });
  }

  it('never writes a sensitive column through a profiles update payload', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const query of profileQueries(source)) {
        if (!/\.(update|upsert|insert)\(/.test(query)) continue;
        for (const column of SENSITIVE) {
          if (new RegExp(`(?<![_\\w])${column}\\s*:`).test(query)) {
            offenders.push(`${path.relative(REPO, file)} → ${column}`);
          }
        }
      }
    }
    expect(offenders, 'age and location writes must go through set_age_verification').toEqual([]);
  });
});

describe('the SQL regression suite stays in sync', () => {
  const sql = readFileSync(
    path.join(REPO, 'supabase/tests/profiles_rls_regression.sql'),
    'utf8',
  );

  it('asserts every sensitive column', () => {
    for (const column of SENSITIVE) {
      expect(sql, `${column} missing from the SQL regression checks`).toContain(`'${column}'`);
    }
  });

  it('is read-only', () => {
    // Strip `--` comments first: the explanatory notes name the DDL we guard against.
    const statements = sql.replace(/--[^\n]*/g, '');
    expect(statements).not.toMatch(
      /\b(insert into|update |delete from|drop |alter |grant |revoke )\b/i,
    );
  });

});
