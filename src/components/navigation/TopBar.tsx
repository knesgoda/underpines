import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useNavigation } from '@/contexts/NavigationContext';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import logo from '@/assets/logo.png';

/**
 * The handoff's topbar. Plain-language nav, which is the whole point: "Camps"
 * and "Campfires" used to sit next to each other and read as the same word.
 * Messages says what it is; the campfire metaphor now lives in the messenger
 * skins and the copy rather than in the label.
 */
const NAV = [
  { label: 'Home', to: '/' },
  { label: 'My Page', to: '/me' },
  { label: 'Explore', to: '/explore' },
];

const isActivePath = (pathname: string, to: string) =>
  to === '/' ? pathname === '/' : pathname.startsWith(to);

export const TopBar = ({
  profile,
}: {
  profile: { display_name: string; handle: string; avatar_url: string | null; default_avatar_key: string | null } | null;
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount, hasUnreadCampfires } = useNavigation();
  const { signOut } = useAuth();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  // Hand-rolled menu on purpose — the topbar rides in the entry chunk, and a
  // dropdown library would ride along with it.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // Navigating closes the menu; so does signing out.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="brand" aria-label="Under Pines home">
          <img src={logo} alt="" width={40} height={40} />
          <span>UNDER PINES</span>
        </Link>

        <form className="search" onSubmit={submitSearch} role="search">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Search Under Pines"
            placeholder="Search the pines"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </form>

        <nav className="desktop-nav" aria-label="Main navigation">
          {NAV.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={isActivePath(location.pathname, item.to) ? 'active' : undefined}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/messages"
            className={`mail ${location.pathname.startsWith('/messages') ? 'active' : ''}`}
          >
            Messages
            {hasUnreadCampfires && <b aria-label="unread messages">•</b>}
          </Link>
          <Link
            to="/updates"
            className={location.pathname.startsWith('/updates') ? 'active' : undefined}
          >
            Updates
            {unreadCount > 0 && <b>{unreadCount > 99 ? '99+' : unreadCount}</b>}
          </Link>
        </nav>

        {/* Phones lose the desktop nav, and the TabBar's five slots are set —
            the bell is how Updates stays one tap away with its count. */}
        <Link to="/updates" className="topbar-bell" aria-label="Updates">
          <span aria-hidden="true">🔔</span>
          {unreadCount > 0 && <b>{unreadCount > 99 ? '99+' : unreadCount}</b>}
        </Link>

        <div className="mini-me-menu" ref={menuRef}>
          <button
            type="button"
            className="mini-me"
            aria-label="Your menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(open => !open)}
          >
            <UserAvatar
              avatarUrl={profile?.avatar_url ?? null}
              defaultAvatarKey={profile?.default_avatar_key ?? null}
              displayName={profile?.display_name ?? ''}
              size={34}
            />
            <span className="mini-me-caret" aria-hidden="true">▾</span>
          </button>
          {menuOpen && (
            <div className="mini-me-panel" role="menu" aria-label="Your menu">
              <Link to="/updates" role="menuitem">
                Updates{unreadCount > 0 ? ` (${unreadCount > 99 ? '99+' : unreadCount})` : ''}
              </Link>
              <Link to="/me" role="menuitem">My Page</Link>
              <Link to="/settings" role="menuitem">Settings</Link>
              <Link to="/invites" role="menuitem">My Invites</Link>
              <Link to="/ranger-station" role="menuitem">Ranger Station</Link>
              <hr aria-hidden="true" />
              <button
                type="button"
                role="menuitem"
                className="is-signout"
                onClick={() => { setMenuOpen(false); signOut(); navigate('/'); }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
