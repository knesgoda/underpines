import { Link, useLocation } from 'react-router-dom';
import { useNavigation } from '@/contexts/NavigationContext';
import { useCampfireUnread } from '@/hooks/useCampfireUnread';
import { useEffect } from 'react';

interface TabItem {
  key: 'home' | 'camps' | 'compose' | 'campfires' | 'cabin';
  label: string;
  path: string;
  isComposer?: boolean;
}

const tabs: TabItem[] = [
  { key: 'home', label: 'Home', path: '/' },
  { key: 'camps', label: 'Camps', path: '/camps' },
  { key: 'compose', label: 'Compose', path: '', isComposer: true },
  { key: 'campfires', label: 'Campfires', path: '/campfires' },
  { key: 'cabin', label: 'Cabin', path: '/cabin' },
];

const V = '?v=3';
const tabIcon = (key: TabItem['key'], active: boolean) => {
  if (key === 'compose') return `/icons/compose.png${V}`;
  if (key === 'home') return `/icons/home_feed.png${V}`;
  if (key === 'camps') return active ? `/icons/tent_active.png${V}` : `/icons/tent_inactive.png${V}`;
  if (key === 'campfires') return active ? `/icons/flame_active.png${V}` : `/icons/flame_inactive.png${V}`;
  return active ? `/icons/cabin_active.png${V}` : `/icons/cabin_inactive.png${V}`;
};

const MobileTabBar = () => {
  const { setComposerOpen } = useNavigation();
  const { markSeen } = useCampfireUnread();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    if (location.pathname.startsWith('/campfires')) {
      markSeen();
    }
  }, [location.pathname, markSeen]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
    >
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          if (tab.isComposer) {
            return (
              <button
                key="compose"
                onClick={() => setComposerOpen(true)}
                className="flex items-center justify-center w-12 h-12 -mt-[10px] active:scale-95 transition-transform"
                aria-label="Compose new post"
                type="button"
              >
                <img
                  src={tabIcon('compose', false)}
                  alt="Compose"
                  width={30}
                  height={30}
                  className="h-[30px] w-[30px] drop-shadow-[0_0_3px_hsl(142_76%_36%_/0.35)]"
                />
              </button>
            );
          }

          const active = isActive(tab.path);
          return (
            <Link
              key={tab.key}
              to={tab.path}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[56px]"
            >
              <img
                src={tabIcon(tab.key, active)}
                alt={`${tab.label} ${active ? 'active' : 'inactive'} icon`}
                width={24}
                height={24}
                className="h-6 w-6"
              />
              <span
                className={`font-serif text-[10px] tracking-[0.03em] ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileTabBar;
