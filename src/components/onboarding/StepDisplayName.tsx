import { useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const StepDisplayName = () => {
  const { data, setData, setStep } = useOnboarding();
  const [name, setName] = useState(data.displayName);

  const handleContinue = () => {
    if (name.trim().length > 0) {
      setData({ displayName: name.trim() });
      setStep(3);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 max-w-md mx-auto text-center">
      <h2 className="text-2xl font-display text-foreground">
        First, what should we call you?
      </h2>

      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="your name or nickname"
        className="text-center text-lg h-14 rounded-xl border-border bg-card shadow-soft font-body"
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
      />

      <p className="text-sm text-muted-foreground font-body">
        This is just your display name.<br />
        You can change it anytime.
      </p>

      <Button
        onClick={handleContinue}
        disabled={name.trim().length === 0}
        className="rounded-pill px-8 h-12 text-base font-body bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
      >
        Continue →
      </Button>
    </div>
  );
};

export default StepDisplayName;
