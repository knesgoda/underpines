import { useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

const StepPassword = () => {
  const { data, setData, setStep } = useOnboarding();
  const [password, setPassword] = useState(data.password);
  const [showPassword, setShowPassword] = useState(false);

  const isValid = password.length >= 8;

  const handleContinue = () => {
    if (isValid) {
      setData({ password });
      setStep(6);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 max-w-md mx-auto text-center">
      <div>
        <h2 className="text-2xl font-display text-foreground">
          Choose something you'll remember.
        </h2>
        <p className="text-muted-foreground mt-2 font-body">
          This is your key to the Cabin.
        </p>
      </div>

      <div className="relative w-full max-w-xs">
        <Input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="your password"
          className="text-center text-lg h-14 rounded-xl border-border bg-card shadow-soft font-body pr-12"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {password.length > 0 && password.length < 8 && (
        <p className="text-sm text-muted-foreground font-body">
          A little longer, just to be safe.
        </p>
      )}

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

export default StepPassword;
