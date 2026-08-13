import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { defaultAvatars, defaultAvatarKeys } from '@/lib/default-avatars';
import { toast } from 'sonner';
import WelcomeShell from './WelcomeShell';

/**
 * Step 2 — pick a face. handle_new_user() already assigned a random creature,
 * so there is always something selected; this step just lets people choose.
 * Photo upload is deliberately left to the profile editor, where the crop tool
 * already lives.
 */
export const WelcomeAvatar = ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    // No selection means keep the creature they were assigned.
    const { error } = selected
      ? await supabase.from('profiles').update({ default_avatar_key: selected }).eq('id', user.id)
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
      step={2}
      eyebrow="Your face"
      title="Pick a way to show up."
      subtitle="You can change this later, and add a photo whenever you like."
    >
      <div className="avatar-choices">
        {defaultAvatarKeys.map(key => (
          <button
            key={key}
            type="button"
            onClick={() => setSelected(key)}
            className={selected === key ? 'selected' : undefined}
            aria-pressed={selected === key}
          >
            <img
              src={defaultAvatars[key].src}
              alt=""
              width={58}
              height={58}
              loading="lazy"
              className="h-[58px] w-[58px] rounded-full object-cover"
            />
            <span>{defaultAvatars[key].label}</span>
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
          {saving ? 'Saving…' : selected ? 'Continue' : 'Keep this one'}
        </Button>
      </div>
    </WelcomeShell>
  );
};

export default WelcomeAvatar;
