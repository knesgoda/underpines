import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import WarmGround from '@/components/layout/WarmGround';

/**
 * The wall a logged-out visitor hits on any protected route.
 *
 * Under Pines is invite-only, so a shared or search-indexed link to a member's
 * page shows only this gate to someone without a session — never the content
 * itself. It carries the intended path forward so signing in returns the
 * visitor to where they were headed.
 */
const Gate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = `${location.pathname}${location.search}`;

  return (
    <WarmGround>
      <div className="relative z-10 flex items-center justify-center min-h-screen px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-sm text-center"
        >
          <svg width="32" height="48" viewBox="0 0 48 72" className="mx-auto mb-8 animate-tree-sway">
            <path d="M24 4 L14 24 L34 24 Z" fill="hsl(var(--pine-mid))" opacity="0.95" />
            <path d="M24 14 L10 38 L38 38 Z" fill="hsl(var(--pine-mid))" opacity="0.8" />
            <path d="M24 26 L6 52 L42 52 Z" fill="hsl(var(--pine-mid))" opacity="0.65" />
            <rect x="20" y="52" width="8" height="16" rx="2" fill="hsl(var(--primary))" opacity="0.8" />
          </svg>

          <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
            <h1 className="text-2xl font-display text-foreground mb-3">
              Under Pines is invite-only.
            </h1>
            <p className="text-muted-foreground font-body text-sm leading-relaxed">
              This corner of the community is only visible to members. Sign in to
              continue — or if someone saved you a place, open the Trail Pass they
              sent you.
            </p>

            <Button
              onClick={() => navigate('/login', { state: { from } })}
              className="mt-8 w-full rounded-pill h-12 text-base font-body bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
            >
              Sign in
            </Button>

            <button
              onClick={() => navigate('/')}
              className="mt-4 text-sm text-muted-foreground hover:text-foreground font-body transition-colors"
            >
              What is Under Pines?
            </button>
          </div>
        </motion.div>
      </div>
    </WarmGround>
  );
};

export default Gate;
