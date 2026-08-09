import { Suspense, lazy, useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSuspensionCheck } from '@/hooks/useSuspensionCheck';
import { useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useNavigation } from '@/contexts/NavigationContext';
import { supabase } from '@/integrations/supabase/client';
import TopBar from './TopBar';
import TabBar from './TabBar';
import ErrorBoundary from '@/components/ErrorBoundary';
import PineTreeLoading from '@/components/PineTreeLoading';
import { useViewerProfile } from '@/hooks/queries';
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
const SceneDebugPanel = lazy(() => import('@/components/debug/SceneDebugPanel'));

// These render as overlays and banners, so there is nothing useful to show
// while their chunk loads.
const Deferred = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={null}>{children}</Suspense>
);

const FULL_SCREEN_ROUTES = ['/onboarding', '/welcome', '/login', '/new/story', '/privacy', '/terms'];
const FULL_SCREEN_PREFIXES = ['/invite/'];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNavigation();
  const { suspension, checking } = useSuspensionCheck(user?.id);
  const { needsWelcome, checking: checkingWelcome } = useOnboardingGuard(user?.id);
  const { isFounder } = useAdminCheck();
  const { data: profile } = useViewerProfile();
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
      <div className="app">
        <div className="topbar" />
        <main>{children}</main>
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
    <div className="app">
      <Deferred>
        {isFounder && <SceneDebugPanel />}
        <OfflineBanner />
        <InstallPrompt />
        <UpdatePrompt />
      </Deferred>

      <TopBar profile={profile ?? null} />

      <main>
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      <TabBar />
    </div>
  );
};

export default AppLayout;
