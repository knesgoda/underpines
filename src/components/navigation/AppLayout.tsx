import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DesktopSidebar from './DesktopSidebar';
import MobileTabBar from './MobileTabBar';
import OfflineBanner from '@/components/pwa/OfflineBanner';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import UpdatePrompt from '@/components/pwa/UpdatePrompt';

const FULL_SCREEN_ROUTES = ['/onboarding', '/login', '/new/story'];
const FULL_SCREEN_PREFIXES = ['/invite/'];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();

  const isFullScreen =
    FULL_SCREEN_ROUTES.includes(location.pathname) ||
    FULL_SCREEN_PREFIXES.some(p => location.pathname.startsWith(p));

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
    </div>
  );
};

export default AppLayout;
