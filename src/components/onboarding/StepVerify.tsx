import { useState, useRef, useEffect } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const StepVerify = () => {
  const { data, setStep } = useOnboarding();
  const navigate = useNavigate();
  const [phone, setPhone] = useState(data.phone);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendVisible, setResendVisible] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (codeSent) {
      const timer = setTimeout(() => setResendVisible(true), 30000);
      return () => clearTimeout(timer);
    }
  }, [codeSent]);

  const handleSendCode = async () => {
    setSending(true);
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            display_name: data.displayName,
            handle: data.handle,
          },
        },
      });

      if (error) {
        toast.error(error.message);
        setSending(false);
        return;
      }

      // Record invite use and decrement if not infinite
      if (data.inviteId && authData.user) {
        // Insert invite_uses row
        await supabase.from('invite_uses').insert({
          invite_id: data.inviteId,
          invitee_id: authData.user.id,
        });

        // Fetch the invite to check if infinite
        const { data: inv } = await supabase
          .from('invites')
          .select('is_infinite, uses_remaining')
          .eq('id', data.inviteId)
          .maybeSingle();

        if (inv && !inv.is_infinite) {
          const newRemaining = Math.max(0, inv.uses_remaining - 1);
          await supabase
            .from('invites')
            .update({
              uses_remaining: newRemaining,
              is_active: newRemaining > 0,
            })
            .eq('id', data.inviteId);
        }
      }

      // The new user's invite is auto-created by the DB trigger on profiles insert

      setSending(false);
      setStep(6);
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
      setSending(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  if (!codeSent) {
    return (
      <div className="flex flex-col items-center gap-8 max-w-md mx-auto text-center">
        <div>
          <h2 className="text-2xl font-display text-foreground">
            One last thing — let's get you settled.
          </h2>
          <p className="text-muted-foreground mt-3 font-body text-sm">
            We'll create your account and get your Cabin ready.
          </p>
        </div>

        <Button
          onClick={handleSendCode}
          disabled={sending}
          className="rounded-pill px-8 h-12 text-base font-body bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
        >
          {sending ? 'Preparing your arrival...' : 'Create my Cabin'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 max-w-md mx-auto text-center">
      <h2 className="text-2xl font-display text-foreground">
        Check your messages.
      </h2>

      <div className="flex gap-2">
        {code.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleCodeChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-12 h-14 text-center text-xl font-body rounded-xl border border-border bg-card shadow-soft focus:outline-none focus:ring-2 focus:ring-ring"
          />
        ))}
      </div>

      <Button
        onClick={() => {}}
        disabled={verifying || code.some(d => !d)}
        className="rounded-pill px-8 h-12 text-base font-body bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
      >
        {verifying ? 'Confirming...' : 'Confirm →'}
      </Button>

      {resendVisible && (
        <button className="text-sm text-muted-foreground hover:text-foreground font-body transition-colors">
          Resend code
        </button>
      )}
    </div>
  );
};

export default StepVerify;
