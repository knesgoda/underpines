import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import WelcomeShell from './WelcomeShell';

/**
 * Step 1 — display name and handle.
 *
 * These run after account creation, not before it: handle_new_user() fills
 * both with placeholders ('New Arrival' and 'user_<id prefix>'), and this step
 * writes over them. That is what lets account creation stay short and keeps
 * the handoff's five-step numbering honest.
 */
export const WelcomeName = ({ onNext }: { onNext: () => void }) => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  const checkAvailability = useCallback(async (value: string) => {
    if (!user) return;
    setChecking(true);
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('handle', value)
      .maybeSingle();
    // The placeholder handle already belongs to this user, so it is free.
    setAvailable(!existing || existing.id === user.id);
    setChecking(false);
  }, [user]);

  useEffect(() => {
    if (handle.length < 3) { setAvailable(null); return; }
    const timer = setTimeout(() => checkAvailability(handle), 400);
    return () => clearTimeout(timer);
  }, [handle, checkAvailability]);

  const onHandleChange = (value: string) => {
    setHandle(value.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
    setAvailable(null);
  };

  const save = async () => {
    if (!user || !available || !displayName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim(), handle })
      .eq('id', user.id);
    setSaving(false);

    if (error) {
      toast.error(
        error.code === '23505'
          ? 'That address was just taken. Try another.'
          : 'Could not save that. Try again.'
      );
      return;
    }
    onNext();
  };

  const ready = displayName.trim().length > 0 && handle.length >= 3 && available === true;

  return (
    <WelcomeShell
      step={1}
      eyebrow="Your name here"
      title="What should people call you?"
      subtitle="Real name, old screen name or something you just made up."
    >
      <label>
        Display name
        <input
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          maxLength={40}
          autoFocus
        />
      </label>

      <label>
        Under Pines address
        <span className="address-field mt-[5px]">
          <span>underpines.com/</span>
          <input
            value={handle}
            onChange={e => onHandleChange(e.target.value)}
            maxLength={24}
            aria-describedby="handle-status"
          />
        </span>
      </label>

      <p id="handle-status" className="min-h-5 text-xs font-body" role="status">
        {checking && <span className="text-muted-foreground">Checking…</span>}
        {!checking && available === true && handle.length >= 3 && (
          <span className="text-primary">underpines.com/{handle} is yours.</span>
        )}
        {!checking && available === false && (
          <span className="text-destructive">That one is taken.</span>
        )}
      </p>

      <Button
        onClick={save}
        disabled={!ready || saving}
        className="mt-4 w-full rounded-pill h-12 font-body"
      >
        {saving ? 'Saving…' : 'Continue'}
      </Button>
    </WelcomeShell>
  );
};

export default WelcomeName;
