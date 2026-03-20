import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { supabase } from '@/integrations/supabase/client';
import { Home, Tent, Flame, Search, Settings, Plus, Users, Trees } from 'lucide-react';
import logo from '@/assets/logo.png';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import LanternIcon from './LanternIcon';
import UserAvatar from '@/components/UserAvatar';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  comingSoon?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'My Cabin', icon: Tent, path: '/cabin' },
  { label: 'Circles', icon: Users, path: '/circles' },
  { label: 'Campfires', icon: Flame, path: '/campfires' },
  { label: 'Camps', icon: Tent, path: '/camps' },
  { label: 'Search', icon: Search, path: '/search' },
];

const DesktopSidebar = () => {
  const { user, signOut } = useAuth();
  const { setComposerOpen } = useNavigation();
  const location = useLocation();
  const [profile, setProfile] = useState<{ display_name: string; handle: string; avatar_url: string | null; default_avatar_key: string | null } | null>(null);

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
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] border-r border-border bg-card flex flex-col z-40">
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
          const ItemIcon = item.icon;

          if (item.comingSoon) {
            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-body text-sm text-muted-foreground cursor-default transition-colors">
                    <ItemIcon size={18} />
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
              <ItemIcon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Lantern */}
        <Link
          to="/lantern"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-body text-sm transition-colors relative ${
            isActive('/lantern')
              ? 'bg-primary/8 text-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          {isActive('/lantern') && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
          )}
          <LanternIcon active={isActive('/lantern')} />
          <span>Lantern</span>
        </Link>
      </nav>

      <div className="px-3 pb-2">
        <div className="h-px bg-border mb-2" />
        <button
          onClick={() => setComposerOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
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
          <Settings size={18} />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
