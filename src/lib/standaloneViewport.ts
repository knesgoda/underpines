/**
 * iOS standalone PWAs sometimes come to the foreground with the visual
 * viewport parked below the layout viewport — the whole page sits a few dozen
 * pixels low (a blank band above the topbar) and only snaps into place after
 * the user scrolls. A zero-distance scroll nudge makes WebKit reconcile the
 * two viewports immediately.
 *
 * Guarded three ways: only in installed (standalone) mode, only when the page
 * is resting at the very top, and only on launch/foreground transitions — so
 * it can never fight a real scroll position or run in ordinary browser tabs.
 */
export function installStandaloneViewportFix() {
  const nav = navigator as Navigator & { standalone?: boolean };
  const standalone =
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches) ||
    nav.standalone === true;
  if (!standalone) return;

  const settle = () => {
    if (window.scrollY <= 0) {
      window.scrollTo(0, 1);
      window.scrollTo(0, 0);
    }
  };

  window.addEventListener('pageshow', settle);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') settle();
  });
  // First launch: wait for the first real frame so there is a laid-out page
  // to nudge.
  requestAnimationFrame(() => requestAnimationFrame(settle));
}
