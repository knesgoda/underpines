import { motion, AnimatePresence } from 'framer-motion';
import useInstallPrompt from '@/hooks/useInstallPrompt';

const InstallPrompt = () => {
  const { showPrompt, isIOS, install, dismiss } = useInstallPrompt();

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-6"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card rounded-2xl border border-border p-8 max-w-sm w-full text-center shadow-lg"
        >
          <p className="text-3xl mb-4">🌲</p>

          {isIOS ? (
            <>
              <h2 className="font-display text-lg text-foreground mb-2">
                Add Under Pines to your home screen
              </h2>
              <div className="space-y-3 text-left mb-6">
                <p className="font-body text-sm text-muted-foreground">
                  1. Tap the <strong>share button</strong> ⬆️ at the bottom of Safari
                </p>
                <p className="font-body text-sm text-muted-foreground">
                  2. Tap <strong>"Add to Home Screen"</strong> ➕
                </p>
              </div>
              <button
                onClick={dismiss}
                className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-body text-sm hover:opacity-90 transition-opacity"
              >
                Got it
              </button>
            </>
          ) : (
            <>
              <h2 className="font-display text-lg text-foreground mb-2">
                Add Under Pines to your home screen.
              </h2>
              <p className="font-body text-sm text-muted-foreground mb-6">
                Works offline. Opens like an app. No App Store needed.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={dismiss}
                  className="px-5 py-2 rounded-full border border-border font-body text-sm text-foreground hover:bg-muted transition-colors"
                >
                  Not now
                </button>
                <button
                  onClick={install}
                  className="px-5 py-2 rounded-full bg-primary text-primary-foreground font-body text-sm hover:opacity-90 transition-opacity"
                >
                  Add to home screen
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InstallPrompt;
