import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  NOTIFICATION_TYPES,
  mergePages,
  type NotificationRow,
  type NotificationsPage,
} from '@/lib/notificationsApi';
import { describeNotification, type DescribeContext } from '@/lib/notificationCopy';
import { REACTIONS } from '@/lib/reactionTypes';

const MIGRATION = readFileSync(
  resolve(__dirname, '../../../supabase/migrations/20260815000000_notification_system_overhaul.sql'),
  'utf8',
);

const sqlList = (block: string) => [...block.matchAll(/'([a-z_]+)'/g)].map(m => m[1]);

describe('notification type contract', () => {
  it('client vocabulary matches the migration CHECK constraint', () => {
    const match = MIGRATION.match(
      /notifications_notification_type_check CHECK \(notification_type IN \(([\s\S]*?)\)\)/,
    );
    expect(match).toBeTruthy();
    expect(new Set(sqlList(match![1]))).toEqual(new Set(NOTIFICATION_TYPES));
  });

  it('reaction emoji offered by the client are all in the reactions CHECK', () => {
    const match = MIGRATION.match(
      /reactions_reaction_type_check CHECK \(reaction_type IN \(([\s\S]*?)\)\)/,
    );
    expect(match).toBeTruthy();
    const allowed = new Set(sqlList(match![1]));
    for (const r of REACTIONS) expect(allowed).toContain(r.type);
  });

  it('every type has real copy and a real destination', () => {
    const ctx: DescribeContext = {
      actorName: () => 'Kevin',
      actorHandle: () => 'kevin',
      threadName: () => 'The Grove',
      viewerHandle: 'me',
      cabinEnabled: false,
    };
    for (const type of NOTIFICATION_TYPES) {
      const { text, to } = describeNotification(row({ notification_type: type }), ctx);
      // Falling into the default bucket means a type shipped without copy.
      expect(text, type).not.toBe('Something happened.');
      expect(to, type).toMatch(/^\//);
    }
  });
});

const row = (overrides: Partial<NotificationRow>): NotificationRow => ({
  id: 'n1',
  notification_type: 'reply',
  is_read: false,
  created_at: '2026-08-15T00:00:00Z',
  actor_id: 'actor',
  post_id: 'post',
  campfire_id: null,
  collection_id: null,
  camp_id_ref: 'camp',
  aggregate_count: 1,
  ...overrides,
});

describe('describeNotification', () => {
  const ctx: DescribeContext = {
    actorName: () => 'Kevin',
    actorHandle: () => 'kevin',
    threadName: () => 'The Grove',
    viewerHandle: 'me',
    cabinEnabled: false,
  };

  it('aggregated reaction copy at counts 1, 2, and many', () => {
    const at = (aggregate_count: number | null) =>
      describeNotification(row({ notification_type: 'reaction_batch', aggregate_count }), ctx).text;
    expect(at(1)).toBe('Kevin reacted to your post.');
    expect(at(2)).toBe('Kevin and 1 other reacted to your post.');
    expect(at(5)).toBe('Kevin and 4 others reacted to your post.');
    // Pre-migration rows have no aggregate_count; treat as one reaction.
    expect(at(null)).toBe('Kevin reacted to your post.');
  });

  it('cabin events link to the actor while the cabin is hidden, to the cabin when not', () => {
    const hidden = describeNotification(row({ notification_type: 'cabin_knock' }), ctx);
    expect(hidden.to).toBe('/kevin');
    const shown = describeNotification(
      row({ notification_type: 'cabin_knock' }),
      { ...ctx, cabinEnabled: true },
    );
    expect(shown.to).toBe('/cabin');
  });

  it('reply deep-links to the post, camp events to the camp', () => {
    expect(describeNotification(row({ notification_type: 'reply' }), ctx).to).toBe('/post/post');
    expect(describeNotification(row({ notification_type: 'camp_member_joined' }), ctx).to).toBe('/camps/camp');
    expect(
      describeNotification(row({ notification_type: 'camp_member_joined', camp_id_ref: null }), ctx).to,
    ).toBe('/camps/mine');
  });
});

describe('mergePages', () => {
  const page = (ids: string[], nextBefore: string | null): NotificationsPage => ({
    rows: ids.map(id => row({ id })),
    actors: {},
    threadNames: {},
    nextBefore,
  });

  it('flattens pages and dedupes rows a realtime insert pushed across the cursor', () => {
    const merged = mergePages([page(['a', 'b'], 'cursor'), page(['b', 'c'], null)]);
    expect(merged.rows.map(r => r.id)).toEqual(['a', 'b', 'c']);
    expect(merged.nextBefore).toBeNull();
  });

  it('keeps the last page cursor when more remains', () => {
    const merged = mergePages([page(['a'], '2026-08-14T00:00:00Z')]);
    expect(merged.nextBefore).toBe('2026-08-14T00:00:00Z');
  });
});
