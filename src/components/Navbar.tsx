import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<{ display_name: string; handle: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('display_name, handle')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    }
  }, [user]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid hsl(var(--border))' }}>
      <Link to="/cabin" className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity">
        <svg width="20" height="28" viewBox="0 0 48 72">
          <path d="M24 4 L14 24 L34 24 Z" fill="hsl(var(--pine-dark))" opacity="0.9" />
          <path d="M24 14 L10 38 L38 38 Z" fill="hsl(var(--pine-dark))" opacity="0.7" />
          <path d="M24 26 L6 52 L42 52 Z" fill="hsl(var(--pine-dark))" opacity="0.5" />
          <rect x="20" y="52" width="8" height="16" rx="2" fill="hsl(var(--amber-deep))" opacity="0.5" />
        </svg>
        <span className="font-display text-base font-medium">Under Pines</span>
      </Link>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-sm font-body text-foreground hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-medium text-secondary-foreground">
            {profile?.display_name?.[0]?.toUpperCase() || '?'}
          </div>
          <span className="hidden sm:inline">{profile?.display_name}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
            <path d="M3 5 L6 8 L9 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 w-48 rounded-xl bg-card shadow-card border border-border overflow-hidden"
            >
              <div className="py-1">
                <DropdownItem onClick={() => { navigate('/cabin'); setOpen(false); }}>
                  Visit my Cabin
                </DropdownItem>
                <DropdownItem onClick={() => { navigate('/cabin?edit=true'); setOpen(false); }}>
                  Edit Cabin
                </DropdownItem>
                <DropdownItem onClick={() => { navigate('/invites'); setOpen(false); }}>
                  My Invites
                </DropdownItem>
                <div className="h-px bg-border my-1" />
                <DropdownItem onClick={() => { signOut(); navigate('/'); }}>
                  Sign out
                </DropdownItem>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

const DropdownItem = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className="w-full text-left px-4 py-2.5 text-sm font-body text-foreground hover:bg-secondary transition-colors"
  >
    {children}
  </button>
);

export default Navbar;
