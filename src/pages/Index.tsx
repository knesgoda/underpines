import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import WarmGround from '@/components/layout/WarmGround';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // If logged in, redirect to cabin
  useEffect(() => {
    if (!loading && user) {
      navigate('/cabin', { replace: true });
    }
  }, [loading, user, navigate]);

  if (!loading && user) return null;

  return (
    <WarmGround>
      <div className="relative z-10 flex items-center justify-center min-h-screen px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-md"
        >
          {/* Logo */}
          <svg
            width="48"
            height="72"
            viewBox="0 0 48 72"
            className="mx-auto mb-8 animate-tree-sway"
          >
            <path d="M24 4 L14 24 L34 24 Z" fill="hsl(var(--pine-mid))" opacity="0.95" />
            <path d="M24 14 L10 38 L38 38 Z" fill="hsl(var(--pine-mid))" opacity="0.8" />
            <path d="M24 26 L6 52 L42 52 Z" fill="hsl(var(--pine-mid))" opacity="0.65" />
            <rect x="20" y="52" width="8" height="16" rx="2" fill="hsl(var(--primary))" opacity="0.8" />
          </svg>

          <h1 className="text-4xl font-display text-foreground mb-4">
            Under Pines
          </h1>
          <p className="text-muted-foreground font-body mb-12 leading-relaxed">
            An invite-only community built around<br />
            warmth, trust, and intentionality.
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => navigate('/login')}
              className="w-full rounded-pill h-12 text-base font-body bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Sign in
            </Button>
            <p className="text-xs text-muted-foreground font-body">
              No account? You'll need an invite from a member.
            </p>
          </div>
        </motion.div>
      </div>
    </WarmGround>
  );
};

export default Index;
