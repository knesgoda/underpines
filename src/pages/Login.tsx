import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import WeatherScene from '@/components/cabin/WeatherScene';

const Login = () => {
  const navigate = useNavigate();
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

    navigate('/cabin');
  };

  return (
    <div className="fixed inset-0 overflow-hidden">
      <WeatherScene hour={20} season="winter" />
      <div className="absolute inset-0" style={{ background: 'rgba(5, 46, 22, 0.65)' }} />

      <div className="relative z-10 flex items-center justify-center min-h-screen px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-sm"
        >
          <div
            className="rounded-2xl p-8"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <h2 className="text-2xl font-display text-pine-light text-center mb-8">
              Welcome back
            </h2>

            <div className="space-y-4">
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                className="h-12 rounded-xl bg-background/10 border-white/10 text-pine-light placeholder:text-pine-light/30 font-body"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  className="h-12 rounded-xl bg-background/10 border-white/10 text-pine-light placeholder:text-pine-light/30 font-body pr-12"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-pine-light/40 hover:text-pine-light/70 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              onClick={handleLogin}
              disabled={loading || !email || !password}
              className="w-full mt-6 rounded-pill h-12 text-base font-body bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
            >
              {loading ? 'Finding your Cabin...' : 'Sign in'}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
