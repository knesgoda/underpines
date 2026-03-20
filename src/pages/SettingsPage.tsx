import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const SettingsPage = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto px-4 py-8"
    >
      <h1 className="font-display text-2xl text-foreground mb-6">⚙️ Settings</h1>

      <div className="space-y-4">
        <button
          onClick={() => navigate('/invites')}
          className="w-full text-left px-4 py-3 rounded-xl bg-card border border-border hover:bg-muted transition-colors font-body text-sm text-foreground"
        >
          My Invites
        </button>
        <button
          onClick={() => navigate('/cabin?edit=true')}
          className="w-full text-left px-4 py-3 rounded-xl bg-card border border-border hover:bg-muted transition-colors font-body text-sm text-foreground"
        >
          Edit Cabin
        </button>
        <div className="h-px bg-border" />
        <Button
          variant="ghost"
          onClick={() => { signOut(); navigate('/'); }}
          className="text-destructive font-body text-sm"
        >
          Sign out
        </Button>
      </div>
    </motion.div>
  );
};

export default SettingsPage;
