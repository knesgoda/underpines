import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, type AppTheme, type MessengerSkin } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { editorReturnState } from '@/lib/editorReturn';
import { MARKETPLACE_ENABLED } from '@/lib/flags';
import { useIsMobile } from '@/hooks/use-mobile';
import SkinThumb from '@/components/campfire/SkinThumb';
import '@/styles/messenger-skins.css';

const themes: { key: AppTheme; label: string; emoji: string; description: string; preview: { bg: string; card: string; accent: string } }[] = [
  {
    key: 'light',
    label: 'Late Summer',
    emoji: '☀️',
    description: 'Warm cream, ink and ember',
    preview: { bg: '#fff8e9', card: '#fffdf7', accent: '#e65f3c' },
  },
  {
    key: 'dark',
    label: 'After Dark',
    emoji: '🌙',
    description: 'Night blues with the same ember',
    preview: { bg: '#171226', card: '#202942', accent: '#e65f3c' },
  },
];

const MESSENGER_SKINS: { key: MessengerSkin; label: string; description: string }[] = [
  { key: 'pines', label: 'Under Pines', description: 'Warm and current' },
  { key: 'icu', label: 'ICU', description: 'Late-90s utility green' },
  { key: 'bullseye', label: 'Bullseye', description: 'Buddy-list blue and grey' },
  { key: 'emessen', label: 'Emessen', description: 'Bubbly XP-era chrome' },
];

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme, skin, setSkin } = useTheme();
  const isMobile = useIsMobile();


  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto px-4 py-6 md:py-8"
    >
      {/* Mobile back button */}
      {isMobile && (
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground mb-4 -ml-1 min-h-[44px] min-w-[44px]"
        >
          <ArrowLeft size={18} />
          <span className="font-body text-sm">Back</span>
        </button>
      )}

      <h1 className="font-display text-2xl text-foreground mb-6">⚙️ Settings</h1>

      {/* Theme picker */}
      <div className="mb-8">
        <p className="font-body text-sm text-muted-foreground mb-3">Theme</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themes.map((t) => (
            <button
              key={t.key}
              onClick={() => setTheme(t.key)}
              className={`relative rounded-[5px] border-2 p-3 transition-all text-left ${
                theme === t.key
                  ? 'border-primary shadow-soft'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              {/* Mini preview */}
              <div
                className="rounded-[4px] h-16 mb-2 flex items-end p-2 gap-1"
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

      {/* MESSENGER SKIN */}
      <div className="px-4 pb-6">
        <p className="font-body text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
          Messenger skin
        </p>
        <div className="grid grid-cols-2 gap-2">
          {MESSENGER_SKINS.map(s => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSkin(s.key)}
              className={`rounded-[3px] border p-3 text-left transition-colors ${
                skin === s.key ? 'border-primary bg-secondary' : 'border-border bg-card hover:bg-secondary'
              }`}
              aria-pressed={skin === s.key}
            >
              <span className="flex items-center gap-2">
                <SkinThumb skin={s.key} />
                <span className="min-w-0">
                  <span className="block font-body text-sm text-foreground">{s.label}</span>
                  <span className="block font-body text-xs text-muted-foreground">{s.description}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* YOUR PAGE */}
      <SettingsSection label="Your page">
        <SettingsItem emoji="☺" label="My Page" onClick={() => navigate('/me')} />
        <SettingsItem emoji="✎" label="Edit my page" onClick={() => navigate('/me/edit', { state: editorReturnState() })} />
        <SettingsItem emoji="♫" label="Listening" onClick={() => navigate('/listening')} />
        {MARKETPLACE_ENABLED && (
          <SettingsItem emoji="🎨" label="My Designs" onClick={() => navigate('/settings/designs')} />
        )}
        {MARKETPLACE_ENABLED && (
          <SettingsItem emoji="🛍" label="Marketplace" onClick={() => navigate('/marketplace')} />
        )}
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
        <SettingsItem emoji="✉️" label="My Invites" onClick={() => navigate('/invites')} />
        <SettingsItem emoji="✿" label="Friends" onClick={() => navigate('/friends')} />
      </SettingsSection>

      {/* LEGAL */}
      <SettingsSection label="Legal">
        <SettingsItem emoji="🔏" label="Privacy Policy" onClick={() => navigate('/privacy')} />
        <SettingsItem emoji="📜" label="Terms of Service" onClick={() => navigate('/terms')} />
      </SettingsSection>

      {/* YOUR SESSION */}
      <SettingsSection label="Your Session">
        {user?.email && (
          <p className="px-4 py-3 font-body text-sm text-muted-foreground">
            Signed in as {user.email}
          </p>
        )}
        <button
          onClick={() => { signOut(); navigate('/'); }}
          className="w-full text-left px-4 py-3 hover:bg-muted transition-colors font-body text-sm font-medium text-destructive flex items-center gap-2 min-h-[44px]"
        >
          <span>⏻</span> Sign out of Under Pines
        </button>
      </SettingsSection>
      <div className="pb-8" />
    </motion.div>
  );
};

const SettingsSection = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="mb-6">
    <p className="font-body text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">{label}</p>
    <div className="rounded-[5px] border border-border bg-card shadow-panel overflow-hidden divide-y divide-border">

      {children}
    </div>
  </div>
);

const SettingsItem = ({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full text-left px-4 py-3 hover:bg-muted transition-colors font-body text-sm text-foreground flex items-center gap-2 min-h-[44px]"
  >
    <span>{emoji}</span> {label}
  </button>
);

export default SettingsPage;
