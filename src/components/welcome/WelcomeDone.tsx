import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
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

    if (error) {
      setSaving(false);
      toast.error('Could not finish setting up. Try again.');
      return;
    }

    // The shell's guard reads onboarding_completed_at from the cached boot
    // state (60s staleTime). Without refetching first, landing on "/" bounces
    // straight back into this flow from step one.
    await queryClient.refetchQueries({ queryKey: ['boot-state', user.id] });
    setSaving(false);
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
