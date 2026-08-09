import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { supabase } from '@/integrations/supabase/client';
import PineTreeLoading from '@/components/PineTreeLoading';
import { useViewerProfile } from '@/hooks/queries';
import { formatTimeAgo } from '@/lib/time';
import '@/styles/updates.css';

/**
 * Updates — the notification list, previously "🏮 Lantern".
 *
 * Nobody arriving at a social network guesses that a lantern holds their
 * notifications, and the section headings underneath were no better: replies
 * filed under "Campfires", friend requests under "Circles". Both are now what
 * they are.
 *
 * Several of the destinations here pointed at routes that do not exist —
 * /my-designs, /collections/:id, /circles?tab=invites — so the notification
 * arrived, you tapped it, and got the 404 page. Those are corrected below.
 */

interface NotificationRow {
  id: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  actor_id: string | null;
  post_id: string | null;
  campfire_id: string | null;
  collection_id: string | null;
}

interface Actor {
  id: string;
  display_name: string;
  handle: string;
}

interface Loaded {
  rows: NotificationRow[];
  actors: Record<string, Actor>;
  threadNames: Record<string, string>;
}

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
      'camp_join_request', 'camp_join_accepted', 'camp_role_changed',
      'camp_post_removed', 'bonfire_split', 'camp_newsletter',
    ],
  },
  { key: 'other', title: 'Everything else', types: ['collection_subscriber', 'design_purchased', 'system'] },
];

const Lantern = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshNotifications } = useNavigation();
  const { data: viewer } = useViewerProfile();
  const [acted, setActed] = useState<Record<string, 'accepted' | 'declined'>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['updates', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Loaded> => {
      const { data: rows, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;

      // Reaction batches are held until the Daily Ember delivers them.
      const visible = (rows ?? []).filter(
        n => n.notification_type !== 'reaction_batch' || (n as { is_delivered_in_ember?: boolean }).is_delivered_in_ember === true,
      ) as NotificationRow[];

      const actorIds = [...new Set(visible.map(n => n.actor_id).filter(Boolean))] as string[];
      const threadIds = [...new Set(visible.map(n => n.campfire_id).filter(Boolean))] as string[];

      const [{ data: profiles }, { data: threads }] = await Promise.all([
        actorIds.length
          ? supabase.from('profiles').select('id, display_name, handle').in('id', actorIds)
          : Promise.resolve({ data: [] as Actor[] }),
        threadIds.length
          ? supabase.from('campfires').select('id, name').in('id', threadIds)
          : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
      ]);

      return {
        rows: visible,
        actors: Object.fromEntries((profiles ?? []).map(p => [p.id, p as Actor])),
        threadNames: Object.fromEntries((threads ?? []).map(t => [t.id, t.name || 'Conversation'])),
      };
    },
  });

  const rows = data?.rows ?? [];
  const hasUnread = rows.some(n => !n.is_read);

  // Read on arrival, after a beat, so what is new is still visibly new.
  useEffect(() => {
    if (!user || !hasUnread) return;
    const timer = setTimeout(async () => {
      await supabase.from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);
      refreshNotifications();
    }, 2000);
    return () => clearTimeout(timer);
  }, [user, hasUnread, refreshNotifications]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false);
    refreshNotifications();
    queryClient.invalidateQueries({ queryKey: ['updates'] });
  };

  const respond = async (row: NotificationRow, accept: boolean) => {
    if (!user || !row.actor_id) return;

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

  if (!user) {
    return (
      <div className="page-shell">
        <section className="panel updates-empty">
          <p>Sign in to see your updates.</p>
        </section>
      </div>
    );
  }

  const actors = data?.actors ?? {};
  const threadNames = data?.threadNames ?? {};
  const name = (id: string | null) => (id && actors[id]?.display_name) || 'Someone';

  /** Where a notification takes you. Every path here is a real route. */
  const describe = (n: NotificationRow): { text: string; to: string } => {
    switch (n.notification_type) {
      case 'circle_accepted':
        return { text: `${name(n.actor_id)} accepted your friend request.`, to: `/${actors[n.actor_id!]?.handle ?? ''}` };
      case 'reply':
        return { text: `${name(n.actor_id)} replied to your post.`, to: n.post_id ? `/post/${n.post_id}` : '/' };
      case 'quote_post':
        return { text: `${name(n.actor_id)} quoted your post.`, to: n.post_id ? `/post/${n.post_id}` : '/' };
      case 'campfire_message':
        return { text: `${threadNames[n.campfire_id ?? ''] ?? 'A conversation'} has a new message.`, to: '/messages' };
      case 'smoke_signal':
        return { text: 'Someone waved at you.', to: '/messages' };
      case 'reaction_batch':
        return { text: 'People reacted to your posts.', to: n.post_id ? `/post/${n.post_id}` : '/' };
      case 'invite_accepted':
        return { text: `${name(n.actor_id)} used your invite.`, to: '/invites' };
      case 'collection_subscriber':
        // Collections live under a handle; without the owner there is nowhere
        // specific to go, so send them to their own list.
        return {
          text: `${name(n.actor_id)} subscribed to your collection.`,
          to: viewer ? `/${viewer.handle}/collections` : '/',
        };
      case 'design_purchased':
        return { text: `${name(n.actor_id)} bought your design.`, to: '/settings/designs' };
      case 'camp_join_request':
        return { text: `${name(n.actor_id)} asked to join your group.`, to: '/camps/mine' };
      case 'camp_join_accepted':
        return { text: 'You were let into a group.', to: '/camps/mine' };
      case 'camp_role_changed':
        return { text: 'Your role in a group changed.', to: '/camps/mine' };
      case 'camp_post_removed':
        return { text: 'A moderator removed your post from a group.', to: '/camps/mine' };
      case 'bonfire_split':
        return { text: 'A group passed 150 people and split in two.', to: '/camps/mine' };
      case 'camp_newsletter':
        return { text: `${name(n.actor_id)} sent a newsletter.`, to: '/camps/mine' };
      case 'system':
        return { text: 'Your page has new options to play with.', to: '/me/edit' };
      default:
        return { text: 'Something happened.', to: '/' };
    }
  };

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
        {hasUnread && <button type="button" onClick={markAllRead}>Mark all read</button>}
      </div>

      {sections.length === 0 ? (
        <section className="panel updates-empty">
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
                        <p>{name(n.actor_id)} wants to be friends.</p>
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
                    </div>
                  );
                }

                const { text, to } = describe(n);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => navigate(to)}
                    className={`update-row is-link ${n.is_read ? '' : 'is-new'}`}
                  >
                    <div className="update-text">
                      <p>{text}</p>
                      <small>{formatTimeAgo(n.created_at)}</small>
                    </div>
                  </button>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default Lantern;
