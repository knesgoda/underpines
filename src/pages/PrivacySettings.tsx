import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PineTreeLoading from '@/components/PineTreeLoading';
import { toast } from 'sonner';

interface PrivacyPrefs {
  campfire_visibility: string;
  cabin_visibility: string;
  collections_visibility: string;
  show_weather: boolean;
  show_city: boolean;
  cabin_visit_mode: string;
  read_receipts: boolean;
  message_requests: boolean;
}

const defaults: PrivacyPrefs = {
  campfire_visibility: 'circles',
  cabin_visibility: 'circles',
  collections_visibility: 'circles',
  show_weather: true,
  show_city: false,
  cabin_visit_mode: 'anonymous_count',
  read_receipts: false,
  message_requests: false,
};

const VISIBILITY_OPTIONS = [
  { value: 'circles', label: 'Friends only' },
  { value: 'circles_and_camps', label: 'Friends and group members' },
  { value: 'everyone', label: 'All members' },
];

const VISIT_MODE_OPTIONS = [
  { value: 'anonymous_count', label: 'Anonymous count only' },
  { value: 'visible', label: 'Show who visited' },
  { value: 'hidden', label: 'Hidden entirely' },
];

const PrivacySettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<PrivacyPrefs>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('privacy_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setPrefs({
          campfire_visibility: data.campfire_visibility ?? 'circles',
          cabin_visibility: data.cabin_visibility ?? 'circles',
          collections_visibility: data.collections_visibility ?? 'circles',
          show_weather: data.show_weather ?? true,
          show_city: data.show_city ?? false,
          cabin_visit_mode: data.cabin_visit_mode ?? 'anonymous_count',
          read_receipts: data.read_receipts ?? false,
          message_requests: data.message_requests ?? false,
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const save = async (updates: Partial<PrivacyPrefs>) => {
    if (!user) return;
    const newPrefs = { ...prefs, ...updates };
    setPrefs(newPrefs);

    const { error } = await supabase
      .from('privacy_settings')
      .upsert({ user_id: user.id, ...newPrefs }, { onConflict: 'user_id' });

    if (error) toast.error('Could not save privacy settings');
  };

  if (loading) return <PineTreeLoading />;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto px-4 py-8">
      <h1 className="font-display text-2xl text-foreground mb-2">Privacy</h1>
      <p className="font-body text-sm text-muted-foreground mb-8">
        All settings default to the most private option.
      </p>

      {/* Visibility controls */}
      <div className="rounded-[5px] border border-border bg-card p-5 mb-6">
        <p className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Who can reach you</p>
        <div className="space-y-5">
          <VisibilityRow
            label="Who can start a conversation with you"
            value={prefs.campfire_visibility}
            options={VISIBILITY_OPTIONS}
            onChange={(v) => save({ campfire_visibility: v })}
          />
          <VisibilityRow
            label="Who can see your page"
            value={prefs.cabin_visibility}
            options={VISIBILITY_OPTIONS}
            onChange={(v) => save({ cabin_visibility: v })}
          />
          <VisibilityRow
            label="Who can see your Collections"
            value={prefs.collections_visibility}
            options={VISIBILITY_OPTIONS}
            onChange={(v) => save({ collections_visibility: v })}
          />
        </div>
      </div>

      {/* Page display */}
      <div className="rounded-[5px] border border-border bg-card p-5 mb-6">
        <p className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Your page</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-sm text-foreground">Show your city on your page</p>
              <p className="font-body text-[11px] text-muted-foreground mt-0.5">Display your city name to visitors</p>
            </div>
            <Switch checked={prefs.show_city} onCheckedChange={(v) => save({ show_city: v })} />
          </div>
          <div className="h-px bg-border" />
          <VisibilityRow
            label="Page visit count"
            value={prefs.cabin_visit_mode}
            options={VISIT_MODE_OPTIONS}
            onChange={(v) => save({ cabin_visit_mode: v })}
          />
        </div>
      </div>

      {/* Messaging */}
      <div className="rounded-[5px] border border-border bg-card p-5 mb-6">
        <p className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Messaging</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-sm text-foreground">Read receipts</p>
              <p className="font-body text-[11px] text-muted-foreground mt-0.5">Requires mutual opt-in to take effect</p>
            </div>
            <Switch checked={prefs.read_receipts} onCheckedChange={(v) => save({ read_receipts: v })} />
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-sm text-foreground">Message requests from people you are not friends with</p>
              <p className="font-body text-[11px] text-muted-foreground mt-0.5">Let people who are not friends ask to message you</p>
            </div>
            <Switch checked={prefs.message_requests} onCheckedChange={(v) => save({ message_requests: v })} />
          </div>
        </div>
      </div>

      <button onClick={() => navigate('/settings')} className="font-body text-xs text-muted-foreground hover:underline">
        ← Back to Settings
      </button>
    </motion.div>
  );
};

const VisibilityRow = ({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) => (
  <div className="flex items-center justify-between gap-4">
    <span className="font-body text-sm text-foreground">{label}</span>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-44 h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export default PrivacySettings;
