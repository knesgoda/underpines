import { Link, useLocation } from 'react-router-dom';
import { useNavigation } from '@/contexts/NavigationContext';
import { Home, Tent, Flame, Plus } from 'lucide-react';
import LanternIcon from './LanternIcon';

interface TabItem {
  label: string;
  icon: React.ElementType;
  path: string;
  isComposer?: boolean;
  isLantern?: boolean;
}

const tabs: TabItem[] = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'Cabin', icon: Tent, path: '/cabin' },
  { label: 'New', icon: Plus, path: '', isComposer: true },
  { label: 'Fires', icon: Flame, path: '/campfires' },
  { label: 'Lantern', icon: Flame, path: '/lantern', isLantern: true },
];

const MobileTabBar = () => {
  const { setComposerOpen } = useNavigation();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          if (tab.isComposer) {
            return (
              <button
                key="composer"
                onClick={() => setComposerOpen(true)}
                className="flex items-center justify-center w-12 h-12 -mt-4 rounded-full bg-primary text-primary-foreground shadow-card"
              >
                <Plus size={22} />
              </button>
            );
          }

          if (tab.isLantern) {
            const active = isActive('/lantern');
            return (
              <Link
                key="lantern"
                to="/lantern"
                className="flex flex-col items-center justify-center gap-0.5 min-w-[48px]"
              >
                <LanternIcon active={active} />
                <span className={`text-[10px] font-body ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                  Lantern
                </span>
              </Link>
            );
          }

          const active = isActive(tab.path);
          const TabIcon = tab.icon;
          return (
            <Link
              key={tab.label}
              to={tab.path}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[48px]"
            >
              <TabIcon size={20} className={active ? 'text-primary' : 'text-muted-foreground'} />
              <span className={`text-[10px] font-body ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}

        {/* Settings tab */}
        <Link
          to="/settings"
          className="flex flex-col items-center justify-center gap-0.5 min-w-[48px]"
        >
          <Settings size={20} className={isActive('/settings') ? 'text-primary' : 'text-muted-foreground'} />
          <span className={`text-[10px] font-body ${isActive('/settings') ? 'text-primary' : 'text-muted-foreground'}`}>
            Settings
          </span>
        </Link>
      </div>
    </nav>
  );
};

export default MobileTabBar;
