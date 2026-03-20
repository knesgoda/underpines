import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PineTreeLoading from '@/components/PineTreeLoading';
import usePushNotifications from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

const DELIVERY_TIMES = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, '0');
  const label = i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`;
  return { value: `${h}:00:00`, label };
});

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'Europe/London', 'Europe/Paris',
  'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney',
];

interface Prefs {
  quiet_mode: boolean;
  ember_delivery_time: string;
  ember_timezone: string;
  notify_circle_requests: boolean;
  notify_invite_accepted: boolean;
  notify_smoke_signals: boolean;
}

const defaults: Prefs = {
  quiet_mode: false,
  ember_delivery_time: '07:00:00',
  ember_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles',
  notify_circle_requests: true,
  notify_invite_accepted: true,
  notify_smoke_signals: true,
};

const NotificationSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<Prefs>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrefs({
            quiet_mode: data.quiet_mode ?? false,
            ember_delivery_time: data.ember_delivery_time ?? '07:00:00',
            ember_timezone: data.ember_timezone ?? defaults.ember_timezone,
            notify_circle_requests: data.notify_circle_requests ?? true,
            notify_invite_accepted: data.notify_invite_accepted ?? true,
            notify_smoke_signals: data.notify_smoke_signals ?? true,
          });
        }
        setLoading(false);
      });
  }, [user]);

  const save = async (updates: Partial<Prefs>) => {
    if (!user) return;
    const newPrefs = { ...prefs, ...updates };
    setPrefs(newPrefs);
    setSaving(true);

    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        ...newPrefs,
      }, { onConflict: 'user_id' });

    if (error) toast.error('Could not save preferences');
    setSaving(false);
  };

  if (loading) return <PineTreeLoading />;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto px-4 py-8">
      <h1 className="font-display text-2xl text-foreground mb-6">Notifications</h1>

      {/* Quiet Mode — prominently first */}
      <div className="rounded-xl border-2 border-primary/20 bg-card p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-body text-base font-semibold text-foreground">Quiet Mode 🌲</h2>
          <Switch
            checked={prefs.quiet_mode}
            onCheckedChange={(v) => save({ quiet_mode: v })}
            className="scale-125 origin-right"
          />
        </div>
        <p className="font-body text-sm text-muted-foreground leading-relaxed">
          When on, only your opted-in Campfire messages come through. Everything else waits for your Daily Ember.
        </p>
        <p className="font-body text-[11px] text-muted-foreground/60 mt-3">
          Under Pines is proud of this feature.
        </p>
      </div>

      {/* Daily Ember */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <p className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Daily Ember</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-body text-sm text-foreground">Delivery time</span>
            <Select value={prefs.ember_delivery_time} onValueChange={(v) => save({ ember_delivery_time: v })}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_TIMES.map(t => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-body text-sm text-foreground">Time zone</span>
            <Select value={prefs.ember_timezone} onValueChange={(v) => save({ ember_timezone: v })}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(tz => (
                  <SelectItem key={tz} value={tz} className="text-xs">{tz.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Real-time notifications */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <p className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Real-time notifications {prefs.quiet_mode && <span className="text-amber-glow">(paused by Quiet Mode)</span>}
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-body text-sm text-foreground">Campfire messages</span>
            <span className="font-body text-xs text-muted-foreground">Per-Campfire</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-body text-sm text-foreground">Circle requests</span>
            <Switch checked={prefs.notify_circle_requests} onCheckedChange={(v) => save({ notify_circle_requests: v })} />
          </div>
          <div className="flex items-center justify-between">
            <span className="font-body text-sm text-foreground">Invite accepted</span>
            <Switch checked={prefs.notify_invite_accepted} onCheckedChange={(v) => save({ notify_invite_accepted: v })} />
          </div>
          <div className="flex items-center justify-between">
            <span className="font-body text-sm text-foreground">Smoke signals</span>
            <Switch checked={prefs.notify_smoke_signals} onCheckedChange={(v) => save({ notify_smoke_signals: v })} />
          </div>
        </div>
      </div>

      {/* Push Notifications */}
      <PushNotificationsSection />

      {/* Always Daily Ember */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <p className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Always in Daily Ember only</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-body text-sm text-foreground">Reactions</span>
            <span className="font-body text-[10px] text-muted-foreground">Always morning delivery</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-body text-sm text-foreground">Quote posts</span>
            <span className="font-body text-[10px] text-muted-foreground">Always morning delivery</span>
          </div>
        </div>
      </div>

      <button onClick={() => navigate('/settings')} className="font-body text-xs text-muted-foreground hover:underline">
        ← Back to Settings
      </button>
    </motion.div>
  );
};

const PushNotificationsSection = () => {
  const { state, subscribe } = usePushNotifications();

  return (
    <div className="rounded-xl border border-border bg-card p-5 mb-6">
      <p className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Push Notifications</p>
      {state === 'unsupported' ? (
        <p className="font-body text-xs text-muted-foreground">Push notifications are not supported in this browser.</p>
      ) : state === 'granted' ? (
        <p className="font-body text-xs text-muted-foreground">✓ Push notifications are enabled.</p>
      ) : state === 'denied' ? (
        <p className="font-body text-xs text-muted-foreground">
          Push notifications were blocked. You can enable them in your browser settings when you're ready.
        </p>
      ) : (
        <>
          <p className="font-body text-sm text-foreground mb-3">
            Get notified when something important arrives — even when the app isn't open.
          </p>
          <button
            onClick={subscribe}
            className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-body text-sm hover:opacity-90 transition-opacity"
          >
            Enable push notifications
          </button>
        </>
      )}
    </div>
  );
};

export default NotificationSettings;
