/**
 * Wheel of the Year — seasonal event engine for Under Pines.
 * Imports astronomical calculations from astronomyUtils.
 */

import { getSeasonalEventDate, getMoonPhase } from '@/lib/astronomyUtils';
import { useState, useEffect } from 'react';

// --- EXPORT 1 ---

export const WHEEL_OF_THE_YEAR = [
  {
    key: 'imbolc',
    glyph: '❄️',
    durationHours: 48,
    fadeOutHours: 6,
    sceneConfig: {
      primaryColor: '#b8cdb0',
      skyTop: '#dce8f0',
      skyBottom: '#e8f0e4',
      groundTop: '#e0e8d8',
      groundBottom: '#c8d8c0',
      accentColor: '#f5f0e8',
      particleColor: '#e8f0e4',
      textColor: 'dark',
      showMoon: true,
      moonDarkColor: '#c8d8e0',
      description: 'First light returning. Snowdrops. Candle in the window.',
    },
  },
  {
    key: 'ostara',
    glyph: '🌱',
    durationHours: 48,
    fadeOutHours: 6,
    sceneConfig: {
      primaryColor: '#7c9e5a',
      skyTop: '#a8cce0',
      skyBottom: '#d8eec8',
      groundTop: '#8ab84a',
      groundBottom: '#5a8a28',
      accentColor: '#f5e6c8',
      particleColor: '#f0c8d0',
      textColor: 'dark',
      showMoon: true,
      moonDarkColor: '#b8d0c8',
      description: 'Spring equinox. Budding branches. Robin on the fence.',
    },
  },
  {
    key: 'beltane',
    glyph: '🔥',
    durationHours: 48,
    fadeOutHours: 6,
    sceneConfig: {
      primaryColor: '#2d6a2d',
      skyTop: '#0a1408',
      skyBottom: '#1a3010',
      groundTop: '#1a4010',
      groundBottom: '#0a2008',
      accentColor: '#f07030',
      particleColor: '#f07030',
      textColor: 'light',
      showMoon: false,
      moonDarkColor: null,
      description: 'Fire festival. Bonfires at dusk. Hawthorn blossom.',
    },
  },
  {
    key: 'litha',
    glyph: '☀️',
    durationHours: 48,
    fadeOutHours: 6,
    sceneConfig: {
      primaryColor: '#d4a820',
      skyTop: '#f0c840',
      skyBottom: '#f8e890',
      groundTop: '#5aaa28',
      groundBottom: '#3a7818',
      accentColor: '#fff8d0',
      particleColor: '#f8f8a0',
      textColor: 'dark',
      showMoon: false,
      moonDarkColor: null,
      description: 'Summer solstice. Fireflies. Sun barely setting.',
    },
  },
  {
    key: 'lammas',
    glyph: '🌾',
    durationHours: 48,
    fadeOutHours: 6,
    sceneConfig: {
      primaryColor: '#c8902a',
      skyTop: '#d4a030',
      skyBottom: '#e8c870',
      groundTop: '#c89828',
      groundBottom: '#906818',
      accentColor: '#f8e8c0',
      particleColor: '#f0d080',
      textColor: 'dark',
      showMoon: true,
      moonDarkColor: '#c8a850',
      description: 'First harvest. Grain fields. Late summer haze.',
    },
  },
  {
    key: 'mabon',
    glyph: '🍂',
    durationHours: 48,
    fadeOutHours: 6,
    sceneConfig: {
      primaryColor: '#c04820',
      skyTop: '#604028',
      skyBottom: '#8a6040',
      groundTop: '#6a3810',
      groundBottom: '#3a1808',
      accentColor: '#f0a050',
      particleColor: '#d06020',
      textColor: 'light',
      showMoon: true,
      moonDarkColor: '#402818',
      description: 'Autumn equinox. Turning leaves. Balance before the dark.',
    },
  },
  {
    key: 'samhain',
    glyph: '🌑',
    durationHours: 48,
    fadeOutHours: 6,
    sceneConfig: {
      primaryColor: '#4a2060',
      skyTop: '#050208',
      skyBottom: '#0a0414',
      groundTop: '#140820',
      groundBottom: '#080410',
      accentColor: '#c04080',
      particleColor: '#ff6030',
      textColor: 'light',
      showMoon: true,
      moonDarkColor: '#08040c',
      description: 'The veil thins. Bare branches. Ember glow in the dark.',
    },
  },
  {
    key: 'yule',
    glyph: '🕯️',
    durationHours: 48,
    fadeOutHours: 6,
    sceneConfig: {
      primaryColor: '#1a2a3a',
      skyTop: '#040608',
      skyBottom: '#080c14',
      groundTop: '#e8f0f8',
      groundBottom: '#c8d8e8',
      accentColor: '#f8d870',
      particleColor: '#ffffff',
      textColor: 'light',
      showMoon: true,
      moonDarkColor: '#080c14',
      description: 'Winter solstice. Snow. Candlelight. Stars very bright.',
    },
  },
];

// --- EXPORT 2 ---

export function getActiveEvent(now = new Date()) {
  for (const event of WHEEL_OF_THE_YEAR) {
    const eventStart = getSeasonalEventDate(event.key, now.getFullYear());
    if (!eventStart) continue;
    const eventEnd = new Date(eventStart.getTime() + event.durationHours * 3600 * 1000);
    if (now >= eventStart && now < eventEnd) return event;
  }

  // Check previous year's Yule in case we're in early January
  const prevYuleStart = getSeasonalEventDate('yule', now.getFullYear() - 1);
  if (prevYuleStart) {
    const prevYuleEnd = new Date(prevYuleStart.getTime() + 48 * 3600 * 1000);
    if (now < prevYuleEnd) return WHEEL_OF_THE_YEAR.find(e => e.key === 'yule');
  }

  return null;
}

// --- EXPORT 3 ---

export function getEventProgress(event, now = new Date()) {
  const start = getSeasonalEventDate(event.key, now.getFullYear());
  const end = new Date(start.getTime() + event.durationHours * 3600 * 1000);
  const fadeOutStart = new Date(end.getTime() - event.fadeOutHours * 3600 * 1000);
  const riseEnd = new Date(start.getTime() + 3600 * 1000); // 1 hour rise

  if (now < riseEnd) {
    const opacity = (now - start) / (riseEnd - start);
    return { phase: 'rising', opacity: Math.max(0, Math.min(1, opacity)) };
  } else if (now < fadeOutStart) {
    return { phase: 'full', opacity: 1.0 };
  } else {
    const opacity = 1 - (now - fadeOutStart) / (end - fadeOutStart);
    return { phase: 'fading', opacity: Math.max(0, Math.min(1, opacity)) };
  }
}

// --- EXPORT 4 ---

export function injectSeasonalTokens(event) {
  document.documentElement.setAttribute('data-season', event.key);
  document.documentElement.style.setProperty('--seasonal-opacity', '0');
  requestAnimationFrame(() => {
    document.documentElement.style.setProperty('--seasonal-opacity', '1');
  });
}

// --- EXPORT 5 ---

export function removeSeasonalTokens() {
  document.documentElement.style.setProperty('--seasonal-opacity', '0');
  setTimeout(() => {
    document.documentElement.removeAttribute('data-season');
  }, 6000);
}

// --- EXPORT 6 ---

export function useWheelOfTheYear() {
  const [state, setState] = useState(() => {
    const now = new Date();
    const active = getActiveEvent(now);
    const moon = getMoonPhase(now);

    if (active) {
      injectSeasonalTokens(active);
      return { event: active, progress: getEventProgress(active, now), moonPhase: moon };
    }
    return { event: null, progress: { phase: 'none', opacity: 0 }, moonPhase: moon };
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const active = getActiveEvent(now);
      const moon = getMoonPhase(now);

      setState(prev => {
        const eventChanged = prev.event?.key !== active?.key;
        if (eventChanged) {
          if (active) injectSeasonalTokens(active);
          else removeSeasonalTokens();
        }
        return {
          event: active,
          progress: active ? getEventProgress(active, now) : { phase: 'none', opacity: 0 },
          moonPhase: moon,
        };
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return state;
}
