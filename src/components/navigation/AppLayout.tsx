import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSuspensionCheck } from '@/hooks/useSuspensionCheck';
import { supabase } from '@/integrations/supabase/client';
import DesktopSidebar from './DesktopSidebar';
import MobileTabBar from './MobileTabBar';
import OfflineBanner from '@/components/pwa/OfflineBanner';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import UpdatePrompt from '@/components/pwa/UpdatePrompt';
import SuspendedPage from '@/pages/Suspended';
import AgeGateInterstitial from '@/components/onboarding/AgeGateInterstitial';
import SeasonalDebugPanel from '@/components/seasonal/SeasonalDebugPanel';

const FULL_SCREEN_ROUTES = ['/onboarding', '/login', '/new/story', '/privacy', '/terms'];
const FULL_SCREEN_PREFIXES = ['/invite/'];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  const { suspension, checking } = useSuspensionCheck(user?.id);
  const [needsAgeGate, setNeedsAgeGate] = useState(false);
  const [ageGateChecked, setAgeGateChecked] = useState(false);

  // LEGAL-REVIEW-NEEDED: Check if existing user needs age verification
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

      // Check if this is the founder (admin) — exempt from age gate
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

  // Show age gate interstitial for existing users who haven't verified
  if (user && ageGateChecked && needsAgeGate) {
    return <AgeGateInterstitial onComplete={() => setNeedsAgeGate(false)} />;
  }

  // Show suspension page if user is suspended
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
    <div className="min-h-screen">
      <OfflineBanner />
      <InstallPrompt />
      <UpdatePrompt />

      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <DesktopSidebar />
      </div>

      {/* Main content */}
      <main className="md:ml-[260px] pb-16 md:pb-0">
        {children}
      </main>

      {/* Mobile tab bar */}
      <MobileTabBar />
      <SeasonalDebugPanel />
    </div>
  );
};

export default AppLayout;
