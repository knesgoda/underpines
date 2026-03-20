import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInviteData } from '@/hooks/useInviteData';

const DISMISS_KEY = 'invite_banner_dismissed_until';

const InviteBanner = () => {
  const { invite, usesRemaining, isInfinite, loading } = useInviteData();
  const [dismissed, setDismissed] = useState(() => {
    const until = localStorage.getItem(DISMISS_KEY);
    return until ? Date.now() < parseInt(until, 10) : false;
  });

  if (loading || dismissed || !invite) return null;
  // Don't show if 0 invites remaining (non-infinite)
  if (!isInfinite && (usesRemaining === null || usesRemaining <= 0)) return null;

  const handleDismiss = () => {
    const sevenDays = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, sevenDays.toString());
    setDismissed(true);
  };

  const countText = isInfinite
    ? 'invites waiting'
    : `${usesRemaining} invite${usesRemaining !== 1 ? 's' : ''} waiting`;

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl bg-card border border-border p-4 mb-4 shadow-soft"
        >
          <div className="flex items-start gap-3">
            <Flame size={18} className="text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-body text-foreground">
                Know someone who'd love it here? You have {countText}.
              </p>
              <Link
                to="/invites"
                className="inline-block mt-2 text-sm font-body text-primary hover:text-primary/80 transition-colors"
              >
                Share your link →
              </Link>
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InviteBanner;
