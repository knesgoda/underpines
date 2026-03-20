// LEGAL-REVIEW-NEEDED: Parental consent flow for COPPA compliance (ages 13-17)

import { useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const StepParentalConsent = () => {
  const { data } = useOnboarding();
  const [parentEmail, setParentEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSendConsent = async () => {
    if (!parentEmail.trim() || !parentEmail.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-parental-consent', {
        body: {
          parentEmail: parentEmail.trim(),
          childDisplayName: data.displayName,
          childEmail: data.email,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-8 max-w-md mx-auto text-center">
        <div className="text-5xl">📬</div>
        <h2 className="text-2xl font-display text-foreground">
          We've sent a note to {parentEmail}.
        </h2>
        <p className="text-muted-foreground font-body text-sm leading-relaxed">
          Once they give the nod, your Cabin will be ready.
          <br /><br />
          This usually takes just a moment. If they don't respond
          within 72 hours, we'll need to pause your signup.
        </p>
        <p className="text-xs text-muted-foreground font-body">
          Check your parent's inbox (and spam folder).
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 max-w-md mx-auto text-center">
      <h2 className="text-2xl font-display text-foreground">
        We need a quick nod from a parent or guardian.
      </h2>
      <p className="text-muted-foreground font-body text-sm">
        What's their email?
      </p>

      <Input
        type="email"
        value={parentEmail}
        onChange={(e) => setParentEmail(e.target.value)}
        placeholder="parent@example.com"
        className="text-center text-lg h-14 rounded-xl border-border bg-card shadow-soft font-body max-w-sm"
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && handleSendConsent()}
      />

      <Button
        onClick={handleSendConsent}
        disabled={!parentEmail.trim() || sending}
        className="rounded-pill px-8 h-12 text-base font-body bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
      >
        {sending ? 'Sending…' : 'Send consent request'}
      </Button>
    </div>
  );
};

export default StepParentalConsent;
