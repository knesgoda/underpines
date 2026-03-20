import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface NavigationContextType {
  unreadCount: number;
  hasUnreadNotifications: boolean;
  composerOpen: boolean;
  setComposerOpen: (open: boolean) => void;
  refreshNotifications: () => void;
}

const NavigationContext = createContext<NavigationContextType>({
  unreadCount: 0,
  hasUnreadNotifications: false,
  composerOpen: false,
  setComposerOpen: () => {},
  refreshNotifications: () => {},
});

export const useNavigation = () => useContext(NavigationContext);

export const NavigationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);

  const refreshNotifications = async () => {
    if (!user) { setUnreadCount(0); return; }
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false);
    setUnreadCount(count ?? 0);
  };

  useEffect(() => {
    refreshNotifications();
    if (!user) return;

    const channel = supabase
      .channel('nav-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${user.id}`,
      }, () => {
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

  return (
    <NavigationContext.Provider value={{
      unreadCount,
      hasUnreadNotifications: unreadCount > 0,
      composerOpen,
      setComposerOpen,
      refreshNotifications,
    }}>
      {children}
    </NavigationContext.Provider>
  );
};
