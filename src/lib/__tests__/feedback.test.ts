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

const API_SOURCE = readFileSync(resolve(__dirname, '../feedbackApi.ts'), 'utf8');

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

  it('the author embed names its FK — feedback_votes makes profiles ambiguous', () => {
    // feedback_votes has FKs to BOTH feedback_items and profiles, so PostgREST
    // sees two relationships from feedback_items to profiles (the author FK and
    // the votes junction). A hint-less `profiles(...)` embed is answered with
    // PGRST201 before the query ever runs, and the whole board shows the error
    // panel. The explicit FK hint is what disambiguates it.
    expect(API_SOURCE).toContain('author:profiles!feedback_items_author_id_fkey(');
    expect(API_SOURCE).not.toMatch(/profiles\(/);
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

  // Totals arrive as aggregates; only the viewer's own vote rows are readable.
  const counts = [
    { item_id: 'a', vote_count: 2 },
    { item_id: 'b', vote_count: 1 },
  ];
  const myVotes: FeedbackVoteRow[] = [{ item_id: 'a', user_id: 'me' }];

  it('counts votes per item and flags the viewer’s own', () => {
    const folded = foldVotes([item('a'), item('b'), item('c')], counts, myVotes, 'me');
    expect(folded.map(f => f.vote_count)).toEqual([2, 1, 0]);
    expect(folded.map(f => f.mine_voted)).toEqual([true, false, false]);
  });

  it('handles a signed-out viewer', () => {
    const folded = foldVotes([item('a')], counts, myVotes, null);
    expect(folded[0].vote_count).toBe(2);
    expect(folded[0].mine_voted).toBe(false);
  });
});
