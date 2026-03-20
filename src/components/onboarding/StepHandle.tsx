import { useState, useEffect, useCallback } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const StepHandle = () => {
  const { data, setData, setStep } = useOnboarding();
  const [handle, setHandle] = useState(data.handle);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const checkAvailability = useCallback(async (value: string) => {
    if (value.length < 3) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    const { data: existing } = await supabase
      .from('profiles')
      .select('handle')
      .eq('handle', value.toLowerCase())
      .maybeSingle();
    setAvailable(!existing);
    setChecking(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (handle.length >= 3) {
        checkAvailability(handle);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [handle, checkAvailability]);

  const sanitized = handle.toLowerCase().replace(/[^a-z0-9_-]/g, '');

  const handleChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setHandle(clean);
    setAvailable(null);
  };

  const handleContinue = () => {
    if (available) {
      setData({ handle: sanitized });
      setStep(4);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 max-w-md mx-auto text-center">
      <div>
        <h2 className="text-2xl font-display text-foreground">
          Now, your handle.
        </h2>
        <p className="text-muted-foreground mt-2 font-body">
          This is how people find you.
        </p>
      </div>

      <div className="flex items-center gap-0 w-full max-w-xs">
        <span className="text-sm text-muted-foreground font-body shrink-0 pr-1">
          underpines.com/
        </span>
        <Input
          value={handle}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="kevsquatch"
          className="text-base h-14 rounded-xl border-border bg-card shadow-soft font-body"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
        />
      </div>

      <div className="h-6 flex items-center justify-center">
        {checking && (
          <span className="text-sm text-muted-foreground font-body">checking...</span>
        )}
        {!checking && available === true && handle.length >= 3 && (
          <span className="text-sm font-body" style={{ color: 'hsl(var(--pine-mid))' }}>
            ✓ That handle's available
          </span>
        )}
        {!checking && available === false && (
          <span className="text-sm text-muted-foreground font-body">
            ✗ That handle's taken
          </span>
        )}
      </div>

      <Button
        onClick={handleContinue}
        disabled={!available}
        className="rounded-pill px-8 h-12 text-base font-body bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
      >
        Continue →
      </Button>
    </div>
  );
};

export default StepHandle;
