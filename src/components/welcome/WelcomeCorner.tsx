import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { atmospheres } from '@/lib/cabin-config';
import { toast } from 'sonner';
import WelcomeShell from './WelcomeShell';

/**
 * Step 3 — a starting look for your page. Only the free atmospheres appear
 * here; the paid ones belong behind the profile editor's upsell, not in a
 * flow someone is trying to finish.
 */
export const WelcomeCorner = ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => {
  const { user } = useAuth();
  const free = atmospheres.filter(a => a.free && a.key !== 'theme-sync');
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = selected
      ? await supabase.from('profiles').update({ cabin_mood: selected }).eq('id', user.id)
      : { error: null };
    setSaving(false);

    if (error) {
      toast.error('Could not save that. Try again.');
      return;
    }
    onNext();
  };

  return (
    <WelcomeShell
      step={3}
      eyebrow="Your corner"
      title="Choose a starting look."
      subtitle="You can make your page much weirder later."
    >
      <div className="onboard-themes">
        {free.map(a => (
          <button
            key={a.key}
            type="button"
            onClick={() => setSelected(a.key)}
            className={selected === a.key ? 'selected' : undefined}
            aria-pressed={selected === a.key}
          >
            <span
              aria-hidden="true"
              className="h-[58px] w-[58px] rounded-full border"
              style={{ background: a.cardBg, borderColor: a.border }}
            />
            <span>{a.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="font-body text-sm text-muted-foreground hover:text-foreground"
        >
          Back
        </button>
        <Button onClick={save} disabled={saving} className="ml-auto rounded-[3px] h-11 px-8 font-body">
          {saving ? 'Saving…' : selected ? 'Continue' : 'Skip for now'}
        </Button>
      </div>
    </WelcomeShell>
  );
};

export default WelcomeCorner;
