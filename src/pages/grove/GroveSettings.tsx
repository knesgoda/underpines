import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Copy, RefreshCw, Shield } from 'lucide-react';

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
  const [inviteSlug, setInviteSlug] = useState('');
  const [rotating, setRotating] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [lastRateLimit, setLastRateLimit] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('platform_settings').select('key, value');
      const map: Record<string, string> = {};
      data?.forEach(d => { map[d.key] = d.value; });
      setTemplates(map);

      // Parse last rate limit event
      if (map['last_invite_rate_limit']) {
        try {
          setLastRateLimit(JSON.parse(map['last_invite_rate_limit']));
        } catch {}
      }

      // Fetch founder invite slug
      if (user) {
        const { data: inv } = await supabase
          .from('invites')
          .select('slug')
          .eq('inviter_id', user.id)
          .eq('is_infinite', true)
          .maybeSingle();
        if (inv) setInviteSlug(inv.slug);
      }

      setLoading(false);
    };
    load();
  }, [user]);

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

  const handleRotateLink = async () => {
    if (!user || !confirmPassword.trim()) return;
    setRotating(true);

    // Re-authenticate to confirm identity
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: confirmPassword,
    });

    if (authErr) {
      toast.error("Password doesn't match. Link not rotated.");
      setRotating(false);
      return;
    }

    const { data: newSlug, error: rotErr } = await supabase.rpc('rotate_invite_link', {
      _user_id: user.id,
    });

    if (rotErr || !newSlug) {
      toast.error('Failed to rotate link.');
    } else {
      setInviteSlug(newSlug as string);
      toast.success('Your old invite link is deactivated. Here is your new one.');
    }

    setConfirmPassword('');
    setShowRotateConfirm(false);
    setRotating(false);
  };

  if (loading) return <p className="text-sm text-[hsl(var(--pine-light)/0.5)]">Loading…</p>;

  const inviteUrl = `https://underpines.com/invite/${inviteSlug}`;

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="font-display text-xl font-bold text-[hsl(var(--pine-pale))]">Settings</h1>

      {/* Founder Invite Link Security */}
      <Card className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-[hsl(var(--amber-mid))]" />
            <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-[hsl(var(--amber-mid))]">Founder Invite Link</h2>
          </div>

          {inviteSlug && (
            <div className="flex items-center gap-2 bg-[hsl(var(--pine-darkest))] rounded-lg px-3 py-2 border border-[hsl(var(--pine-mid)/0.2)]">
              <code className="text-xs text-[hsl(var(--pine-light)/0.8)] flex-1 break-all font-body">
                {inviteUrl}
              </code>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(inviteUrl);
                  } catch {
                    const textarea = document.createElement('textarea');
                    textarea.value = inviteUrl;
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                  }
                  toast.success('Link copied');
                }}
                className="shrink-0 text-[hsl(var(--pine-light)/0.5)] hover:text-[hsl(var(--pine-light))] transition-colors"
              >
                <Copy size={14} />
              </button>
            </div>
          )}

          <div className="text-xs text-[hsl(var(--pine-light)/0.5)] space-y-1">
            <p>Rate limits: 5/hour, 20/day · 1 signup per IP per 24h</p>
            {lastRateLimit && (
              <p className="text-amber-400/70">
                ⚠ Last rate limit hit: {lastRateLimit.reason} at {new Date(lastRateLimit.timestamp).toLocaleString()}
              </p>
            )}
          </div>

          {!showRotateConfirm ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRotateConfirm(true)}
              className="text-xs border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-light)/0.7)] hover:text-[hsl(var(--pine-light))]"
            >
              <RefreshCw size={12} className="mr-1.5" />
              Rotate Link
            </Button>
          ) : (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-[hsl(var(--pine-light)/0.6)]">
                Enter your password to confirm. Your old link will stop working immediately.
              </p>
              <Input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="bg-[hsl(var(--pine-darkest))] border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-light))] text-sm h-9"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleRotateLink()}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleRotateLink}
                  disabled={rotating || !confirmPassword.trim()}
                  className="text-xs"
                >
                  {rotating ? 'Rotating…' : 'Confirm Rotation'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowRotateConfirm(false); setConfirmPassword(''); }}
                  className="text-xs text-[hsl(var(--pine-light)/0.5)]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
