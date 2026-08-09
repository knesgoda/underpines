import { useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Email and password on one card, replacing the two separate steps they used
 * to occupy. Name and handle now come after verification, in the welcome
 * flow, so account creation is only age → credentials → verify.
 */
const StepCredentials = () => {
  const { data, setData, setStep } = useOnboarding();
  const [email, setEmail] = useState(data.email);
  const [password, setPassword] = useState(data.password);
  const [showPassword, setShowPassword] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;
  const ready = emailValid && passwordValid;

  const handleContinue = () => {
    if (!ready) return;
    setData({ email, password });
    setStep(3);
  };

  return (
    <div className="onboarding-step">
      <span className="eyebrow">Create your account</span>
      <h2>Where should we reach you?</h2>
      <p>Your address is only used to sign in and send your digest.</p>

      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
          onKeyDown={e => e.key === 'Enter' && handleContinue()}
        />
      </label>

      <label>
        Password
        <span className="relative block">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
            className="pr-11"
            onKeyDown={e => e.key === 'Enter' && handleContinue()}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </span>
      </label>

      <p className="min-h-5 font-body text-xs text-muted-foreground" role="status">
        {password.length > 0 && !passwordValid && 'A little longer — eight characters or more.'}
      </p>

      <Button
        onClick={handleContinue}
        disabled={!ready}
        className="mt-4 w-full rounded-pill h-12 font-body"
      >
        Continue
      </Button>
    </div>
  );
};

export default StepCredentials;
