import { useCallback, useEffect, useRef, useState } from 'react';
import { currentBuildId, fetchLatestBuildId, isNewBuild } from '@/lib/buildVersion';

/** Quiet enough not to matter, often enough that nobody sits on a stale build. */
const POLL_MS = 5 * 60 * 1000;

/**
 * Watches for a newer deployed build.
 *
 * Checks on mount, every few minutes, and whenever the tab comes back to the
 * foreground (the usual case: a phone left open overnight). Production only —
 * the dev server has no hashed entry to compare.
 */
const useBuildUpdate = () => {
  const [updateReady, setUpdateReady] = useState(false);
  const current = useRef<string | null>(null);

  if (current.current === null) current.current = currentBuildId();

  const check = useCallback(async () => {
    if (!current.current) return;
    const latest = await fetchLatestBuildId();
    if (isNewBuild(current.current, latest)) setUpdateReady(true);
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD || !current.current) return;

    let stopped = false;
    const run = () => {
      if (!stopped && !document.hidden) void check();
    };

    run();
    const timer = window.setInterval(run, POLL_MS);
    const onVisible = () => { if (!document.hidden) run(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [check]);

  /** Reload onto the new build. */
  const applyUpdate = useCallback(() => {
    window.location.reload();
  }, []);

  return { updateReady, applyUpdate };
};

export default useBuildUpdate;
