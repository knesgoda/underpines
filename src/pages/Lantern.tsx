import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { supabase } from '@/integrations/supabase/client';
import PineTreeLoading from '@/components/PineTreeLoading';
import { ErrorPanel } from '@/components/StatePanel';
import { useViewerProfile } from '@/hooks/queries';
import { formatTimeAgo } from '@/lib/time';
import { CABIN_ENABLED } from '@/lib/flags';
import { describeNotification } from '@/lib/notificationCopy';
import { markAllRead as apiMarkAllRead, type NotificationRow } from '@/lib/notificationsApi';
import {
  useClearAllNotifications,
  useDismissNotification,
  useNotifications,
} from '@/hooks/useNotifications';
import '@/styles/updates.css';

/**
 * Updates — the notification list, previously "🏮 Lantern".
 *
 * Since the 20260815 migration the rows are written server-side (triggers +
 * invite RPC hooks), reactions arrive LIVE as one aggregated row per post
 * ("Kevin and 3 others"), every type in the constraint has copy and a real
 * destination (see notificationCopy.ts — the drift test enforces it), each
 * row can be dismissed, and Clear all deletes the lot after a confirm.
 */

/** Ordered so the things needing an answer sit above the things that do not. */
const SECTIONS: { key: string; title: string; types: string[] }[] = [
  { key: 'requests', title: 'Friend requests', types: ['circle_request'] },
  { key: 'messages', title: 'Messages', types: ['campfire_message', 'smoke_signal'] },
  { key: 'replies', title: 'Replies and quotes', types: ['reply', 'quote_post'] },
  { key: 'friends', title: 'Friends', types: ['circle_accepted'] },
  { key: 'reactions', title: 'Reactions', types: ['reaction_batch'] },
  { key: 'invites', title: 'Invites', types: ['invite_accepted'] },
  {
    key: 'groups',
    title: 'Groups',
    types: [
      'camp_join_request', 'camp_join_accepted', 'camp_member_joined',
      'camp_role_changed', 'camp_newsletter',
    ],
  },
  {
    key: 'cabin',
    title: 'Your cabin',
    types: ['cabin_knock', 'cabin_gift', 'cabin_guestbook', 'cabin_note', 'cabin_trade'],
  },
  {
    key: 'other',
    title: 'Everything else',
    types: [
      'collection_subscriber', 'design_purchased', 'design_approved',
      'design_rejected', 'system', 'inactive_nudge', 'annual_wrapped',
    ],
  },
];

const Lantern = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshNotifications } = useNavigation();
  const { data: viewer } = useViewerProfile();
  const [acted, setActed] = useState<Record<string, 'accepted' | 'declined'>>({});
  const [confirmingClear, setConfirmingClear] = useState(false);

  const { merged, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useNotifications();
  const dismiss = useDismissNotification();
  const clearAll = useClearAllNotifications();

  const rows = merged?.rows ?? [];
  const hasUnread = rows.some(n => !n.is_read);

  // Read on arrival, after a beat, so what is new is still visibly new.
  useEffect(() => {
    if (!user || !hasUnread) return;
    const timer = setTimeout(async () => {
      await apiMarkAllRead(user.id);
      refreshNotifications();
    }, 2000);
    return () => clearTimeout(timer);
  }, [user, hasUnread, refreshNotifications]);

  const markAllRead = async () => {
    if (!user) return;
    await apiMarkAllRead(user.id);
    refreshNotifications();
    queryClient.invalidateQueries({ queryKey: ['updates'] });
  };

  const clearEverything = () => {
    setConfirmingClear(false);
    clearAll.mutate(undefined, {
      onError: () => toast.error('That did not go through.'),
    });
  };

  const respond = async (row: NotificationRow, accept: boolean) => {
    if (!user || !row.actor_id) return;

    // The circles write is all that's needed — the trigger on circles now
    // notifies the requester when a request flips to accepted.
    const query = supabase.from('circles');
    const { error } = accept
      ? await query.update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('requester_id', row.actor_id).eq('requestee_id', user.id).eq('status', 'pending')
      : await query.delete()
          .eq('requester_id', row.actor_id).eq('requestee_id', user.id).eq('status', 'pending');

    if (error) { toast.error('That did not go through.'); return; }

    setActed(prev => ({ ...prev, [row.id]: accept ? 'accepted' : 'declined' }));
    await supabase.from('notifications').update({ is_read: true }).eq('id', row.id);
    queryClient.invalidateQueries({ queryKey: ['friend-lists'] });
  };

  if (isLoading) return <PineTreeLoading />;
  if (isError) return <div className="page-shell"><ErrorPanel what="your updates" /></div>;

  if (!user) {
    return (
      <div className="page-shell">
        <section className="panel state-panel">
          <p>Sign in to see your updates.</p>
        </section>
      </div>
    );
  }

  const actors = merged?.actors ?? {};
  const threadNames = merged?.threadNames ?? {};

  const describe = (n: NotificationRow) =>
    describeNotification(n, {
      actorName: id => (id && actors[id]?.display_name) || 'Someone',
      actorHandle: id => (id && actors[id]?.handle) || null,
      threadName: id => (id && threadNames[id]) || null,
      viewerHandle: viewer?.handle ?? null,
      cabinEnabled: CABIN_ENABLED,
    });

  const dismissButton = (n: NotificationRow) => (
    <button
      type="button"
      className="update-dismiss"
      aria-label="Dismiss this update"
      onClick={() => dismiss.mutate(n.id)}
    >
      ✕
    </button>
  );

  const sections = SECTIONS
    .map(s => ({ ...s, items: rows.filter(n => s.types.includes(n.notification_type)) }))
    .filter(s => s.items.length > 0);

  // A type nobody listed still has to appear, or it vanishes silently.
  const listed = new Set(SECTIONS.flatMap(s => s.types));
  const unlisted = rows.filter(n => !listed.has(n.notification_type));
  if (unlisted.length) sections.push({ key: 'misc', title: 'Other', types: [], items: unlisted });

  return (
    <div className="page-shell">
      <div className="panel-title">
        <span>Updates</span>
        {rows.length > 0 && (
          <span className="updates-title-actions">
            {hasUnread && <button type="button" onClick={markAllRead}>Mark all read</button>}
            {confirmingClear ? (
              <span className="clear-confirm">
                Deletes them for good.
                <button type="button" onClick={clearEverything}>Confirm</button>
                <button type="button" onClick={() => setConfirmingClear(false)}>Cancel</button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmingClear(true)}>Clear all</button>
            )}
          </span>
        )}
      </div>

      {sections.length === 0 ? (
        <section className="panel state-panel">
          <p className="quiet">It's quiet under here.</p>
          <p>Nothing has happened yet. It will.</p>
        </section>
      ) : (
        <div className="updates-list">
          {sections.map(section => (
            <section key={section.key} className="panel module">
              <h2>{section.title}</h2>

              {section.items.map(n => {
                if (n.notification_type === 'circle_request') {
                  const state = acted[n.id];
                  return (
                    <div key={n.id} className={`update-row ${n.is_read ? '' : 'is-new'}`}>
                      <div className="update-text">
                        <p>{describe(n).text}</p>
                        <small>{formatTimeAgo(n.created_at)}</small>
                      </div>
                      {state === 'accepted' ? (
                        <span className="settled">Friends now</span>
                      ) : state === 'declined' ? (
                        <span className="settled">Declined</span>
                      ) : (
                        <div className="update-actions">
                          <button type="button" className="solid-button" onClick={() => respond(n, true)}>Accept</button>
                          <button type="button" className="outline-button" onClick={() => respond(n, false)}>Not now</button>
                        </div>
                      )}
                      {dismissButton(n)}
                    </div>
                  );
                }

                const { text, to } = describe(n);
                return (
                  <div key={n.id} className={`update-row is-link ${n.is_read ? '' : 'is-new'}`}>
                    <button type="button" className="update-link" onClick={() => navigate(to)}>
                      <div className="update-text">
                        <p>{text}</p>
                        <small>{formatTimeAgo(n.created_at)}</small>
                      </div>
                    </button>
                    {dismissButton(n)}
                  </div>
                );
              })}
            </section>
          ))}

          {hasNextPage && (
            <button
              type="button"
              className="outline-button show-older"
              disabled={isFetchingNextPage}
              onClick={() => fetchNextPage()}
            >
              {isFetchingNextPage ? 'Fetching…' : 'Show older'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Lantern;
