import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, type AppTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const themes: { key: AppTheme; label: string; emoji: string; description: string; preview: { bg: string; card: string; accent: string } }[] = [
  {
    key: 'light',
    label: 'Golden Morning',
    emoji: '☀️',
    description: 'Soft, golden, morning warmth',
    preview: { bg: '#fdf6ee', card: '#f7ede0', accent: '#c67a1a' },
  },
  {
    key: 'dark',
    label: 'After Sunset',
    emoji: '🌙',
    description: 'Deep, warm, campfire ambiance',
    preview: { bg: '#1a1008', card: '#261a0e', accent: '#e8922a' },
  },
  {
    key: 'evergreen',
    label: 'Through the Pines',
    emoji: '🌲',
    description: 'Dark silhouettes, blazing sky beyond',
    preview: { bg: '#0c0f0a', card: '#141a12', accent: '#d94a8c' },
  },
];

const SettingsPage = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto px-4 py-8"
    >
      <h1 className="font-display text-2xl text-foreground mb-6">⚙️ Settings</h1>

      {/* Theme picker */}
      <div className="mb-8">
        <p className="font-body text-sm text-muted-foreground mb-3">Theme</p>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => (
            <button
              key={t.key}
              onClick={() => setTheme(t.key)}
              className={`relative rounded-xl border-2 p-3 transition-all text-left ${
                theme === t.key
                  ? 'border-primary shadow-soft'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              {/* Mini preview */}
              <div
                className="rounded-lg h-16 mb-2 flex items-end p-2 gap-1"
                style={{ backgroundColor: t.preview.bg }}
              >
                <div
                  className="rounded h-6 flex-1"
                  style={{ backgroundColor: t.preview.card }}
                />
                <div
                  className="rounded h-4 w-4"
                  style={{ backgroundColor: t.preview.accent }}
                />
              </div>
              <p className="font-body text-xs font-medium text-foreground">
                {t.emoji} {t.label}
              </p>
              <p className="font-body text-[10px] text-muted-foreground leading-tight mt-0.5">
                {t.description}
              </p>
              {theme === t.key && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* YOUR CABIN */}
      <SettingsSection label="Your Cabin">
        <SettingsItem emoji="🏠" label="Edit Cabin" onClick={() => navigate('/cabin?edit=true')} />
        <SettingsItem emoji="🎨" label="My Designs" onClick={() => navigate('/settings/designs')} />
        <SettingsItem emoji="🏕️" label="Cabin Marketplace" onClick={() => navigate('/marketplace')} />
      </SettingsSection>

      {/* YOUR PRIVACY */}
      <SettingsSection label="Your Privacy">
        <SettingsItem emoji="🔒" label="Privacy Settings" onClick={() => navigate('/settings/privacy')} />
      </SettingsSection>

      {/* YOUR NOTIFICATIONS */}
      <SettingsSection label="Your Notifications">
        <SettingsItem emoji="🏮" label="Notification Settings" onClick={() => navigate('/settings/notifications')} />
      </SettingsSection>

      {/* YOUR ACCOUNT */}
      <SettingsSection label="Your Account">
        <SettingsItem emoji="🌲" label="Subscription" onClick={() => navigate('/settings/subscription')} />
        <SettingsItem emoji="💰" label="Payouts" onClick={() => navigate('/settings/payouts')} />
        <SettingsItem emoji="✉️" label="My Invites" onClick={() => navigate('/invites')} />
        <SettingsItem emoji="⭕" label="Circles" onClick={() => navigate('/circles')} />
      </SettingsSection>

      <div className="pt-4">
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

const SettingsSection = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="mb-6">
    <p className="font-display text-xs uppercase tracking-wide text-muted-foreground mb-2">{label}</p>
    <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
      {children}
    </div>
  </div>
);

const SettingsItem = ({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full text-left px-4 py-3 hover:bg-muted transition-colors font-body text-sm text-foreground flex items-center gap-2"
  >
    <span>{emoji}</span> {label}
  </button>
);

export default SettingsPage;
