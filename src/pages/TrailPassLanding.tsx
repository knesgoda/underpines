import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { getTrailPassStatus, type TrailPassStatus } from '@/lib/trailApi';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import PineTreeLoading from '@/components/PineTreeLoading';
import WarmGround from '@/components/layout/WarmGround';

/**
 * Landing page for email-bound Trail Passes (/join/:token).
 *
 * Validation is a server-side RPC — the token is hashed and checked in the
 * database; the page learns only what the recipient already knows (who
 * invited them, which email the pass is bound to).
 */
const TrailPassLanding = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setData } = useOnboarding();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<TrailPassStatus | null>(null);

  useEffect(() => {
    const check = async () => {
      if (!token) {
        setStatus({ valid: false, reason: 'not_found' });
        setLoading(false);
        return;
      }
      const result = await getTrailPassStatus(token);
      setStatus(result);
      if (result.valid) {
        setData({
          trailPassToken: token,
          lockedEmail: result.invitee_email ?? null,
          inviteId: null,
          inviteSlug: null,
          inviterName: result.inviter_name ?? null,
          email: result.invitee_email ?? '',
        });
      }
      setLoading(false);
    };
    check();
    // setData is stable enough for this one-shot load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading) return <PineTreeLoading />;

  if (!status?.valid) {
    const isExpired = status?.reason === 'expired';
    return (
      <WarmGround>
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-sm px-6"
          >
            <svg width="40" height="56" viewBox="0 0 48 72" className="mx-auto mb-8 opacity-40">
              <path d="M24 4 L14 24 L34 24 Z" fill="hsl(var(--pine-mid))" />
              <path d="M24 14 L10 38 L38 38 Z" fill="hsl(var(--pine-mid))" opacity="0.7" />
              <path d="M24 26 L6 52 L42 52 Z" fill="hsl(var(--pine-mid))" opacity="0.5" />
              <rect x="20" y="52" width="8" height="16" rx="2" fill="hsl(var(--primary))" opacity="0.6" />
            </svg>
            <h2 className="text-2xl font-display text-foreground mb-4">
              {isExpired ? 'This Trail Pass has expired.' : 'This Trail Pass is no longer valid.'}
            </h2>
            <p className="text-muted-foreground font-body text-sm">
              Ask the person who invited you to send another.
            </p>
          </motion.div>
        </div>
      </WarmGround>
    );
  }

  return (
    <WarmGround>
      <div className="relative z-10 flex items-center justify-center min-h-screen px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-md"
        >
          <svg width="32" height="48" viewBox="0 0 48 72" className="mx-auto mb-8 animate-tree-sway">
            <path d="M24 4 L14 24 L34 24 Z" fill="hsl(var(--pine-mid))" opacity="0.95" />
            <path d="M24 14 L10 38 L38 38 Z" fill="hsl(var(--pine-mid))" opacity="0.8" />
            <path d="M24 26 L6 52 L42 52 Z" fill="hsl(var(--pine-mid))" opacity="0.65" />
            <rect x="20" y="52" width="8" height="16" rx="2" fill="hsl(var(--primary))" opacity="0.8" />
          </svg>

          <div className="rounded-[5px] border border-border bg-card p-8 mb-8 shadow-panel">
            <p className="text-xl font-display text-foreground leading-relaxed">
              {status.inviter_name
                ? `${status.inviter_name} saved you a place Under Pines.`
                : 'Someone saved you a place Under Pines.'}
            </p>
            <p className="mt-3 text-sm font-body text-muted-foreground">
              Create your account to join them.
            </p>
            {status.personal_message && (
              <blockquote className="mt-4 rounded-xl bg-muted/50 px-4 py-3 text-sm font-body text-muted-foreground italic">
                “{status.personal_message}”
              </blockquote>
            )}

            <Button
              onClick={() => navigate('/onboarding')}
              className="mt-8 rounded-pill px-10 h-14 text-base font-display bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
            >
              Come in
            </Button>
          </div>

          <div className="flex items-center gap-4 justify-center text-muted-foreground">
            <div className="h-px w-12 bg-border" />
            <span className="text-xs font-body">
              This pass is for {status.invitee_email}
            </span>
            <div className="h-px w-12 bg-border" />
          </div>
        </motion.div>
      </div>
    </WarmGround>
  );
};

export default TrailPassLanding;
