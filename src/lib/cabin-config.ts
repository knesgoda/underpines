import type { AppTheme } from '@/contexts/ThemeContext';

export interface Atmosphere {
  key: string;
  label: string;
  background: string;
  cardBg: string;
  accent: string;
  text: string;
  border: string;
  description: string;
  free: boolean;
}

/** Theme-mapped cabin palettes — follow the app's active theme */
const themeAtmospheres: Record<AppTheme, Atmosphere> = {
  light: {
    key: 'theme-sync',
    label: 'Golden Morning',
    background: '#fdf6ee',
    cardBg: '#f7ede0',
    accent: '#c67a1a',
    text: '#2a1a0a',
    border: '#d4c0a8',
    description: 'Follows your app theme',
    free: true,
  },
  dark: {
    key: 'theme-sync',
    label: 'After Sunset',
    background: '#1a1008',
    cardBg: '#261a0e',
    accent: '#e8922a',
    text: '#f5ebe0',
    border: '#3d2c1a',
    description: 'Follows your app theme',
    free: true,
  },
  evergreen: {
    key: 'theme-sync',
    label: 'Through the Pines',
    background: '#0c0f0a',
    cardBg: '#141a12',
    accent: '#d94a8c',
    text: '#ede6e0',
    border: '#2a3424',
    description: 'Follows your app theme',
    free: true,
  },
};

export const atmospheres: Atmosphere[] = [
  {
    key: 'theme-sync',
    label: 'Match Theme',
    background: '#fdf6ee',
    cardBg: '#f7ede0',
    accent: '#c67a1a',
    text: '#2a1a0a',
    border: '#d4c0a8',
    description: 'Follows your app theme automatically',
    free: true,
  },
  {
    key: 'morning-mist',
    label: 'Morning Mist',
    background: '#f0fdf4',
    cardBg: '#ffffff',
    accent: '#16a34a',
    text: '#1e293b',
    border: '#dcfce7',
    description: 'Soft whites, pale greens — gentle',
    free: true,
  },
  {
    key: 'golden-hour',
    label: 'Golden Hour',
    background: '#fffbeb',
    cardBg: '#ffffff',
    accent: '#d97706',
    text: '#1c1917',
    border: '#fde68a',
    description: 'Warm ambers, long light',
    free: true,
  },
  {
    key: 'overcast',
    label: 'Overcast',
    background: '#f8fafc',
    cardBg: '#ffffff',
    accent: '#475569',
    text: '#1e293b',
    border: '#cbd5e1',
    description: 'Muted grays, melancholy',
    free: true,
  },
  {
    key: 'deep-woods',
    label: 'Deep Woods',
    background: '#052e16',
    cardBg: '#14532d',
    accent: '#4ade80',
    text: '#f0fdf4',
    border: '#166534',
    description: 'Dark greens, shadows, moody',
    free: false,
  },
  {
    key: 'first-snow',
    label: 'First Snow',
    background: '#f0f9ff',
    cardBg: '#ffffff',
    accent: '#0369a1',
    text: '#0c1a2e',
    border: '#bae6fd',
    description: 'Clean whites, cool blues',
    free: false,
  },
  {
    key: 'wildfire',
    label: 'Wildfire',
    background: '#1c0a00',
    cardBg: '#2c1008',
    accent: '#f97316',
    text: '#fef3c7',
    border: '#7c2d12',
    description: 'Deep oranges, dramatic',
    free: false,
  },
  {
    key: 'midnight',
    label: 'Midnight',
    background: '#020617',
    cardBg: '#0f172a',
    accent: '#818cf8',
    text: '#e2e8f0',
    border: '#1e293b',
    description: 'Stars, quiet intensity',
    free: false,
  },
  {
    key: 'bloom',
    label: 'Bloom',
    background: '#fdf4ff',
    cardBg: '#ffffff',
    accent: '#a21caf',
    text: '#1e1b4b',
    border: '#f0abfc',
    description: 'Pinks, soft purples, spring',
    free: false,
  },
];

export const getAtmosphere = (key: string, appTheme?: AppTheme): Atmosphere => {
  if (key === 'theme-sync' && appTheme) {
    return themeAtmospheres[appTheme];
  }
  return atmospheres.find(a => a.key === key) || (appTheme ? themeAtmospheres[appTheme] : atmospheres[1]);
};

export const cabinMoods = [
  { key: 'candle', emoji: '🕯️', label: 'Candle' },
  { key: 'rain', emoji: '🌧️', label: 'Rain cloud' },
  { key: 'sun', emoji: '☀️', label: 'Sun' },
  { key: 'fox', emoji: '🦊', label: 'Sleeping fox' },
  { key: 'book', emoji: '📖', label: 'Open book' },
  { key: 'coffee', emoji: '☕', label: 'Coffee cup' },
  { key: 'mountain', emoji: '⛰️', label: 'Mountain' },
  { key: 'moon', emoji: '🌙', label: 'Moon' },
];

export const accentColors = [
  '#16a34a', '#059669', '#0d9488', '#0891b2',
  '#0369a1', '#4f46e5', '#7c3aed', '#a21caf',
  '#db2777', '#dc2626', '#d97706', '#65a30d',
];
