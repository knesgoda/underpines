import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FEEDBACK_STATUSES, TYPE_LABELS } from '@/lib/feedbackApi';
import { foldVotes } from '@/hooks/useFeedback';
import type { FeedbackItem, FeedbackVoteRow } from '@/lib/feedbackApi';

const MIGRATION = readFileSync(
  resolve(__dirname, '../../../supabase/migrations/20260814000000_ranger_station_feedback.sql'),
  'utf8',
);

describe('feedback board contract', () => {
  it('client statuses match the migration CHECK constraint', () => {
    // The status vocabulary lives in two places; this keeps them from
    // drifting apart silently (the cabin zones convention).
    const checkBlock = MIGRATION.match(/status text NOT NULL DEFAULT 'open'\s*CHECK \(status IN \(([\s\S]*?)\)\)/);
    expect(checkBlock).toBeTruthy();
    const sqlStatuses = [...checkBlock![1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]);
    expect(new Set(sqlStatuses)).toEqual(new Set(FEEDBACK_STATUSES));
  });

  it('client types match the migration CHECK constraint', () => {
    const checkBlock = MIGRATION.match(/item_type text NOT NULL CHECK \(item_type IN \(([\s\S]*?)\)\)/);
    expect(checkBlock).toBeTruthy();
    const sqlTypes = [...checkBlock![1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]);
    expect(new Set(sqlTypes)).toEqual(new Set(Object.keys(TYPE_LABELS)));
  });
});

describe('foldVotes', () => {
  const item = (id: string): FeedbackItem => ({
    id,
    author_id: 'author',
    item_type: 'feature',
    title: 'Title',
    body: 'Body',
    status: 'open',
    ranger_note: null,
    created_at: '2026-08-14T00:00:00Z',
    updated_at: '2026-08-14T00:00:00Z',
  });

  const votes: FeedbackVoteRow[] = [
    { item_id: 'a', user_id: 'me' },
    { item_id: 'a', user_id: 'them' },
    { item_id: 'b', user_id: 'them' },
  ];

  it('counts votes per item and flags the viewer’s own', () => {
    const folded = foldVotes([item('a'), item('b'), item('c')], votes, 'me');
    expect(folded.map(f => f.vote_count)).toEqual([2, 1, 0]);
    expect(folded.map(f => f.mine_voted)).toEqual([true, false, false]);
  });

  it('handles a signed-out viewer', () => {
    const folded = foldVotes([item('a')], votes, null);
    expect(folded[0].vote_count).toBe(2);
    expect(folded[0].mine_voted).toBe(false);
  });
});
