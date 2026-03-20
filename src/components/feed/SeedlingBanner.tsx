import { useSeedlingStatus } from '@/hooks/useSeedlingStatus';

// Re-export for backward compatibility
export { useSeedlingStatus };

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
