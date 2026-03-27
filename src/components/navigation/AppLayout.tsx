import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSuspensionCheck } from '@/hooks/useSuspensionCheck';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useNavigation } from '@/contexts/NavigationContext';
import { supabase } from '@/integrations/supabase/client';
import DesktopSidebar from './DesktopSidebar';
import MobileTabBar from './MobileTabBar';
import MobileComposerSheet from '@/components/feed/MobileComposerSheet';
import OfflineBanner from '@/components/pwa/OfflineBanner';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import UpdatePrompt from '@/components/pwa/UpdatePrompt';
import SuspendedPage from '@/pages/Suspended';
import AgeGateInterstitial from '@/components/onboarding/AgeGateInterstitial';
import SceneDebugPanel from '@/components/debug/SceneDebugPanel';
import LanternIcon from './LanternIcon';
import ErrorBoundary from '@/components/ErrorBoundary';

const FULL_SCREEN_ROUTES = ['/onboarding', '/login', '/new/story', '/privacy', '/terms'];
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
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNavigation();
  const { suspension, checking } = useSuspensionCheck(user?.id);
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

  if (user && ageGateChecked && needsAgeGate) {
    return <AgeGateInterstitial onComplete={() => setNeedsAgeGate(false)} />;
  }

  if (user && !checking && suspension) {
    return (
      <SuspendedPage
        reason={suspension.reason}
        suspendedUntil={suspension.suspended_until}
        isPermanent={suspension.is_permanent}
      />
    );
  }

  const showNav = user && !isFullScreen;

  if (!showNav) {
    return (
      <>
        <OfflineBanner />
        <InstallPrompt />
        <UpdatePrompt />
        {children}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-card">
      {isFounder && <SceneDebugPanel />}
      <OfflineBanner />
      <InstallPrompt />
      <UpdatePrompt />

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
        {children}
      </main>

      <MobileTabBar />
      <MobileComposerSheet />
    </div>
  );
};

export default AppLayout;
