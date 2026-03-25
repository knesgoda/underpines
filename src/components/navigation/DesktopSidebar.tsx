import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useCampfireUnread } from '@/hooks/useCampfireUnread';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo.png';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import UserAvatar from '@/components/UserAvatar';
import { useInviteData } from '@/hooks/useInviteData';

interface NavItem {
  label: string;
  path: string;
  icon?: string;
  iconActive?: string;
  comingSoon?: boolean;
}

const ICON_V = '?v=3';
const navItems: NavItem[] = [
  { label: 'Home', path: '/', icon: `/icons/home_feed.png${ICON_V}`, iconActive: `/icons/home_feed.png${ICON_V}` },
  { label: 'My Cabin', path: '/cabin', icon: `/icons/cabin.png${ICON_V}`, iconActive: `/icons/cabin.png${ICON_V}` },
  { label: 'Circles', path: '/circles', icon: `/icons/circle.png${ICON_V}`, iconActive: `/icons/circle.png${ICON_V}` },
  { label: 'Campfires', path: '/campfires', icon: `/icons/campfire.png${ICON_V}`, iconActive: `/icons/campfire.png${ICON_V}` },
  { label: 'Camps', path: '/camps', icon: `/icons/camp.png${ICON_V}`, iconActive: `/icons/camp.png${ICON_V}` },
  { label: 'Search', path: '/search', icon: `/icons/search_owl.png${ICON_V}`, iconActive: `/icons/search_owl.png${ICON_V}` },
];

const InviteNavItem = ({ isActive }: { isActive: (path: string) => boolean }) => {
  const { usesRemaining, isInfinite, loading } = useInviteData();
  const active = isActive('/invites');

  if (loading) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/invites"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-body text-sm transition-colors relative ${
            active
              ? 'bg-primary/8 text-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          {active && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
          )}
          <img src={`/icons/invite.png${ICON_V}`} alt="Invite" width={32} height={32} className="w-8 h-8" />
          <span>Invite Friends</span>
          {!isInfinite && usesRemaining != null && usesRemaining > 0 && (
            <span className="ml-auto text-xs font-body text-muted-foreground/60">
              {usesRemaining} left
            </span>
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="font-body text-xs">
        Invite someone to the Pines
      </TooltipContent>
    </Tooltip>
  );
};

const DesktopSidebar = () => {
  const { user } = useAuth();
  const { setComposerOpen } = useNavigation();
  const { markSeen } = useCampfireUnread();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ display_name: string; handle: string; avatar_url: string | null; default_avatar_key: string | null } | null>(null);

  useEffect(() => {
    if (location.pathname.startsWith('/campfires')) markSeen();
  }, [location.pathname, markSeen]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('display_name, handle, avatar_url, default_avatar_key')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-[260px] border-r border-border bg-card flex flex-col z-40">
      <Link to="/" className="flex items-center gap-2.5 px-5 py-4 hover:opacity-80 transition-opacity">
        <img src={logo} alt="Under Pines" className="w-8 h-8 rounded-full object-cover" />
        <span className="font-display text-base font-medium text-foreground">Under Pines</span>
      </Link>

      {profile && (
        <div className="px-5 pb-4">
          <div className="flex items-center gap-3">
            <UserAvatar
              avatarUrl={profile.avatar_url}
              defaultAvatarKey={profile.default_avatar_key}
              displayName={profile.display_name}
              size={40}
            />
            <div className="min-w-0">
              <p className="font-body text-sm font-medium text-foreground truncate">{profile.display_name}</p>
              <p className="font-body text-xs text-muted-foreground truncate">@{profile.handle}</p>
            </div>
          </div>
        </div>
      )}

      <div className="h-px bg-border mx-4" />

      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {navItems.map((item) => {
          const active = isActive(item.path);

          if (item.comingSoon) {
            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-body text-sm text-muted-foreground cursor-default transition-colors">
                    <span className="w-6 h-6" aria-hidden="true" />
                    <span>{item.label}</span>
                    <span className="ml-auto text-[10px] font-body text-muted-foreground/50">soon</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-body text-xs">
                  Coming soon to the Pines.
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-body text-sm transition-colors relative ${
                active
                  ? 'bg-primary/8 text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
              )}
              {item.icon && item.iconActive ? (
                <img
                  src={active ? item.iconActive : item.icon}
                  alt={`${item.label} ${active ? 'active' : 'inactive'} icon`}
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain aspect-square"
                />
              ) : (
                <span className="w-8 h-8" aria-hidden="true" />
              )}
              <span>{item.label}</span>
            </Link>
          );
        })}

        <InviteNavItem isActive={isActive} />
      </nav>

      <div className="px-3 pb-2">
        <div className="h-px bg-border mb-2" />
        <button
          onClick={() => {
            if (location.pathname !== '/') {
              navigate('/');
              setTimeout(() => setComposerOpen(true), 100);
            } else {
              setComposerOpen(true);
            }
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <img src="/icons/compose.png?v=3" alt="Compose" width={30} height={30} className="h-[30px] w-[30px]" />
          New Post
        </button>
      </div>

      <div className="px-3 pb-3">
        <div className="h-px bg-border mb-2" />
        <Link
          to="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-body text-sm transition-colors ${
            isActive('/settings')
              ? 'bg-primary/8 text-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <span className="w-6 h-6" aria-hidden="true" />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
