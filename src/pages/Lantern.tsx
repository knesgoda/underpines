import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import PineTreeLoading from '@/components/PineTreeLoading';
import { toast } from 'sonner';

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

interface ActorProfile {
  id: string;
  display_name: string;
  handle: string;
}

interface GroupedNotification {
  type: string;
  items: NotificationRow[];
  actors: ActorProfile[];
  label: string;
  campfireName?: string;
}

const Lantern = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { refreshNotifications } = useNavigation();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [actors, setActors] = useState<Record<string, ActorProfile>>({});
  const [campfireNames, setCampfireNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [circleActionStates, setCircleActionStates] = useState<Record<string, 'accepted' | 'declined' | null>>({});

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    const rows = (data || []) as NotificationRow[];
    setNotifications(rows);

    // Fetch actor profiles
    const actorIds = [...new Set(rows.map(n => n.actor_id).filter(Boolean))] as string[];
    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, handle')
        .in('id', actorIds);
      const map: Record<string, ActorProfile> = {};
      (profiles || []).forEach(p => { map[p.id] = p; });
      setActors(map);
    }

    // Fetch campfire names
    const campfireIds = [...new Set(rows.filter(n => n.campfire_id).map(n => n.campfire_id!))] as string[];
    if (campfireIds.length > 0) {
      const { data: campfires } = await supabase
        .from('campfires')
        .select('id, name')
        .in('id', campfireIds);
      const cMap: Record<string, string> = {};
      (campfires || []).forEach(c => { cMap[c.id] = c.name || 'Campfire'; });
      setCampfireNames(cMap);
    }

    setLoading(false);

    // Mark all as read after 2 seconds
    setTimeout(async () => {
      const unreadIds = rows.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length > 0) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('recipient_id', user.id)
          .eq('is_read', false);
        refreshNotifications();
      }
    }, 2000);
  }, [user, refreshNotifications]);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    refreshNotifications();
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false);
  };

  const handleCircleAccept = async (notificationId: string, requesterId: string) => {
    // Find the circle request and accept it
    const { error } = await supabase
      .from('circles')
      .update({ status: 'accepted' })
      .eq('requester_id', requesterId)
      .eq('requestee_id', user!.id)
      .eq('status', 'pending');

    if (!error) {
      setCircleActionStates(prev => ({ ...prev, [notificationId]: 'accepted' }));
      // Mark notification as read
      await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
    } else {
      toast.error('Could not accept request');
    }
  };

  const handleCircleDecline = async (notificationId: string, requesterId: string) => {
    await supabase
      .from('circles')
      .delete()
      .eq('requester_id', requesterId)
      .eq('requestee_id', user!.id)
      .eq('status', 'pending');

    setCircleActionStates(prev => ({ ...prev, [notificationId]: 'declined' }));
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
  };

  // Group notifications
  const grouped = groupNotifications(notifications, actors, campfireNames);
  const hasUnread = notifications.some(n => !n.is_read);

  if (loading) return <PineTreeLoading />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto px-4 py-8"
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-foreground">🏮 Lantern</h1>
        {hasUnread && (
          <button onClick={markAllRead} className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors">
            Mark all as read
          </button>
        )}
      </div>

      {grouped.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🏮</p>
          <p className="font-display text-lg text-foreground mb-1">All quiet.</p>
          <p className="font-body text-sm text-muted-foreground">The forest is still.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group, idx) => (
            <motion.div
              key={`${group.type}-${idx}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">{getSectionEmoji(group.type)}</span>
                <span className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {getSectionTitle(group.type)}
                </span>
                {group.type === 'reaction_batch' && (
                  <span className="font-body text-[10px] text-muted-foreground ml-auto">Delivered this morning</span>
                )}
              </div>

              <div className="space-y-2">
                {group.type === 'campfire_message' ? (
                  // Grouped by campfire
                  <CampfireGroup items={group.items} campfireNames={campfireNames} actors={actors} navigate={navigate} />
                ) : group.type === 'circle_request' ? (
                  <CircleRequestGroup
                    items={group.items}
                    actors={actors}
                    actionStates={circleActionStates}
                    onAccept={handleCircleAccept}
                    onDecline={handleCircleDecline}
                    navigate={navigate}
                  />
                ) : group.type === 'reaction_batch' ? (
                  <ReactionGroup items={group.items} />
                ) : group.type === 'invite_accepted' ? (
                  <InviteGroup items={group.items} actors={actors} navigate={navigate} />
                ) : (
                  group.items.map(item => (
                    <NotificationItem
                      key={item.id}
                      item={item}
                      actors={actors}
                      navigate={navigate}
                    />
                  ))
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// --- Sub-components ---

const CampfireGroup = ({ items, campfireNames, actors, navigate }: {
  items: NotificationRow[];
  campfireNames: Record<string, string>;
  actors: Record<string, ActorProfile>;
  navigate: (path: string) => void;
}) => {
  const byCampfire: Record<string, NotificationRow[]> = {};
  items.forEach(item => {
    const cid = item.campfire_id || 'unknown';
    if (!byCampfire[cid]) byCampfire[cid] = [];
    byCampfire[cid].push(item);
  });

  return (
    <>
      {Object.entries(byCampfire).map(([cid, cItems]) => (
        <button
          key={cid}
          onClick={() => navigate('/campfires')}
          className="w-full text-left py-1.5 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
        >
          <p className="font-body text-sm text-foreground">
            {campfireNames[cid] || 'Campfire'} · {cItems.length} new message{cItems.length > 1 ? 's' : ''}
          </p>
          {cItems.length === 1 && cItems[0].actor_id && actors[cItems[0].actor_id] && (
            <p className="font-body text-xs text-muted-foreground mt-0.5">
              {actors[cItems[0].actor_id].display_name} sent a message
            </p>
          )}
        </button>
      ))}
    </>
  );
};

const CircleRequestGroup = ({ items, actors, actionStates, onAccept, onDecline, navigate }: {
  items: NotificationRow[];
  actors: Record<string, ActorProfile>;
  actionStates: Record<string, 'accepted' | 'declined' | null>;
  onAccept: (notifId: string, requesterId: string) => void;
  onDecline: (notifId: string, requesterId: string) => void;
  navigate: (path: string) => void;
}) => {
  if (items.length === 1) {
    const item = items[0];
    const actor = item.actor_id ? actors[item.actor_id] : null;
    const state = actionStates[item.id];

    return (
      <div className="py-1.5">
        <p className="font-body text-sm text-foreground">
          {actor?.display_name || 'Someone'} wants to join your Circle.
        </p>
        <AnimatePresence mode="wait">
          {state === 'accepted' ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-body text-xs text-primary mt-1.5">
              {actor?.display_name} is now in your Circle ✓
            </motion.p>
          ) : state === 'declined' ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-body text-xs text-muted-foreground mt-1.5">
              Request declined.
            </motion.p>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 mt-2">
              <button
                onClick={() => item.actor_id && onAccept(item.id, item.actor_id)}
                className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground font-body text-xs"
              >
                Accept
              </button>
              <button
                onClick={() => item.actor_id && onDecline(item.id, item.actor_id)}
                className="px-3 py-1.5 rounded-full border border-border font-body text-xs text-muted-foreground hover:bg-muted"
              >
                Not now
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="py-1.5">
      <p className="font-body text-sm text-foreground">
        {items.length} people want to join your Circle.
      </p>
      <button
        onClick={() => navigate('/circles')}
        className="mt-2 px-3 py-1.5 rounded-full border border-border font-body text-xs text-foreground hover:bg-muted"
      >
        View requests →
      </button>
    </div>
  );
};

const ReactionGroup = ({ items }: { items: NotificationRow[] }) => {
  const reactionEmojis = '🔥🌲💚✨';
  return (
    <div className="py-1.5">
      <p className="font-body text-sm text-foreground">
        {items.length} {items.length === 1 ? 'person' : 'people'} reacted to your posts
      </p>
      <p className="font-body text-xs text-muted-foreground mt-0.5">
        {reactionEmojis}
      </p>
    </div>
  );
};

const InviteGroup = ({ items, actors, navigate }: {
  items: NotificationRow[];
  actors: Record<string, ActorProfile>;
  navigate: (path: string) => void;
}) => {
  if (items.length === 1 && items[0].actor_id && actors[items[0].actor_id]) {
    return (
      <button onClick={() => navigate('/invites')} className="w-full text-left py-1.5">
        <p className="font-body text-sm text-foreground">
          {actors[items[0].actor_id].display_name} accepted your invite.
        </p>
      </button>
    );
  }
  return (
    <button onClick={() => navigate('/invites')} className="w-full text-left py-1.5">
      <p className="font-body text-sm text-foreground">
        {items.length} people accepted your invites.
      </p>
    </button>
  );
};

const NotificationItem = ({ item, actors, navigate }: {
  item: NotificationRow;
  actors: Record<string, ActorProfile>;
  navigate: (path: string) => void;
}) => {
  const actor = item.actor_id ? actors[item.actor_id] : null;
  const { label, action } = getNotificationContent(item, actor, navigate);

  return (
    <button onClick={action} className="w-full text-left py-1.5 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors">
      <p className="font-body text-sm text-foreground">{label}</p>
      <p className="font-body text-[10px] text-muted-foreground mt-0.5">
        {formatTime(item.created_at)}
      </p>
    </button>
  );
};

// --- Helpers ---

function groupNotifications(
  notifications: NotificationRow[],
  actors: Record<string, ActorProfile>,
  campfireNames: Record<string, string>
): GroupedNotification[] {
  const groups: GroupedNotification[] = [];
  const typeOrder = ['campfire_message', 'circle_request', 'circle_accepted', 'reply', 'quote_post', 'reaction_batch', 'invite_accepted', 'smoke_signal', 'camp_join_request', 'camp_join_accepted', 'camp_role_changed', 'camp_post_removed', 'bonfire_split', 'camp_newsletter', 'system'];

  const byType: Record<string, NotificationRow[]> = {};
  notifications.forEach(n => {
    const t = n.notification_type;
    if (!byType[t]) byType[t] = [];
    byType[t].push(n);
  });

  typeOrder.forEach(type => {
    if (byType[type] && byType[type].length > 0) {
      groups.push({
        type,
        items: byType[type],
        actors: byType[type]
          .map(n => n.actor_id ? actors[n.actor_id] : null)
          .filter(Boolean) as ActorProfile[],
        label: getSectionTitle(type),
      });
    }
  });

  // Any remaining types
  Object.keys(byType).forEach(type => {
    if (!typeOrder.includes(type) && byType[type].length > 0) {
      groups.push({
        type,
        items: byType[type],
        actors: [],
        label: getSectionTitle(type),
      });
    }
  });

  return groups;
}

function getSectionEmoji(type: string): string {
  const map: Record<string, string> = {
    campfire_message: '🔥',
    circle_request: '🌲',
    circle_accepted: '🌲',
    reply: '💬',
    quote_post: '💬',
    reaction_batch: '💚',
    invite_accepted: '🌱',
    smoke_signal: '🌫️',
    camp_join_request: '🏕️',
    camp_join_accepted: '🏕️',
    camp_role_changed: '🏕️',
    camp_post_removed: '🏕️',
    bonfire_split: '🏕️',
    camp_newsletter: '🏕️',
    system: '🏮',
  };
  return map[type] || '🏮';
}

function getSectionTitle(type: string): string {
  const map: Record<string, string> = {
    campfire_message: 'Campfires',
    circle_request: 'Circles',
    circle_accepted: 'Circles',
    reply: 'Replies',
    quote_post: 'Quotes',
    reaction_batch: 'Reactions',
    invite_accepted: 'Invites',
    smoke_signal: 'Smoke Signals',
    camp_join_request: 'Camps',
    camp_join_accepted: 'Camps',
    camp_role_changed: 'Camps',
    camp_post_removed: 'Camps',
    bonfire_split: 'Camps',
    camp_newsletter: 'Camps',
    system: 'Updates',
  };
  return map[type] || 'Notifications';
}

function getNotificationContent(
  item: NotificationRow,
  actor: ActorProfile | null,
  navigate: (path: string) => void
): { label: string; action: () => void } {
  const name = actor?.display_name || 'Someone';

  switch (item.notification_type) {
    case 'circle_accepted':
      return {
        label: `${name} accepted your Circle request.`,
        action: () => actor && navigate(`/@${actor.handle}`),
      };
    case 'reply':
      return {
        label: `${name} replied to your post.`,
        action: () => {},
      };
    case 'quote_post':
      return {
        label: `${name} quoted your post.`,
        action: () => {},
      };
    case 'smoke_signal':
      return {
        label: 'Someone sent you a smoke signal.',
        action: () => {},
      };
    case 'system':
      return {
        label: 'Welcome to Pines+. Your Cabin just got a little more yours.',
        action: () => navigate('/cabin'),
      };
    case 'collection_subscriber':
      return {
        label: `${name} subscribed to your collection.`,
        action: () => {},
      };
    case 'camp_join_request':
      return {
        label: `${name} wants to join your Camp.`,
        action: () => {},
      };
    case 'camp_join_accepted':
      return {
        label: 'Your Camp join request was accepted!',
        action: () => {},
      };
    case 'camp_role_changed':
      return {
        label: 'Your Camp role was updated.',
        action: () => {},
      };
    case 'camp_post_removed':
      return {
        label: 'A Trailblazer removed your post from a Camp.',
        action: () => {},
      };
    case 'bonfire_split':
      return {
        label: 'Your Bonfire has grown past 150 members. A second fire was started.',
        action: () => {},
      };
    case 'camp_newsletter':
      return {
        label: `${name} sent a newsletter from your Camp.`,
        action: () => {},
      };
    default:
      return {
        label: 'New notification',
        action: () => {},
      };
  }
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default Lantern;
