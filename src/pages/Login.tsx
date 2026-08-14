import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import WarmGround from '@/components/layout/WarmGround';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Where the visitor was headed before the gate sent them here.
  const from = (location.state as { from?: string } | null)?.from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error('Could not find that combination. Try again?');
      setLoading(false);
      return;
    }

    // Return the visitor to the page they originally tried to open, if the
    // gate captured one; otherwise land on the feed.
    navigate(from && from !== '/login' ? from : '/', { replace: true });
  };

  return (
    <WarmGround>

      <div className="relative z-10 flex items-center justify-center min-h-screen px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-sm"
        >
          <div className="rounded-[5px] border border-border bg-card p-8 shadow-panel">
            <h2 className="text-2xl font-display text-foreground text-center mb-8">
              Welcome back
            </h2>

            <div className="space-y-4">
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                className="h-12 rounded-[3px] bg-background border-border text-foreground placeholder:text-muted-foreground font-body"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  className="h-12 rounded-[3px] bg-background border-border text-foreground placeholder:text-muted-foreground font-body pr-12"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              onClick={handleLogin}
              disabled={loading || !email || !password}
              className="w-full mt-6 rounded-[3px] h-11 text-base font-body bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
            >
              {loading ? 'Signing you in...' : 'Sign in'}
            </Button>
          </div>
        </motion.div>
      </div>
    </WarmGround>
  );
};

export default Login;
