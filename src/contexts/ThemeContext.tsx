import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useBootState } from '@/hooks/useBootState';

export type AppTheme = 'light' | 'dark';
export type MessengerSkin = 'pines' | 'icu' | 'bullseye' | 'emessen';

/**
 * A user-authored theme is a partial override of the role tokens defined in
 * index.css — `{ background: '41 100% 96%', primary: '12 77% 57%' }`. It is
 * applied as inline custom properties on <html>, layered over whichever
 * built-in theme class is active, so an override only has to name the tokens
 * it actually changes.
 *
 * Nothing writes these yet; the authoring UI arrives with the profile
 * customizer. The application path lives here so that work does not have to
 * reopen the theming layer.
 */
export type ThemeOverrides = Record<string, string>;

/** Shape read back from profiles. */
type StoredPrefs = { theme?: string | null; messenger_skin?: string | null };

interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  skin: MessengerSkin;
  setSkin: (s: MessengerSkin) => void;
  overrides: ThemeOverrides | null;
  setOverrides: (o: ThemeOverrides | null) => void;
  loaded: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
  skin: 'pines',
  setSkin: () => {},
  overrides: null,
  setOverrides: () => {},
  loaded: false,
});

const STORAGE_KEY = 'underpines-theme';
const SKIN_STORAGE_KEY = 'underpines-messenger-skin';

export const VALID_THEMES: AppTheme[] = ['light', 'dark'];
export const VALID_SKINS: MessengerSkin[] = ['pines', 'icu', 'bullseye', 'emessen'];

const readStoredTheme = (): AppTheme => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return VALID_THEMES.includes(stored as AppTheme) ? (stored as AppTheme) : 'light';
};

const readStoredSkin = (): MessengerSkin => {
  const stored = localStorage.getItem(SKIN_STORAGE_KEY);
  return VALID_SKINS.includes(stored as MessengerSkin) ? (stored as MessengerSkin) : 'pines';
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: boot, isLoading: bootLoading } = useBootState();
  const [theme, setThemeState] = useState<AppTheme>(readStoredTheme);
  const [skin, setSkinState] = useState<MessengerSkin>(readStoredSkin);
  const [overrides, setOverrides] = useState<ThemeOverrides | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Theme and skin arrive with the rest of the boot payload rather than from
  // a fourth independent read of `profiles`. Anything unrecognised — including
  // the retired 'evergreen' theme — falls back rather than being written back.
  useEffect(() => {
    if (!user) { setLoaded(true); return; }
    if (bootLoading) return;

    const storedTheme = boot?.profile?.theme as AppTheme | undefined;
    const storedSkin = boot?.profile?.messenger_skin as MessengerSkin | undefined;

    if (storedTheme && VALID_THEMES.includes(storedTheme)) {
      setThemeState(storedTheme);
      localStorage.setItem(STORAGE_KEY, storedTheme);
    }
    if (storedSkin && VALID_SKINS.includes(storedSkin)) {
      setSkinState(storedSkin);
      localStorage.setItem(SKIN_STORAGE_KEY, storedSkin);
    }
    setLoaded(true);
  }, [user, boot, bootLoading]);

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(`theme-${theme}`);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // Apply user overrides on top of the active theme class.
  useEffect(() => {
    const root = document.documentElement;
    const applied = Object.keys(overrides ?? {});
    applied.forEach(token => root.style.setProperty(`--${token}`, overrides![token]));
    return () => applied.forEach(token => root.style.removeProperty(`--${token}`));
  }, [overrides]);

  const setTheme = useCallback((next: AppTheme) => {
    const prev = theme;
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);

    if (user) {
      supabase
        .from('profiles')
        .update({ theme: next })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Theme save failed:', error);
            setThemeState(prev);
            localStorage.setItem(STORAGE_KEY, prev);
          }
        });
    }
  }, [theme, user]);

  const setSkin = useCallback((next: MessengerSkin) => {
    const prev = skin;
    setSkinState(next);
    localStorage.setItem(SKIN_STORAGE_KEY, next);

    if (user) {
      supabase
        .from('profiles')
        .update({ messenger_skin: next })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Skin save failed:', error);
            setSkinState(prev);
            localStorage.setItem(SKIN_STORAGE_KEY, prev);
          }
        });
    }
  }, [skin, user]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, skin, setSkin, overrides, setOverrides, loaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
