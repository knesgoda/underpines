import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const TEMPLATE_KEYS = [
  { key: 'warning_template', label: 'Warning template' },
  { key: 'suspension_template', label: 'Suspension template' },
  { key: 'ban_template', label: 'Ban template' },
];

const GroveSettings = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('platform_settings').select('key, value');
      const map: Record<string, string> = {};
      data?.forEach(d => { map[d.key] = d.value; });
      setTemplates(map);
      setLoading(false);
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      for (const t of TEMPLATE_KEYS) {
        if (templates[t.key] !== undefined) {
          await supabase.from('platform_settings')
            .update({ value: templates[t.key], updated_by: user?.id, updated_at: new Date().toISOString() })
            .eq('key', t.key);
        }
      }
      toast.success('Templates saved.');
    } catch {
      toast.error('Failed to save.');
    }
    setSaving(false);
  };

  if (loading) return <p className="text-sm text-[hsl(var(--pine-light)/0.5)]">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="font-display text-xl font-bold text-[hsl(var(--pine-pale))]">Settings</h1>

      <Card className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
        <CardContent className="p-4 space-y-2">
          <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-[hsl(var(--amber-mid))]">AI Triage</h2>
          <div className="text-sm text-[hsl(var(--pine-light)/0.7)]">
            Model: Gemini 2.5 Flash · Status: <span className="text-green-400">✓ Connected</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
        <CardContent className="p-4 space-y-4">
          <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-[hsl(var(--amber-mid))]">Platform Messages</h2>
          {TEMPLATE_KEYS.map(t => (
            <div key={t.key} className="space-y-1">
              <label className="text-xs text-[hsl(var(--pine-light)/0.6)]">{t.label}</label>
              <Textarea
                value={templates[t.key] || ''}
                onChange={e => setTemplates(prev => ({ ...prev, [t.key]: e.target.value }))}
                className="bg-[hsl(var(--pine-darkest))] border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-light))] text-sm min-h-[80px]"
              />
            </div>
          ))}
          <Button onClick={save} disabled={saving} size="sm" className="text-xs">
            {saving ? 'Saving…' : 'Save templates'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default GroveSettings;
