import { Link, useLocation } from 'react-router-dom';
import { useNavigation } from '@/contexts/NavigationContext';

/**
 * Mobile bottom navigation, five items as the handoff specifies.
 *
 * The old bar put "Camps" and "Campfires" two slots apart at 10px, where they
 * were effectively indistinguishable. Groups and Messages are not.
 */
const TABS = [
  { label: 'Home', to: '/', icon: '⌂' },
  { label: 'Groups', to: '/groups', icon: '⛺' },
  { label: 'Post', to: '/new/story', icon: '✎' },
  { label: 'Messages', to: '/messages', icon: '✉' },
  { label: 'My Page', to: '/me', icon: '☺' },
];

export const TabBar = () => {
  const location = useLocation();
  const { hasUnreadCampfires } = useNavigation();

  return (
    <nav className="tabbar" aria-label="Primary">
      {TABS.map(tab => {
        const active = tab.to === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.to);
        return (
          <Link key={tab.to} to={tab.to} className={active ? 'active' : undefined}>
            <span aria-hidden="true">
              {tab.icon}
              {tab.to === '/messages' && hasUnreadCampfires ? ' •' : ''}
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
};

export default TabBar;
