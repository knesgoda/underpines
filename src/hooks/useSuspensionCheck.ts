import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SuspensionData {
  reason: string;
  suspended_until: string | null;
  is_permanent: boolean;
}

export const useSuspensionCheck = (userId: string | undefined) => {
  const [suspension, setSuspension] = useState<SuspensionData | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!userId) {
      setChecking(false);
      return;
    }

    const check = async () => {
      const { data } = await supabase
        .from('suspensions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!data) {
        setSuspension(null);
        setChecking(false);
        return;
      }

      if (data.is_permanent) {
        setSuspension(data as SuspensionData);
        setChecking(false);
        return;
      }

      if (data.suspended_until && new Date(data.suspended_until) > new Date()) {
        setSuspension(data as SuspensionData);
        setChecking(false);
        return;
      }

      // Suspension expired — clean up
      await supabase.from('suspensions').delete().eq('user_id', userId);
      setSuspension(null);
      setChecking(false);
    };

    check();
  }, [userId]);

  return { suspension, checking };
};
