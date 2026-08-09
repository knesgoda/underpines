import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { submitAppeal, getMyOpenAppeal } from '@/lib/trailApi';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SuspendedPageProps {
  reason: string;
  suspendedUntil: string | null;
  isPermanent: boolean;
}

const SuspendedPage = ({ reason, suspendedUntil, isPermanent }: SuspendedPageProps) => {
  const { user, signOut } = useAuth();
  const [showAppeal, setShowAppeal] = useState(false);
  const [appealText, setAppealText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [openAppeal, setOpenAppeal] = useState<{ status: string } | null>(null);
  const [checkedAppeal, setCheckedAppeal] = useState(false);

  useEffect(() => {
    if (!user) return;
    getMyOpenAppeal(user.id)
      .then(setOpenAppeal)
      .finally(() => setCheckedAppeal(true));
  }, [user]);

  const handleSubmitAppeal = async () => {
    if (!user || appealText.trim().length === 0) return;
    setSubmitting(true);
    const result = await submitAppeal(user.id, appealText.trim());
    setSubmitting(false);
    if (result.success) {
      setOpenAppeal({ status: 'OPEN' });
      setShowAppeal(false);
      toast.success('Your appeal is on its way to the Ranger Station.');
    } else {
      toast.error('Something went wrong sending your appeal. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <span className="text-4xl">🌲</span>
        <h1 className="font-display text-2xl font-bold text-foreground">Under Pines</h1>

        <p className="font-body text-lg text-foreground/80">
          {suspendedUntil || isPermanent
            ? 'Your account has been suspended.'
            : 'Your account is on hold while the Ranger Station takes a look.'}
        </p>

        {reason && (
          <p className="font-body text-sm text-muted-foreground italic">
            "{reason}"
          </p>
        )}

        {isPermanent ? (
          <p className="font-body text-sm text-muted-foreground leading-relaxed">
            This decision is final unless a review finds otherwise.
            <br /><br />
            Under Pines is built on trust and accountability.
          </p>
        ) : suspendedUntil ? (
          <p className="font-body text-sm text-muted-foreground">
            Your access returns on{' '}
            <span className="font-medium text-foreground">
              {format(new Date(suspendedUntil), 'MMMM d, yyyy')}
            </span>.
          </p>
        ) : null}

        {checkedAppeal && (
          openAppeal ? (
            <p className="font-body text-sm text-muted-foreground rounded-xl border border-border bg-card px-4 py-3">
              The Ranger Station has your appeal and will take a careful look.
            </p>
          ) : showAppeal ? (
            <div className="space-y-3 text-left">
              <Textarea
                value={appealText}
                onChange={(e) => setAppealText(e.target.value)}
                placeholder="Tell us what you think we got wrong. Anything that helps us understand is welcome."
                rows={5}
                maxLength={5000}
                className="font-body text-sm"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setShowAppeal(false)} className="font-body">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitAppeal}
                  disabled={submitting || appealText.trim().length === 0}
                  className="font-body"
                >
                  {submitting ? 'Sending…' : 'Send appeal'}
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAppeal(true)}
              className="font-body text-sm text-primary underline underline-offset-4 hover:opacity-80"
            >
              Think we got this wrong? Ask the Ranger Station to review your account.
            </button>
          )
        )}

        <button
          onClick={() => signOut()}
          className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
};

export default SuspendedPage;
