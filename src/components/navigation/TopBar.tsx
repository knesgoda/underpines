import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useNavigation } from '@/contexts/NavigationContext';
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
  const [query, setQuery] = useState('');

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

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

        <Link to="/me" className="mini-me" aria-label="Open your page">
          <UserAvatar
            avatarUrl={profile?.avatar_url ?? null}
            defaultAvatarKey={profile?.default_avatar_key ?? null}
            displayName={profile?.display_name ?? ''}
            size={34}
          />
        </Link>
      </div>
    </header>
  );
};

export default TopBar;
