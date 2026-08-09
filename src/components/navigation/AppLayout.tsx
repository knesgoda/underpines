import { Suspense, lazy, useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSuspensionCheck } from '@/hooks/useSuspensionCheck';
import { useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useNavigation } from '@/contexts/NavigationContext';
import { supabase } from '@/integrations/supabase/client';
import DesktopSidebar from './DesktopSidebar';
import MobileTabBar from './MobileTabBar';
import LanternIcon from './LanternIcon';
import ErrorBoundary from '@/components/ErrorBoundary';
import PineTreeLoading from '@/components/PineTreeLoading';

// Chrome that is rarely rendered on first paint. Keeping these out of the
// entry chunk matters most for MobileComposerSheet, which pulls in both post
// composers, and SceneDebugPanel, which only founders ever see.
const MobileComposerSheet = lazy(() => import('@/components/feed/MobileComposerSheet'));
const OfflineBanner = lazy(() => import('@/components/pwa/OfflineBanner'));
const InstallPrompt = lazy(() => import('@/components/pwa/InstallPrompt'));
const UpdatePrompt = lazy(() => import('@/components/pwa/UpdatePrompt'));
const SuspendedPage = lazy(() => import('@/pages/Suspended'));
const AgeGateInterstitial = lazy(() => import('@/components/onboarding/AgeGateInterstitial'));
const SceneDebugPanel = lazy(() => import('@/components/debug/SceneDebugPanel'));

// These render as overlays and banners, so there is nothing useful to show
// while their chunk loads.
const Deferred = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={null}>{children}</Suspense>
);

const FULL_SCREEN_ROUTES = ['/onboarding', '/welcome', '/login', '/new/story', '/privacy', '/terms'];
const FULL_SCREEN_PREFIXES = ['/invite/'];

const titleForPath = (pathname: string) => {
  if (pathname === '/') return 'Home';
  if (pathname.startsWith('/camps')) return 'Camps';
  if (pathname.startsWith('/campfires')) return 'Campfires';
  if (pathname.startsWith('/cabin')) return 'Cabin';
  if (pathname.startsWith('/lantern')) return 'Lantern';
  if (pathname.startsWith('/circles')) return 'Circles';
  if (pathname.startsWith('/search')) return 'Search';
  if (pathname.startsWith('/settings')) return 'Settings';
  return 'Under Pines';
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNavigation();
  const { suspension, checking } = useSuspensionCheck(user?.id);
  const { needsWelcome, checking: checkingWelcome } = useOnboardingGuard(user?.id);
  const { isFounder } = useAdminCheck();
  const [needsAgeGate, setNeedsAgeGate] = useState(false);
  const [ageGateChecked, setAgeGateChecked] = useState(false);

  useEffect(() => {
    if (!user) {
      setAgeGateChecked(true);
      return;
    }
    const checkAge = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_age_verified, age_bracket')
        .eq('id', user.id)
        .maybeSingle();

      const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: user.id });

      if (profile && !profile.is_age_verified && !isAdmin) {
        setNeedsAgeGate(true);
      }
      setAgeGateChecked(true);
    };
    checkAge();
  }, [user]);

  const isFullScreen =
    FULL_SCREEN_ROUTES.includes(location.pathname) ||
    FULL_SCREEN_PREFIXES.some(p => location.pathname.startsWith(p));

  // Anyone who has an account but has not finished the welcome flow is still
  // carrying the placeholder handle and display name the signup trigger wrote,
  // so they never reach the app proper.
  if (user && !checkingWelcome && needsWelcome && !isFullScreen) {
    return <Navigate to="/welcome" replace />;
  }

  if (user && ageGateChecked && needsAgeGate) {
    return (
      <Suspense fallback={<PineTreeLoading />}>
        <AgeGateInterstitial onComplete={() => setNeedsAgeGate(false)} />
      </Suspense>
    );
  }

  if (user && !checking && suspension) {
    return (
      <Suspense fallback={<PineTreeLoading />}>
        <SuspendedPage
          reason={suspension.reason}
          suspendedUntil={suspension.suspended_until}
          isPermanent={suspension.is_permanent}
        />
      </Suspense>
    );
  }

  // Until auth resolves we do not know whether this user gets navigation.
  // Reserve the chrome's boxes rather than rendering bare content and letting
  // the header and bars shove the page down a moment later.
  if (authLoading && !isFullScreen) {
    return (
      <div className="min-h-screen bg-card">
        <div className="fixed top-0 left-0 right-0 z-30 h-14 border-b border-border bg-card" />
        <div className="hidden md:block fixed left-0 top-14 bottom-0 w-[260px] border-r border-border bg-card" />
        <main className="pb-16 pt-14 md:ml-[260px] md:pb-0">{children}</main>
      </div>
    );
  }

  const showNav = user && !isFullScreen;

  if (!showNav) {
    return (
      <>
        <Deferred>
          <OfflineBanner />
          <InstallPrompt />
          <UpdatePrompt />
        </Deferred>
        {children}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-card">
      <Deferred>
        {isFounder && <SceneDebugPanel />}
        <OfflineBanner />
        <InstallPrompt />
        <UpdatePrompt />
      </Deferred>

      <header className="fixed top-0 left-0 right-0 z-30 h-14 border-b border-border bg-card">
        <div className="mx-auto flex h-full items-center justify-between px-3 md:px-4">
          <div className="h-11 w-11" aria-hidden="true" />
          <h1 className="font-serif text-base tracking-[0.03em] text-foreground">{titleForPath(location.pathname)}</h1>
          <button
            type="button"
            onClick={() => navigate('/lantern')}
            className="flex items-center justify-center rounded-lg h-14 w-14"
            aria-label={`Open notifications, ${unreadCount} unread`}
          >
            <LanternIcon size={56} />
          </button>
        </div>
      </header>

      <div className="hidden md:block">
        <DesktopSidebar />
      </div>

      <main className="pb-16 pt-14 md:ml-[260px] md:pb-0">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      <MobileTabBar />
      <Deferred>
        <MobileComposerSheet />
      </Deferred>
    </div>
  );
};

export default AppLayout;
