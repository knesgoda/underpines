/**
 * Integration tests for feedback vote privacy.
 *
 * Contract: an authenticated member may read only their OWN vote rows
 * (RLS: own vote / item author / admin). Board totals must come from the
 * aggregate RPC `get_feedback_vote_counts()`, never from counting rows.
 *
 * These tests drive the real client wrappers and the real board fold against
 * a stubbed transport that behaves like the database does under RLS, so a
 * regression that starts counting rows (or leaks voter identities into the
 * board) fails here.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const selects: string[] = [];
const rpcCalls: string[] = [];

// RLS-shaped fixture: the viewer is 'me'; two other members also voted on 'a'.
const VIEWER = 'me';
const ALL_VOTE_ROWS = [
  { item_id: 'a', user_id: 'me' },
  { item_id: 'a', user_id: 'someone-else' },
  { item_id: 'a', user_id: 'third-member' },
  { item_id: 'b', user_id: 'someone-else' },
];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      select: (cols: string) => {
        selects.push(`${table}:${cols}`);
        if (table === 'feedback_votes') {
          // The policy filters to the viewer's own rows before they reach us.
          return Promise.resolve({
            data: ALL_VOTE_ROWS.filter(r => r.user_id === VIEWER),
            error: null,
          });
        }
        return {
          order: () => Promise.resolve({ data: [], error: null }),
        };
      },
    }),
    rpc: (name: string) => {
      rpcCalls.push(name);
      if (name === 'get_feedback_vote_counts') {
        return Promise.resolve({
          data: [
            { item_id: 'a', vote_count: 3 },
            { item_id: 'b', vote_count: 1 },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    },
  },
}));

const importApi = async () => await import('@/lib/feedbackApi');

beforeEach(() => {
  selects.length = 0;
  rpcCalls.length = 0;
});

describe('feedback vote reads', () => {
  it('returns only the viewer’s own vote rows — no other voters', async () => {
    const { listFeedbackVotes } = await importApi();
    const rows = await listFeedbackVotes();
    expect(rows).toEqual([{ item_id: 'a', user_id: VIEWER }]);
    expect(rows.every(r => r.user_id === VIEWER)).toBe(true);
  });

  it('gets totals from the aggregate RPC, not from vote rows', async () => {
    const { listFeedbackVoteCounts } = await importApi();
    const counts = await listFeedbackVoteCounts();
    expect(rpcCalls).toContain('get_feedback_vote_counts');
    expect(counts).toEqual([
      { item_id: 'a', vote_count: 3 },
      { item_id: 'b', vote_count: 1 },
    ]);
    // Aggregates carry no identity fields.
    counts.forEach(c => expect(Object.keys(c).sort()).toEqual(['item_count', 'vote_count'].slice(1).concat('item_id').sort()));
  });

  it('never selects vote rows for other members', async () => {
    const { listFeedbackVotes } = await importApi();
    await listFeedbackVotes();
    const voteSelects = selects.filter(s => s.startsWith('feedback_votes:'));
    expect(voteSelects.length).toBe(1);
    // No count/head aggregation trick, no profile join on the voter.
    expect(voteSelects[0]).not.toMatch(/profiles|count/i);
  });
});

describe('board fold', () => {
  it('shows the real total while only the viewer’s vote is identifiable', async () => {
    const { foldVotes } = await import('@/hooks/useFeedback');
    const { listFeedbackVoteCounts, listFeedbackVotes } = await importApi();
    const [counts, myVotes] = await Promise.all([
      listFeedbackVoteCounts(),
      listFeedbackVotes(),
    ]);
    const item = (id: string) => ({
      id,
      author_id: 'author',
      item_type: 'feature' as const,
      title: 't',
      body: 'b',
      status: 'open' as const,
      ranger_note: null,
      created_at: '2026-08-15T00:00:00Z',
      updated_at: '2026-08-15T00:00:00Z',
    });
    const folded = foldVotes([item('a'), item('b')], counts, myVotes, VIEWER);

    expect(folded[0].vote_count).toBe(3); // total, though only 1 row was readable
    expect(folded[0].mine_voted).toBe(true);
    expect(folded[1].vote_count).toBe(1);
    expect(folded[1].mine_voted).toBe(false);
    // The board item shape exposes no voter list.
    expect(JSON.stringify(folded)).not.toContain('someone-else');
    expect(JSON.stringify(folded)).not.toContain('third-member');
  });
});

describe('database contract (migration source)', () => {
  const MIGRATION = readFileSync(
    resolve(
      __dirname,
      '../../../supabase/migrations/20260815031106_840fa937-5c07-48fc-9b2f-a85caee0b7a6.sql',
    ),
    'utf8',
  );

  it('has no blanket-true select policy on feedback_votes', () => {
    expect(MIGRATION).not.toMatch(/feedback_votes[\s\S]{0,400}USING \(true\)/i);
  });

  it('scopes vote reads to own row, item author, or admin', () => {
    expect(MIGRATION).toMatch(/user_id = auth\.uid\(\)/);
    expect(MIGRATION).toMatch(/author_id = auth\.uid\(\)/);
    expect(MIGRATION).toMatch(/is_admin\(auth\.uid\(\)\)/);
  });

  it('exposes totals through a SECURITY DEFINER aggregate function', () => {
    const fn = MIGRATION.match(
      /CREATE OR REPLACE FUNCTION public\.get_feedback_vote_counts[\s\S]*?\$\$/i,
    );
    expect(fn).toBeTruthy();
    expect(fn![0]).toMatch(/SECURITY DEFINER/i);
    expect(fn![0]).toMatch(/count\(/i);
    // Aggregate only: it must not return voter ids.
    expect(fn![0]).not.toMatch(/RETURNS TABLE\([^)]*user_id/i);
  });
});
