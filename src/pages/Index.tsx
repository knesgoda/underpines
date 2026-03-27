import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import WeatherScene from '@/components/cabin/WeatherScene';

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
    <div className="fixed inset-0 overflow-hidden">
      {/* Background scene */}
      <WeatherScene hour={19} season="summer" />
      <div className="absolute inset-0" style={{ background: 'rgba(5, 46, 22, 0.6)' }} />

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
            <path d="M24 4 L14 24 L34 24 Z" fill="#dcfce7" opacity="0.9" />
            <path d="M24 14 L10 38 L38 38 Z" fill="#dcfce7" opacity="0.7" />
            <path d="M24 26 L6 52 L42 52 Z" fill="#dcfce7" opacity="0.5" />
            <rect x="20" y="52" width="8" height="16" rx="2" fill="#fef3c7" opacity="0.5" />
          </svg>

          <h1 className="text-4xl font-display text-pine-light mb-4">
            Under Pines
          </h1>
          <p className="text-pine-light/60 font-body mb-12 leading-relaxed">
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
            <p className="text-xs text-pine-light/40 font-body">
              No account? You'll need an invite from a member.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
