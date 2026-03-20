import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type PushState = 'default' | 'granted' | 'denied' | 'unsupported';

const usePushNotifications = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PushState>(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';
    return Notification.permission as PushState;
  });

  const subscribe = useCallback(async () => {
    if (!user) return;
    if (!('Notification' in window) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }

    const permission = await Notification.requestPermission();
    setState(permission as PushState);

    if (permission !== 'granted') return;

    try {
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        toast.error('Push notifications are not configured yet.');
        return;
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      const sub = subscription.toJSON();

      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: sub.endpoint!,
        keys: sub.keys as any,
      }, { onConflict: 'user_id,endpoint' });

      if (error) {
        toast.error('Could not save push subscription');
      } else {
        toast.success('Push notifications enabled');
      }
    } catch (err) {
      console.error('Push subscription error:', err);
      toast.error('Could not enable push notifications');
    }
  }, [user]);

  return { state, subscribe };
};

export default usePushNotifications;
