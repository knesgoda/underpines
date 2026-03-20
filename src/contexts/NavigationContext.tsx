import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface NavigationContextType {
  hasUnreadNotifications: boolean;
  composerOpen: boolean;
  setComposerOpen: (open: boolean) => void;
  refreshNotifications: () => void;
}

const NavigationContext = createContext<NavigationContextType>({
  hasUnreadNotifications: false,
  composerOpen: false,
  setComposerOpen: () => {},
  refreshNotifications: () => {},
});

export const useNavigation = () => useContext(NavigationContext);

export const NavigationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const refreshNotifications = async () => {
    if (!user) { setHasUnread(false); return; }
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false);
    setHasUnread((count ?? 0) > 0);
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
      }, () => setHasUnread(true))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <NavigationContext.Provider value={{
      hasUnreadNotifications: hasUnread,
      composerOpen,
      setComposerOpen,
      refreshNotifications,
    }}>
      {children}
    </NavigationContext.Provider>
  );
};
