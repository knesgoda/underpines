import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * True when the signed-in account still has to finish the welcome flow.
 *
 * Account creation deliberately stops at verification, so between then and
 * welcome step 1 a profile carries the placeholders handle_new_user() wrote —
 * 'New Arrival' and 'user_<id prefix>'. Nobody should reach the app in that
 * state, so this is what AppLayout redirects on.
 *
 * If the column is missing (the Phase 2 migration is applied through Lovable,
 * not on deploy) or the query fails, this reports "no redirect needed" — a
 * failed check should never lock people out of the app they already have an
 * account for.
 */
export const useOnboardingGuard = (userId: string | undefined) => {
  const [needsWelcome, setNeedsWelcome] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!userId) {
      setNeedsWelcome(false);
      setChecking(false);
      return;
    }
    let cancelled = false;

    const check = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed_at')
        .eq('id', userId)
        .maybeSingle();

      if (cancelled) return;
      const row = data as { onboarding_completed_at?: string | null } | null;
      setNeedsWelcome(!error && !!row && (row.onboarding_completed_at ?? null) === null);
      setChecking(false);
    };

    check();
    return () => { cancelled = true; };
  }, [userId]);

  return { needsWelcome, checking };
};
