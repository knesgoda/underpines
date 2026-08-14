import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Pins the personal-invite-link migration's security-load-bearing shapes so a
 * later rewrite cannot silently drop them. The repo .sql is the source of
 * truth for intent; these assertions are what the exploit test verifies live.
 */
const MIGRATION = readFileSync(
  resolve(__dirname, '../../../supabase/migrations/20260815100000_personal_invite_links.sql'),
  'utf8',
);

describe('personal invite link migration contract', () => {
  it('lineage CHECK carries all five source kinds', () => {
    const match = MIGRATION.match(
      /user_lineage_source_kind_check\s+CHECK \(source_kind IN \(([\s\S]*?)\)\)/,
    );
    expect(match).toBeTruthy();
    const kinds = [...match![1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]);
    expect(new Set(kinds)).toEqual(
      new Set(['trail_pass', 'legacy_link', 'root_link', 'personal_link', 'unknown']),
    );
  });

  it('handle_new_user spends the allowance under a row lock', () => {
    const fn = MIGRATION.split('FUNCTION public.handle_new_user')[1] ?? '';
    expect(fn).toContain('_legacy.spends_allowance');
    expect(fn).toMatch(/FROM public\.invite_allowances\s+WHERE user_id = _legacy\.inviter_id\s+FOR UPDATE/);
    expect(fn).toContain('available_passes < 1');
    expect(fn).toContain('SET available_passes = available_passes - 1');
  });

  it('admin rotate_invite_link excludes personal rows', () => {
    const fn = MIGRATION.split('FUNCTION public.rotate_invite_link')[1] ?? '';
    expect(fn).toContain('spends_allowance IS NOT TRUE');
  });

  it('rotation deactivates rather than renaming (the id is the redemption key)', () => {
    const fn = MIGRATION.split('FUNCTION public.rotate_my_invite_link')[1] ?? '';
    expect(fn).toMatch(/SET is_active = false/);
  });

  it('the new member RPCs are not executable by anon', () => {
    expect(MIGRATION).toContain(
      'REVOKE EXECUTE ON FUNCTION public.get_my_invite_link() FROM PUBLIC, anon',
    );
    expect(MIGRATION).toContain(
      'REVOKE EXECUTE ON FUNCTION public.rotate_my_invite_link() FROM PUBLIC, anon',
    );
  });
});
