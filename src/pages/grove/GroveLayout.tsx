import { Navigate, Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useAuth } from '@/contexts/AuthContext';
import PineTreeLoading from '@/components/PineTreeLoading';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/grove', label: 'Overview', end: true },
  { to: '/grove/queue', label: 'Review Queue' },
  { to: '/grove/members', label: 'Members' },
  { to: '/grove/companions', label: 'Companions' },
  { to: '/grove/camps', label: 'Camps' },
  { to: '/grove/designs', label: 'Designs' },
  { to: '/grove/revenue', label: 'Revenue' },
  { to: '/grove/settings', label: 'Settings' },
];

const GroveLayout = () => {
  const { isAdmin, loading } = useAdminCheck();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (loading) return <PineTreeLoading />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-[hsl(var(--pine-darkest))]">
      <header className="h-14 border-b border-[hsl(var(--pine-mid)/0.3)] flex items-center justify-between px-6 bg-[hsl(var(--pine-dark))]">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌲</span>
          <span className="font-display text-sm font-bold text-[hsl(var(--pine-pale))]">The Grove</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[hsl(var(--muted-text))]">{user?.email}</span>
          <button
            onClick={() => navigate('/cabin')}
            className="text-xs text-[hsl(var(--amber-mid))] hover:text-[hsl(var(--amber-light))] transition-colors"
          >
            Back
          </button>
        </div>
      </header>

      <div className="flex">
        <nav className="w-56 min-h-[calc(100vh-3.5rem)] border-r border-[hsl(var(--pine-mid)/0.3)] bg-[hsl(var(--pine-dark))] p-3 space-y-0.5 hidden md:block">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
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
