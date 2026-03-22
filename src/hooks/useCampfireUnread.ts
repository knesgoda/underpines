import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns true if there are campfire messages newer than the user's last visit
 * to /campfires. Tracks "last seen" in localStorage and listens via realtime.
 */
export const useCampfireUnread = () => {
  const { user } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);

  const LS_KEY = 'campfire_last_seen';

  const getLastSeen = useCallback(() => {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? new Date(raw) : new Date(0);
  }, []);

  const markSeen = useCallback(() => {
    localStorage.setItem(LS_KEY, new Date().toISOString());
    setHasUnread(false);
  }, []);

  // Initial check: are there messages newer than last seen?
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const lastSeen = getLastSeen();

      // Get user's campfire IDs
      const { data: participations } = await supabase
        .from('campfire_participants')
        .select('campfire_id')
        .eq('user_id', user.id);

      if (!participations?.length) return;

      const ids = participations.map(p => p.campfire_id);

      // Check for any message after lastSeen that isn't from the user
      const { count } = await supabase
        .from('campfire_messages')
        .select('id', { count: 'exact', head: true })
        .in('campfire_id', ids)
        .neq('sender_id', user.id)
        .gt('created_at', lastSeen.toISOString());

      setHasUnread((count ?? 0) > 0);
    };
    check();
  }, [user, getLastSeen]);

  // Realtime: listen for new messages
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('campfire-unread-indicator')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'campfire_messages' },
        (payload) => {
          // Only flag unread if the message isn't from the current user
          if ((payload.new as any)?.sender_id !== user.id) {
            setHasUnread(true);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return { hasUnread, markSeen };
};
