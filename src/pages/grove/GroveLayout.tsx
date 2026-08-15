import { Navigate, Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useAuth } from '@/contexts/AuthContext';
import { isWaitlistAdminEmail } from '@/lib/waitlistAdmin';
import PineTreeLoading from '@/components/PineTreeLoading';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/grove', label: 'Overview', end: true },
  // Moderation: trust, bot defense, and invitation containment. ("Ranger
  // Station" now names the member-facing feedback board at /ranger-station.)
  { to: '/grove/cases', label: 'Moderation' },
  { to: '/grove/trails', label: 'Trail Map' },
  { to: '/grove/appeals', label: 'Appeals' },
  { to: '/grove/queue', label: 'Review Queue' },
  { to: '/grove/members', label: 'Members' },
  // Companions was removed with the scene system in 3c. The nav item outlived
  // the route, so the link rendered a blank page under the chrome.
  { to: '/grove/camps', label: 'Groups' },
  { to: '/grove/designs', label: 'Designs' },
  { to: '/grove/audit', label: 'Audit Log' },
  { to: '/grove/settings', label: 'Settings' },
];

const GroveLayout = () => {
  const { isAdmin, loading } = useAdminCheck();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (loading) return <PineTreeLoading />;
  if (!isAdmin) return <Navigate to="/" replace />;

  // The waitlist is founder-only (RLS enforces it); other admins don't get
  // a nav item pointing at a page that would always be empty for them.
  const navItems = isWaitlistAdminEmail(user?.email)
    ? [...NAV_ITEMS.slice(0, 6), { to: '/grove/waitlist', label: 'Waitlist' }, ...NAV_ITEMS.slice(6)]
    : NAV_ITEMS;

  return (
    // The safe-area padding keeps the header out from under the status bar on
    // notched phones now that viewport-fit=cover is set; the strip above it
    // shows this div's own dark ground, so the white clock stays readable.
    <div className="min-h-screen bg-[hsl(var(--pine-darkest))]" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <header className="h-14 border-b border-[hsl(var(--pine-mid)/0.3)] flex items-center justify-between px-6 bg-[hsl(var(--pine-dark))]">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌲</span>
          <span className="font-display text-sm font-bold text-[hsl(var(--pine-pale))]">The Grove</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[hsl(var(--pine-light)/0.65)]">{user?.email}</span>
          <button
            onClick={() => navigate('/me')}
            className="text-xs text-[hsl(var(--amber-mid))] hover:text-[hsl(var(--amber-light))] transition-colors"
          >
            Back
          </button>
        </div>
      </header>

      <div className="flex">
        <nav className="w-56 min-h-[calc(100vh-3.5rem)] border-r border-[hsl(var(--pine-mid)/0.3)] bg-[hsl(var(--pine-dark))] p-3 space-y-0.5 hidden md:block">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-[3px] text-sm transition-colors',
                  isActive
                    ? 'bg-[hsl(var(--amber-deep)/0.15)] text-[hsl(var(--amber-mid))]'
                    : 'text-[hsl(var(--pine-light)/0.7)] hover:text-[hsl(var(--pine-light))] hover:bg-[hsl(var(--pine-mid)/0.2)]'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[hsl(var(--pine-mid)/0.3)] bg-[hsl(var(--pine-dark))] flex justify-around py-2">
          {NAV_ITEMS.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 text-[10px] px-2 py-1',
                  isActive ? 'text-[hsl(var(--amber-mid))]' : 'text-[hsl(var(--pine-light)/0.5)]'
                )
              }
            >
              {item.label.split(' ')[0]}
            </NavLink>
          ))}
        </div>

        <main className="flex-1 p-6 pb-20 md:pb-6 min-h-[calc(100vh-3.5rem)] overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default GroveLayout;
