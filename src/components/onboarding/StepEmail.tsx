import { useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const StepEmail = () => {
  const { data, setData, setStep } = useOnboarding();
  const [email, setEmail] = useState(data.email);

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleContinue = () => {
    if (isValid) {
      setData({ email });
      setStep(5);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 max-w-md mx-auto text-center">
      <h2 className="text-2xl font-display text-foreground">
        Where should we send your Daily Ember?
      </h2>

      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your email"
        className="text-center text-lg h-14 rounded-xl border-border bg-card shadow-soft font-body"
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
      />

      <p className="text-sm text-muted-foreground font-body">
        Your morning digest of everything that<br />
        happened while you were away.
      </p>

      <Button
        onClick={handleContinue}
        disabled={!isValid}
        className="rounded-pill px-8 h-12 text-base font-body bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
      >
        Continue →
      </Button>
    </div>
  );
};

export default StepEmail;
