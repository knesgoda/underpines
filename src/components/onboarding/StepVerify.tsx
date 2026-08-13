import { useState, useRef, useEffect } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { evaluateSignupRisk } from '@/lib/trailApi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const StepVerify = () => {
  const { data, setData } = useOnboarding();
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
      // No display_name or handle here — handle_new_user() COALESCEs both to
      // placeholders, and the welcome flow writes the real values once the
      // account exists.
      //
      // Invite redemption happens SERVER-SIDE inside handle_new_user(): the
      // trigger validates the Trail Pass token / legacy invite id from this
      // metadata, enforces single-use + email binding, records lineage, and
      // creates the inviter Circle — all in the signup transaction. An
      // invalid or missing invitation aborts account creation entirely.
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            age_bracket: data.ageBracket,
            birth_year: data.birthYear,
            trail_pass_token: data.trailPassToken || undefined,
            invite_id: data.inviteId || undefined,
            invite_ip_hash: data.ipHash || undefined,
          },
        },
      });

      if (error) {
        const message = error.message || '';
        if (message.includes('signup_requires_invitation') || message.includes('signup_invalid_invitation')) {
          toast.error('Under Pines is invite-only. You need a valid invitation to join.');
        } else if (message.includes('signup_invitation_email_mismatch')) {
          toast.error('This Trail Pass was sent to a different email address.');
        } else if (message.toLowerCase().includes('database error')) {
          // The auth API wraps trigger exceptions in a generic message.
          toast.error("We couldn't complete signup with this invitation. It may have expired — ask your inviter for a fresh one.");
        } else {
          toast.error(message);
        }
        setSending(false);
        return;
      }

      // Update profile with age data
      if (authData.user) {
        await supabase.from('profiles').update({
          age_bracket: data.ageBracket,
          birth_year: data.birthYear,
          is_age_verified: true,
          account_status: data.ageBracket === '13_to_17' ? 'pending_parental_consent' : 'active',
        } as any).eq('id', authData.user.id);

        // Server-side signup risk evaluation — fire and forget; the user is
        // never blocked on it and never sees scores (spec §33-§34).
        evaluateSignupRisk();
      }

      setSending(false);

      // Password is no longer needed once the account exists; don't leave it
      // sitting in context for the rest of the session.
      setData({ password: '' });

      // LEGAL-REVIEW-NEEDED: 13-17 accounts need parental consent before
      // proceeding. StepVerify has already set account_status to
      // 'pending_parental_consent'; the welcome flow reads that and holds them
      // after the name step rather than letting them continue.
      navigate('/welcome', { replace: true });
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
            We'll create your account and get your page ready.
          </p>
        </div>

        <Button
          onClick={handleSendCode}
          disabled={sending}
          className="rounded-pill px-8 h-12 text-base font-body bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
        >
          {sending ? 'Creating your account…' : 'Create my account'}
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
            className="w-12 h-14 text-center text-xl font-body rounded-[5px] border border-border bg-card shadow-soft focus:outline-none focus:ring-2 focus:ring-ring"
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
