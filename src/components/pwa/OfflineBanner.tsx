import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useNetworkStatus from '@/hooks/useNetworkStatus';

const OfflineBanner = () => {
  const { isOnline, lastOnlineAt } = useNetworkStatus();
  const [dismissed, setDismissed] = useState(false);

  if (isOnline || dismissed) return null;

  const minutesAgo = Math.floor((Date.now() - lastOnlineAt.getTime()) / 60000);
  const timeLabel = minutesAgo < 1 ? 'just now' : `${minutesAgo} min ago`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        onClick={() => setDismissed(true)}
        className="fixed top-0 left-0 right-0 z-50 bg-amber-light text-foreground px-4 py-2 text-center cursor-pointer"
      >
        <span className="font-body text-xs">
          🌲 You're offline · Last updated {timeLabel}
        </span>
      </motion.div>
    </AnimatePresence>
  );
};

export default OfflineBanner;
