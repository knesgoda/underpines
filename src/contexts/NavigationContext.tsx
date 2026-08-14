import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CAMPFIRE_LAST_SEEN_KEY, useBootState } from '@/hooks/useBootState';


interface NavigationContextType {
  unreadCount: number;
  hasUnreadNotifications: boolean;
  hasUnreadCampfires: boolean;
  markCampfiresSeen: () => void;
  onlineIds: Set<string>;
  composerOpen: boolean;
  setComposerOpen: (open: boolean) => void;
  refreshNotifications: () => void;
}

const NavigationContext = createContext<NavigationContextType>({
  unreadCount: 0,
  hasUnreadNotifications: false,
  hasUnreadCampfires: false,
  markCampfiresSeen: () => {},
  onlineIds: new Set<string>(),
  composerOpen: false,
  setComposerOpen: () => {},
  refreshNotifications: () => {},
});

export const useNavigation = () => useContext(NavigationContext);

export const NavigationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { data: boot } = useBootState();
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasUnreadCampfires, setHasUnreadCampfires] = useState(false);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(() => new Set());
  const [composerOpen, setComposerOpen] = useState(false);

  /**
   * Re-count after a mutation the realtime stream cannot express — marking
   * everything read, mostly. The boot payload seeds the first value, so this
   * is a correction path rather than the initial load it used to be.
   */
  const refreshNotifications = async () => {
    if (!user) { setUnreadCount(0); return; }
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false);
    setUnreadCount(count ?? 0);
  };

  // Seed both counters from the single boot request.
  useEffect(() => {
    if (!user) { setUnreadCount(0); setHasUnreadCampfires(false); return; }
    if (!boot) return;
    setUnreadCount(boot.unread_notifications);
    setHasUnreadCampfires(boot.has_unread_messages);
  }, [user, boot]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('nav-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${user.id}`,
      }, () => {
        // Reactions count too now — they arrive live, aggregated per post.
        // (An aggregation bump on an existing row lands as an UPDATE below.)
        setUnreadCount(prev => prev + 1);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${user.id}`,
      }, () => {
        refreshNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markCampfiresSeen = useCallback(() => {
    localStorage.setItem(CAMPFIRE_LAST_SEEN_KEY, new Date().toISOString());
    setHasUnreadCampfires(false);
  }, []);

  // Campfire unread lives here rather than in a hook because both nav bars
  // are always mounted — only CSS hides one — so a per-component hook opened
  // two realtime channels on one topic.
  //
  // The initial value comes from the boot payload; this effect now only keeps
  // the realtime subscription. The two chained requests it used to make — the
  // participant list, then a count filtered by it — are gone, and with them
  // one of the boot's two extra round trips of latency.
  useEffect(() => {
    if (!user) { setHasUnreadCampfires(false); return; }

    const channel = supabase
      .channel('campfire-unread-indicator')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'campfire_messages' },
        (payload) => {
          const message = payload.new as { sender_id?: string } | null;
          if (message?.sender_id !== user.id) {
            setHasUnreadCampfires(true);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // One presence channel for the whole session. Deliberately not per-component:
  // that is what made useCampfireUnread open two subscriptions on one topic, and
  // presence would multiply the same mistake by every buddy row on screen.
  useEffect(() => {
    if (!user) { setOnlineIds(new Set()); return; }

    const channel = supabase.channel('presence:online', {
      config: { presence: { key: user.id } },
    });

    const sync = () => {
      // presenceState() is keyed by user id, so its keys are the online set.
      setOnlineIds(new Set(Object.keys(channel.presenceState())));
    };

    channel
      .on('presence', { event: 'sync' }, sync)
      .on('presence', { event: 'join' }, sync)
      .on('presence', { event: 'leave' }, sync)
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ at: new Date().toISOString() });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <NavigationContext.Provider value={{
      unreadCount,
      hasUnreadNotifications: unreadCount > 0,
      hasUnreadCampfires,
      markCampfiresSeen,
      onlineIds,
      composerOpen,
      setComposerOpen,
      refreshNotifications,
    }}>
      {children}
    </NavigationContext.Provider>
  );
};
