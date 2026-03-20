import { format } from 'date-fns';

interface SuspendedPageProps {
  reason: string;
  suspendedUntil: string | null;
  isPermanent: boolean;
}

const SuspendedPage = ({ reason, suspendedUntil, isPermanent }: SuspendedPageProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-6">
        <span className="text-4xl">🌲</span>
        <h1 className="font-display text-2xl font-bold text-foreground">Under Pines</h1>

        <p className="font-body text-lg text-foreground/80">
          Your account has been suspended.
        </p>

        {reason && (
          <p className="font-body text-sm text-muted-foreground italic">
            "{reason}"
          </p>
        )}

        {isPermanent ? (
          <p className="font-body text-sm text-muted-foreground leading-relaxed">
            This decision is final.
            <br /><br />
            Under Pines is built on trust and accountability.
            We wish you well elsewhere.
          </p>
        ) : suspendedUntil ? (
          <p className="font-body text-sm text-muted-foreground">
            Your access returns on{' '}
            <span className="font-medium text-foreground">
              {format(new Date(suspendedUntil), 'MMMM d, yyyy')}
            </span>.
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default SuspendedPage;
