import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  campId: string;
  firekeeper_id: string;
  members: { id: string; user_id: string; role: string; profile?: { display_name: string; handle: string } }[];
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const TIMES = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'Europe/London', 'Europe/Paris',
  'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney',
];

const CampNewsletterSettings = ({ campId, firekeeper_id, members }: Props) => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<any>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [frequency, setFrequency] = useState('weekly');
  const [sendDay, setSendDay] = useState('monday');
  const [sendTime, setSendTime] = useState('08:00');
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  const [editorId, setEditorId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [sentCount, setSentCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const trailblazers = members.filter(m => m.role === 'trailblazer');

  useEffect(() => {
    const load = async () => {
      const [settingsRes, draftsRes, scheduledRes, sentRes] = await Promise.all([
        supabase.from('camp_newsletter_settings').select('*').eq('camp_id', campId).maybeSingle(),
        supabase.from('camp_newsletters').select('*').eq('camp_id', campId).eq('status', 'draft').order('updated_at', { ascending: false }),
        supabase.from('camp_newsletters').select('*').eq('camp_id', campId).eq('status', 'scheduled').order('scheduled_for', { ascending: true }),
        supabase.from('camp_newsletters').select('id', { count: 'exact', head: true }).eq('camp_id', campId).eq('status', 'sent'),
      ]);

      if (settingsRes.data) {
        const s = settingsRes.data;
        setSettings(s);
        setIsEnabled(s.is_enabled);
        setFrequency(s.frequency);
        setSendDay(s.send_day);
        setSendTime(s.send_time?.slice(0, 5) || '08:00');
        setTimezone(s.timezone || 'America/Los_Angeles');
        setEditorId(s.editor_id);
      }
      setDrafts(draftsRes.data || []);
      setScheduled(scheduledRes.data || []);
      setSentCount(sentRes.count || 0);
      setLoaded(true);
    };
    load();
  }, [campId]);

  const saveSettings = async () => {
    const payload = {
      camp_id: campId,
      is_enabled: isEnabled,
      frequency,
      send_day: sendDay,
      send_time: `${sendTime}:00`,
      timezone,
      editor_id: editorId,
    };

    if (settings) {
      await supabase.from('camp_newsletter_settings').update(payload).eq('id', settings.id);
    } else {
      await supabase.from('camp_newsletter_settings').insert(payload);
    }
    toast.success('Newsletter settings saved.');
  };

  const deleteDraft = async (id: string) => {
    await supabase.from('camp_newsletters').delete().eq('id', id);
    setDrafts(prev => prev.filter(d => d.id !== id));
    toast('Draft deleted.');
  };

  const cancelSchedule = async (id: string) => {
    await supabase.from('camp_newsletters').update({ status: 'draft', scheduled_for: null }).eq('id', id);
    setScheduled(prev => prev.filter(s => s.id !== id));
    toast('Schedule cancelled. Moved to drafts.');
  };

  if (!loaded) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-body text-sm font-medium text-foreground mb-3">Camp Newsletter</h2>
        <p className="font-body text-xs text-muted-foreground mb-4">
          Send a periodic newsletter to all Camp members via their Daily Ember.
        </p>

        <div className="flex items-center gap-3 mb-4">
          <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          <span className="font-body text-sm text-foreground">Enable Newsletter</span>
        </div>

        {isEnabled && (
          <div className="space-y-3 pl-1">
            <div>
              <label className="font-body text-xs text-muted-foreground mb-1 block">Frequency</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card font-body text-sm text-foreground">
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="font-body text-xs text-muted-foreground mb-1 block">Send on</label>
              <select value={sendDay} onChange={e => setSendDay(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card font-body text-sm text-foreground capitalize">
                {DAYS.map(d => <option key={d} value={d} className="capitalize">{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="font-body text-xs text-muted-foreground mb-1 block">Send at</label>
              <select value={sendTime} onChange={e => setSendTime(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card font-body text-sm text-foreground">
                {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="font-body text-xs text-muted-foreground mb-1 block">Timezone</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card font-body text-sm text-foreground">
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            {trailblazers.length > 0 && (
              <div>
                <label className="font-body text-xs text-muted-foreground mb-1 block">Editor</label>
                <select value={editorId || ''} onChange={e => setEditorId(e.target.value || null)} className="w-full px-3 py-2 rounded-lg border border-border bg-card font-body text-sm text-foreground">
                  <option value="">Firekeeper only</option>
                  {trailblazers.map(tb => (
                    <option key={tb.user_id} value={tb.user_id}>{tb.profile?.display_name || tb.profile?.handle || 'Trailblazer'}</option>
                  ))}
                </select>
                <p className="font-body text-[10px] text-muted-foreground mt-1">Who can draft and send newsletters. Firekeeper always has access.</p>
              </div>
            )}
          </div>
        )}

        <Button onClick={saveSettings} size="sm" className="mt-4 rounded-full">Save settings</Button>
      </div>

      {/* Write Newsletter button */}
      <Button onClick={() => navigate(`/camps/${campId}/newsletter/new`)} className="rounded-full w-full">
        Write Newsletter
      </Button>

      {/* Drafts */}
      {drafts.length > 0 && (
        <div>
          <h3 className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Drafts ({drafts.length})</h3>
          <div className="space-y-2">
            {drafts.map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                <div>
                  <p className="font-body text-sm text-foreground">{d.title}</p>
                  <p className="font-body text-[10px] text-muted-foreground">Last edited {new Date(d.updated_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/camps/${campId}/newsletter/new?edit=${d.id}`)} className="font-body text-xs text-primary hover:underline">Edit</button>
                  <button onClick={() => deleteDraft(d.id)} className="font-body text-xs text-destructive hover:underline">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled */}
      {scheduled.length > 0 && (
        <div>
          <h3 className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Scheduled ({scheduled.length})</h3>
          <div className="space-y-2">
            {scheduled.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                <div>
                  <p className="font-body text-sm text-foreground">{s.title}</p>
                  <p className="font-body text-[10px] text-muted-foreground">
                    Scheduled for {new Date(s.scheduled_for).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/camps/${campId}/newsletter/new?edit=${s.id}`)} className="font-body text-xs text-primary hover:underline">Edit</button>
                  <button onClick={() => cancelSchedule(s.id)} className="font-body text-xs text-destructive hover:underline">Cancel</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sent archive link */}
      {sentCount > 0 && (
        <div>
          <h3 className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Sent ({sentCount})</h3>
          <button onClick={() => navigate(`/camps/${campId}/newsletters`)} className="font-body text-xs text-primary hover:underline">
            View newsletter archive →
          </button>
        </div>
      )}
    </div>
  );
};

export default CampNewsletterSettings;
