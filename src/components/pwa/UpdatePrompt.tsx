import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UpdatePrompt = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const [dismissed, setDismissed] = useState(false);

  if (!needRefresh || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-auto z-50"
      >
        <div className="bg-card border border-border rounded-xl p-4 shadow-lg flex items-center gap-3">
          <span className="font-body text-sm text-foreground">
            🌲 A new version of Under Pines is ready.
          </span>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => updateServiceWorker(true)}
              className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground font-body text-xs hover:opacity-90 transition-opacity"
            >
              Update now
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="px-3 py-1.5 rounded-full border border-border font-body text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpdatePrompt;
