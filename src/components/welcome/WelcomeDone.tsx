import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import WelcomeShell from './WelcomeShell';

/**
 * Step 5 — the finish line. Stamping onboarding_completed_at is what releases
 * the route guard, so this is the only place it is written and the flow is not
 * considered done until it succeeds.
 */
export const WelcomeDone = ({ onFinish }: { onFinish: () => void }) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    // onboarding_completed_at arrives with the Phase 2 migration; the cast
    // goes away once types.ts is regenerated against it.
    const patch = { onboarding_completed_at: new Date().toISOString() };
    const { error } = await supabase
      .from('profiles')
      .update(patch as unknown as never)
      .eq('id', user.id);
    setSaving(false);

    if (error) {
      toast.error('Could not finish setting up. Try again.');
      return;
    }
    onFinish();
  };

  return (
    <WelcomeShell
      step={5}
      eyebrow="All set"
      title="Your page is ready."
      subtitle="It's quiet in here to start with. That's the idea."
    >
      <Button
        onClick={finish}
        disabled={saving}
        className="mt-2 w-full rounded-[3px] h-14 text-lg font-display"
      >
        {saving ? 'One moment…' : 'Go to my page'}
      </Button>
    </WelcomeShell>
  );
};

export default WelcomeDone;
