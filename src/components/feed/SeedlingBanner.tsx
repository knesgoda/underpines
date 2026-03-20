import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface SeedlingState {
  isSeedling: boolean;
  dayNumber: number;
  totalDays: number;
  daysLeft: number;
}

export const useSeedlingStatus = (): SeedlingState & { loading: boolean } => {
  const { user } = useAuth();
  const [state, setState] = useState<SeedlingState>({
    isSeedling: false,
    dayNumber: 0,
    totalDays: 0,
    daysLeft: 0,
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

            setState({ isSeedling: true, dayNumber, totalDays, daysLeft });
          }
        }
        setLoading(false);
      });
  }, [user]);

  return { ...state, loading };
};

const SeedlingBanner = () => {
  const { isSeedling, dayNumber, totalDays, daysLeft, loading } = useSeedlingStatus();

  if (loading || !isSeedling) return null;

  return (
    <div className="rounded-xl bg-muted/50 border border-border px-4 py-3 mb-4">
      <p className="font-body text-sm text-muted-foreground">
        🌱 Getting your Cabin ready · Day {dayNumber} of {totalDays}.{' '}
        Public posting unlocks in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}.
      </p>
    </div>
  );
};

export default SeedlingBanner;
