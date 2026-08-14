/**
 * Notifications client wrappers — every read and write against the
 * notifications table lives here (they used to be inlined across ten
 * components).
 *
 * Since migration 20260815000000 the rows are produced SERVER-SIDE: triggers
 * on replies/reactions/circles/posts/camp tables and hooks inside the invite
 * redemption functions, all through the notify_user() definer helper. The
 * client's writes are down to what a recipient may do with their own rows:
 * flip is_read (a column-scoped grant — nothing else is updatable) and
 * delete. The two remaining client-side INSERT flows (the /invites nudge,
 * the camp newsletter fan-out) are allowed by name in the INSERT policy and
 * write from their own screens, not through here.
 */
import { supabase } from '@/integrations/supabase/client';

/**
 * The full type vocabulary, mirroring the CHECK constraint in
 * supabase/migrations/20260815000000_notification_system_overhaul.sql —
 * a vitest reads the .sql and fails on drift.
 */
export const NOTIFICATION_TYPES = [
  'reaction_batch',
  'reply',
  'quote_post',
  'circle_request',
  'circle_accepted',
  'invite_accepted',
  'smoke_signal',
  'campfire_message',
  'collection_subscriber',
  'cabin_knock',
  'cabin_gift',
  'cabin_guestbook',
  'cabin_note',
  'cabin_trade',
  'system',
  'camp_newsletter',
  'design_approved',
  'design_rejected',
  'design_purchased',
  'inactive_nudge',
  'annual_wrapped',
  'camp_join_request',
  'camp_join_accepted',
  'camp_role_changed',
  'camp_member_joined',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationRow {
  id: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  actor_id: string | null;
  post_id: string | null;
  campfire_id: string | null;
  collection_id: string | null;
  camp_id_ref: string | null;
  /** Reactions collapse to one row per post; how many reactions it stands for. */
  aggregate_count?: number | null;
}

export interface NotificationActor {
  id: string;
  display_name: string;
  handle: string;
}

export interface NotificationsPage {
  rows: NotificationRow[];
  actors: Record<string, NotificationActor>;
  threadNames: Record<string, string>;
  /** Cursor for the next page, or null when this page ran dry. */
  nextBefore: string | null;
}

export const PAGE_SIZE = 50;

/**
 * One page of notifications, newest first, keyset-paginated on created_at
 * (rides the (recipient_id, created_at DESC) index). Hydrates the actors and
 * campfire names the copy needs in one extra round trip each.
 */
export const fetchNotifications = async (
  userId: string,
  before?: string | null,
): Promise<NotificationsPage> => {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  if (before) query = query.lt('created_at', before);

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as NotificationRow[];

  const actorIds = [...new Set(rows.map(n => n.actor_id).filter(Boolean))] as string[];
  const threadIds = [...new Set(rows.map(n => n.campfire_id).filter(Boolean))] as string[];

  const [{ data: profiles }, { data: threads }] = await Promise.all([
    actorIds.length
      ? supabase.from('profiles').select('id, display_name, handle').in('id', actorIds)
      : Promise.resolve({ data: [] as NotificationActor[] }),
    threadIds.length
      ? supabase.from('campfires').select('id, name').in('id', threadIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
  ]);

  return {
    rows,
    actors: Object.fromEntries((profiles ?? []).map(p => [p.id, p as NotificationActor])),
    threadNames: Object.fromEntries((threads ?? []).map(t => [t.id, t.name || 'Conversation'])),
    nextBefore: rows.length === PAGE_SIZE ? rows[rows.length - 1].created_at : null,
  };
};

/** Merge pages into one list (dedupes on id — realtime can race pagination). */
export const mergePages = (pages: NotificationsPage[]): NotificationsPage => {
  const seen = new Set<string>();
  const rows: NotificationRow[] = [];
  for (const page of pages) {
    for (const row of page.rows) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        rows.push(row);
      }
    }
  }
  return {
    rows,
    actors: Object.assign({}, ...pages.map(p => p.actors)),
    threadNames: Object.assign({}, ...pages.map(p => p.threadNames)),
    nextBefore: pages.length ? pages[pages.length - 1].nextBefore : null,
  };
};

export const markAllRead = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);
  if (error) throw error;
};

export const markRead = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw error;
};

/** Remove one notification for good. */
export const dismissNotification = async (id: string): Promise<void> => {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw error;
};

/** Remove every notification for good. */
export const clearAllNotifications = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('recipient_id', userId);
  if (error) throw error;
};

/** Unread total for the badge — reactions count like everything else now. */
export const countUnread = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);
  if (error) throw error;
  return count ?? 0;
};
