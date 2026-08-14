import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Migration 20260814080000 narrowed the notifications INSERT policy to admin
 * notices only (NULL actor + is_admin) — member flows go through
 * send_smoke_signal / the camp_newsletters trigger. A client-side
 * `.from('notifications').insert` re-added anywhere but the admin design
 * review would 42501 in production while looking fine in dev types. This
 * test keeps the set of direct-insert sites pinned.
 */

const SRC = join(__dirname, '..', '..');
// The one legitimate direct-insert site: GroveDesigns' admin notices
// (design_approved / design_rejected with a NULL actor).
const ALLOWED = ['pages/grove/GroveDesigns.tsx'];

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap(name => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === '__tests__' ? [] : walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });

describe('notification insert paths', () => {
  it('no client code inserts notifications directly outside the admin allowlist', () => {
    const offenders = walk(SRC)
      .filter(file =>
        /\.from\(['"]notifications['"]\)\s*\.insert/.test(
          readFileSync(file, 'utf8').replace(/\s+/g, ' '),
        ),
      )
      .map(file => file.slice(SRC.length + 1))
      .filter(rel => !ALLOWED.includes(rel));
    expect(offenders).toEqual([]);
  });

  it('the migration pins the INSERT policy to admin notices only', () => {
    const sql = readFileSync(
      join(
        SRC, '..', 'supabase', 'migrations',
        '20260814080000_notification_send_paths_and_rating_privacy.sql',
      ),
      'utf8',
    );
    expect(sql).toContain('actor_id IS NULL AND public.is_admin(auth.uid())');
    // The member self-send branch must not come back.
    expect(sql).not.toMatch(/actor_id = auth\.uid\(\) AND notification_type IN/);
  });
});
