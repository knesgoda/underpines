import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface SeedlingState {
  isSeedling: boolean;
  dayNumber: number;
  totalDays: number;
  daysLeft: number;
  currentDay: number;
}

export const useSeedlingStatus = (): SeedlingState & { loading: boolean } => {
  const { user } = useAuth();
  const [state, setState] = useState<SeedlingState>({
    isSeedling: false,
    dayNumber: 0,
    totalDays: 0,
    daysLeft: 0,
    currentDay: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    supabase
      .from('profiles')
      .select('seedling_ends_at, created_at')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.seedling_ends_at) {
          const endsAt = new Date(data.seedling_ends_at);
          const createdAt = new Date(data.created_at);
          const now = new Date();

          if (now < endsAt) {
            const totalMs = endsAt.getTime() - createdAt.getTime();
            const elapsedMs = now.getTime() - createdAt.getTime();
            const totalDays = Math.max(1, Math.round(totalMs / 86400000));
            const dayNumber = Math.max(1, Math.ceil(elapsedMs / 86400000));
            const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / 86400000));

            setState({ isSeedling: true, dayNumber, totalDays, daysLeft, currentDay: dayNumber });
          }
        }
        setLoading(false);
      });
  }, [user]);

  return { ...state, loading };
};
