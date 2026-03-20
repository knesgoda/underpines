import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type AppTheme = 'light' | 'dark' | 'evergreen';

interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  loaded: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
  loaded: false,
});

const STORAGE_KEY = 'underpines-theme';
const VALID_THEMES: AppTheme[] = ['light', 'dark', 'evergreen'];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<AppTheme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_THEMES.includes(stored as AppTheme)) return stored as AppTheme;
    return 'light';
  });
  const [loaded, setLoaded] = useState(false);

  // Load theme from Supabase profile on login
  useEffect(() => {
    if (!user) { setLoaded(true); return; }

    supabase
      .from('profiles')
      .select('theme')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.theme && VALID_THEMES.includes(data.theme as AppTheme)) {
          setThemeState(data.theme as AppTheme);
          localStorage.setItem(STORAGE_KEY, data.theme);
        }
        setLoaded(true);
      });
  }, [user]);

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark', 'theme-evergreen');
    root.classList.add(`theme-${theme}`);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (t: AppTheme) => {
    const prev = theme;
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);

    // Persist to Supabase
    if (user) {
      supabase
        .from('profiles')
        .update({ theme: t } as any)
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Theme save failed:', error);
            setThemeState(prev);
            localStorage.setItem(STORAGE_KEY, prev);
          }
        });
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, loaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
