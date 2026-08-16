import { useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import useBuildUpdate from '@/hooks/useBuildUpdate';

/**
 * "There is a newer version" — the missing half of retiring the service worker.
 *
 * Publishes reach a browser on its next load; a tab that stays open (or an
 * installed home-screen app) can otherwise sit on an old build for days. This
 * says so plainly and offers the one action that fixes it. Dismissing hides it
 * for this tab only; the next check or launch will offer again.
 */
const UpdateBanner = () => {
  const { updateReady, applyUpdate } = useBuildUpdate();
  const [dismissed, setDismissed] = useState(false);

  if (!updateReady || dismissed) return null;

  return (
    <div className="update-banner" role="status" aria-live="polite">
      <span className="update-banner-text">A newer version of Under Pines is ready.</span>
      <button type="button" className="update-banner-apply" onClick={applyUpdate}>
        <RefreshCw size={13} aria-hidden="true" />
        Reload to update
      </button>
      <button
        type="button"
        className="update-banner-dismiss"
        onClick={() => setDismissed(true)}
        aria-label="Not now"
      >
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
};

export default UpdateBanner;
