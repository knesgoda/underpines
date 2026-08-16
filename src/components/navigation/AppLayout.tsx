import { Suspense, lazy, useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useQueryClient } from '@tanstack/react-query';
import { useBootState } from '@/hooks/useBootState';
import TopBar from './TopBar';
import TabBar from './TabBar';
import ErrorBoundary from '@/components/ErrorBoundary';
import PineTreeLoading from '@/components/PineTreeLoading';
import StatePanel from '@/components/StatePanel';
import '@/styles/handoff-shell.css';

// Chrome that is rarely rendered on first paint. Keeping these out of the
// entry chunk matters most for MobileComposerSheet, which pulls in both post
// composers, and SceneDebugPanel, which only founders ever see.
const MobileComposerSheet = lazy(() => import('@/components/feed/MobileComposerSheet'));
const OfflineBanner = lazy(() => import('@/components/pwa/OfflineBanner'));
const InstallPrompt = lazy(() => import('@/components/pwa/InstallPrompt'));
const UpdatePrompt = lazy(() => import('@/components/pwa/UpdatePrompt'));
const SuspendedPage = lazy(() => import('@/pages/Suspended'));
const AgeGateInterstitial = lazy(() => import('@/components/onboarding/AgeGateInterstitial'));
const Gate = lazy(() => import('@/pages/Gate'));

// These render as overlays and banners, so there is nothing useful to show
// while their chunk loads.
const Deferred = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={null}>{children}</Suspense>
);

// Warm the route chunks a signed-in member is near-certain to visit, once the
// first screen has settled. Vite dedupes these against App.tsx's lazy() calls,
// so tapping Feed, Messages or My Page becomes a cache hit instead of a
// network round trip. Idle-scheduled so it never competes with the boot RPC or
// the current route's own chunk; a module flag keeps remounts from re-running it.
let prefetchedRouteChunks = false;
const prefetchLikelyRoutes = () => {
  if (prefetchedRouteChunks) return;
  prefetchedRouteChunks = true;
  const idle =
    typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback
      : (cb: () => void) => window.setTimeout(cb, 2000);
  idle(() => {
    import('@/pages/HomePage');
    import('@/pages/Campfires');
    import('@/pages/MyPage');
  });
};

const FULL_SCREEN_ROUTES = ['/onboarding', '/welcome', '/login', '/new/story', '/privacy', '/terms'];
const FULL_SCREEN_PREFIXES = ['/invite/', '/join/'];

// Routes a logged-out visitor may see. Everything else shows the invite gate.
// '/' is the public marketing landing; '/onboarding' is reachable pre-account
// because signup itself happens there; invite/join landings must work without
// a session. Legal pages stay public for app-store/compliance reasons.
const PUBLIC_ROUTES = ['/', '/login', '/onboarding', '/privacy', '/terms'];
const PUBLIC_PREFIXES = ['/invite/', '/join/'];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNavigation();
  const queryClient = useQueryClient();
  // One request now answers all four of these. The suspension check, the
  // onboarding guard, the age gate and the profile each used to fetch
  // independently — three of them reading the same `profiles` row.
  const { data: boot, isLoading: bootLoading, isError: bootFailed, refetch } = useBootState();

  useEffect(() => {
    if (user) prefetchLikelyRoutes();
  }, [user]);

  const profile = boot?.profile ?? null;
  const suspension = boot?.suspension ?? null;
  const checking = !!user && bootLoading;
  const checkingWelcome = checking;
  const needsWelcome = !!profile && profile.onboarding_completed_at === null;

  // Admins are exempt so a founder locked out by a missing flag can still get
  // in and fix it.
  const needsAgeGate = !!profile && !profile.is_age_verified && !boot?.is_admin;
  const ageGateChecked = !user || !bootLoading;

  const isFullScreen =
    FULL_SCREEN_ROUTES.includes(location.pathname) ||
    FULL_SCREEN_PREFIXES.some(p => location.pathname.startsWith(p));

  const isPublic =
    PUBLIC_ROUTES.includes(location.pathname) ||
    PUBLIC_PREFIXES.some(p => location.pathname.startsWith(p));

  // Hard gate: a visitor with no session on a protected route never sees any
  // member content — only the invite gate. This backs up the row-level
  // security in the database.
  //
  // The gate covers the auth-loading window too, not just the resolved state.
  // Until auth resolves we cannot prove a session exists, so on a protected
  // route we hold on a loading screen rather than mount the page. That stops a
  // protected page (e.g. `/:handle`) from mounting and firing its pre-auth
  // profile query, and stops the shell from flashing before the gate decides.
  // The net effect: a shared or indexed link to any member page is
  // "sign in or get an invite" from the very first paint, never the page.
  if (!user && !isPublic) {
    if (authLoading) {
      return (
        <div className="app">
          <div className="topbar" />
          <main>
            <PineTreeLoading />
          </main>
        </div>
      );
    }
    return (
      <div className="fullscreen-shell">
        <Suspense fallback={<PineTreeLoading />}>
          <Gate />
        </Suspense>
      </div>
    );
  }

  /**
   * There is no fallback to the nine queries this replaced, so a failed boot
   * has to say so. Rendering the app around a null profile instead would be
   * worse than an error: a blank avatar and a silently missing suspension
   * check look like the app working.
   */
  if (user && bootFailed) {
    return (
      <div className="page-shell">
        <StatePanel
          title="Could not load your account."
          action={
            <button type="button" className="outline-button" onClick={() => refetch()}>
              Try again
            </button>
          }
        >
          The connection dropped on the way in. Nothing is wrong with your account.
        </StatePanel>
      </div>
    );
  }

  // Anyone who has an account but has not finished the welcome flow is still
  // carrying the placeholder handle and display name the signup trigger wrote,
  // so they never reach the app proper.
  if (user && !checkingWelcome && needsWelcome && !isFullScreen) {
    return <Navigate to="/welcome" replace />;
  }

  if (user && ageGateChecked && needsAgeGate) {
    return (
      <div className="fullscreen-shell">
        <Suspense fallback={<PineTreeLoading />}>
          {/* Refetch rather than flip a local flag: the age gate writes
              is_age_verified, so the boot payload is the thing that changed. */}
          <AgeGateInterstitial
            onComplete={() => queryClient.invalidateQueries({ queryKey: ['boot-state'] })}
          />
        </Suspense>
      </div>
    );
  }

  if (user && !checking && suspension) {
    return (
      <div className="fullscreen-shell">
        <Suspense fallback={<PineTreeLoading />}>
          <SuspendedPage
            reason={suspension.reason}
            suspendedUntil={suspension.suspended_until}
            isPermanent={suspension.is_permanent}
          />
        </Suspense>
      </div>
    );
  }

  // Until auth resolves we do not know whether this user gets navigation.
  // Reserve the chrome's boxes rather than rendering bare content and letting
  // the header and bars shove the page down a moment later.
  if (authLoading && !isFullScreen) {
    return (
      <div className="app">
        <div className="topbar" />
        <main>{children}</main>
      </div>
    );
  }

  const showNav = user && !isFullScreen;

  if (!showNav) {
    return (
      <div className="fullscreen-shell">
        <Deferred>
          <OfflineBanner />
          <InstallPrompt />
        </Deferred>
        {children}
      </div>
    );
  }

  return (
    <div className="app">
      <Deferred>
        <OfflineBanner />
        <InstallPrompt />
      </Deferred>


      <TopBar profile={profile ?? null} />

      <main>
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      <TabBar />

      {/* The compose sheet listens to NavigationContext's composerOpen; every
          "write a post" trigger outside My Page depends on this mount. */}
      <Deferred>
        <MobileComposerSheet />
      </Deferred>
    </div>
  );
};

export default AppLayout;
