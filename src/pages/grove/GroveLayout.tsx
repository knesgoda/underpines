import { Navigate, Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useAuth } from '@/contexts/AuthContext';
import PineTreeLoading from '@/components/PineTreeLoading';
import { LayoutDashboard, ListChecks, Users, Tent, DollarSign, Settings, ArrowLeft, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/grove', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/grove/queue', label: 'Review Queue', icon: ListChecks },
  { to: '/grove/members', label: 'Members', icon: Users },
  { to: '/grove/camps', label: 'Camps', icon: Tent },
  { to: '/grove/designs', label: 'Designs', icon: Palette },
  { to: '/grove/revenue', label: 'Revenue', icon: DollarSign },
  { to: '/grove/settings', label: 'Settings', icon: Settings },
];

const GroveLayout = () => {
  const { isAdmin, loading } = useAdminCheck();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (loading) return <PineTreeLoading />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-[hsl(var(--pine-darkest))]">
      {/* Top bar */}
      <header className="h-14 border-b border-[hsl(var(--pine-mid)/0.3)] flex items-center justify-between px-6 bg-[hsl(var(--pine-dark))]">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌲</span>
          <span className="font-display text-sm font-bold text-[hsl(var(--pine-pale))]">The Grove</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[hsl(var(--muted-text))]">{user?.email}</span>
          <button
            onClick={() => navigate('/cabin')}
            className="flex items-center gap-1 text-xs text-[hsl(var(--amber-mid))] hover:text-[hsl(var(--amber-light))] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
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
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Mobile nav */}
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
              <item.icon className="w-4 h-4" />
              {item.label.split(' ')[0]}
            </NavLink>
          ))}
        </div>

        {/* Content */}
        <main className="flex-1 p-6 pb-20 md:pb-6 min-h-[calc(100vh-3.5rem)] overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default GroveLayout;
