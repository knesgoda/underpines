import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import WelcomeShell from './WelcomeShell';

interface Suggestion {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  default_avatar_key: string | null;
}

/**
 * Step 4 — first connections, drawn from whoever invited you, the same way
 * CircleSuggestions does it. Requests are sent on continue rather than on
 * each tap, so tapping around is free and nobody is surprised by what went
 * out.
 */
export const WelcomePeople = ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      // Who invited this account, and who are they connected to?
      const { data: use } = await supabase
        .from('invite_uses')
        .select('invite_id')
        .eq('invitee_id', user.id)
        .maybeSingle();

      let inviterId: string | null = null;
      if (use) {
        const { data: invite } = await supabase
          .from('invites')
          .select('inviter_id')
          .eq('id', use.invite_id)
          .maybeSingle();
        inviterId = invite?.inviter_id ?? null;
      }

      if (!inviterId) { if (!cancelled) setLoading(false); return; }

      const { data: circles } = await supabase
        .from('circles')
        .select('requester_id, requestee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${inviterId},requestee_id.eq.${inviterId}`);

      const ids = (circles || [])
        .map(c => (c.requester_id === inviterId ? c.requestee_id : c.requester_id))
        .filter(id => id !== user.id);

      // The inviter themselves is already connected by accept_invite_create_circle.
      if (ids.length === 0) { if (!cancelled) setLoading(false); return; }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url, default_avatar_key')
        .in('id', ids)
        .limit(12);

      if (!cancelled) {
        setSuggestions(profiles || []);
        setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user]);

  const toggle = (id: string) => {
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const send = async () => {
    if (!user) return;
    if (picked.size === 0) { onNext(); return; }

    setSending(true);
    const ids = [...picked];
    // The trigger on circles notifies each requestee.
    await supabase.from('circles').insert(
      ids.map(id => ({ requester_id: user.id, requestee_id: id }))
    );
    setSending(false);
    onNext();
  };

  return (
    <WelcomeShell
      step={4}
      eyebrow="Find your people"
      title="Start with a few familiar faces."
      subtitle="No contact upload. Search for anyone else whenever you like."
    >
      {loading && <p className="font-body text-sm text-muted-foreground">Looking…</p>}

      {!loading && suggestions.length === 0 && (
        <p className="font-body text-sm text-muted-foreground">
          Nobody to suggest yet — you're early. You can find people from Search once you're in.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {suggestions.map(s => {
          const on = picked.has(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              aria-pressed={on}
              className={`flex items-center gap-3 rounded-[3px] border p-3 text-left transition-colors ${
                on ? 'border-primary bg-secondary' : 'border-border bg-card hover:bg-secondary'
              }`}
            >
              <UserAvatar
                avatarUrl={s.avatar_url}
                defaultAvatarKey={s.default_avatar_key}
                displayName={s.display_name}
                size={36}
              />
              <span className="min-w-0">
                <span className="block truncate font-body text-sm text-foreground">{s.display_name}</span>
                <span className="block truncate font-body text-xs text-muted-foreground">@{s.handle}</span>
              </span>
              <span className="ml-auto font-body text-xs text-muted-foreground">{on ? 'Added' : 'Add'}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="font-body text-sm text-muted-foreground hover:text-foreground"
        >
          Back
        </button>
        <Button onClick={send} disabled={sending} className="ml-auto rounded-[3px] h-11 px-8 font-body">
          {sending ? 'Sending…' : picked.size > 0 ? `Add ${picked.size} and continue` : 'Skip for now'}
        </Button>
      </div>
    </WelcomeShell>
  );
};

export default WelcomePeople;
