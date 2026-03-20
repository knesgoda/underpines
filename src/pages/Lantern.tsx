import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import PineTreeLoading from '@/components/PineTreeLoading';

interface Notification {
  id: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  actor_id: string | null;
}

const Lantern = () => {
  const { user } = useAuth();
  const { refreshNotifications } = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setNotifications(data || []);
      setLoading(false);

      // Mark all as read
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);
      refreshNotifications();
    };
    load();
  }, [user]);

  if (loading) return <PineTreeLoading />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto px-4 py-8"
    >
      <h1 className="font-display text-2xl text-foreground mb-6">🏮 Lantern</h1>

      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🏮</p>
          <p className="font-body text-muted-foreground">
            The lantern is quiet tonight. Nothing new yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl px-4 py-3 font-body text-sm transition-colors ${
                n.is_read ? 'bg-muted/30' : 'bg-primary/5 border border-primary/10'
              }`}
            >
              <p className="text-foreground">{formatNotificationType(n.notification_type)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

const formatNotificationType = (type: string): string => {
  const map: Record<string, string> = {
    reaction_batch: 'Someone reacted to your post',
    reply: 'Someone replied to your post',
    quote_post: 'Someone quoted your post',
    circle_request: 'Someone wants to join your circle',
    circle_accepted: 'Your circle request was accepted',
    invite_accepted: 'Someone accepted your invite',
    smoke_signal: 'You received a smoke signal',
    campfire_message: 'New message in a campfire',
    collection_subscriber: 'Someone subscribed to your collection',
  };
  return map[type] || 'New notification';
};

export default Lantern;
