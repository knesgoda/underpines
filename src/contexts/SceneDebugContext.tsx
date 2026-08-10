/**
 * SceneDebugContext — development-only override system for CabinScene.
 *
 * When overrides are active, real hooks (useSolarCycle, useWeather,
 * useWheelOfTheYear) are bypassed and the scene renders with injected values.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface SceneOverrides {
  active: boolean;

  // Solar / time
  timeOverride: number | null;        // 0–1439 (minutes since midnight)
  latitude: number | null;
  longitude: number | null;

  // Weather
  weatherCondition: string | null;    // 'clear' | 'rain' | etc.
  windSpeed: number | null;           // 0–100 km/h
  cloudCover: number | null;          // 0–100
  temperature: number | null;         // -20..45 °C

  // Biome
  biome: string | null;

  // Seasonal
  seasonalEvent: string | null;       // event key or null

  // Moon
  moonPhase: number | null;           // 0–1

  // Creature & companion triggers
  creatureTrigger: number;            // increment to force creature
  companionTriggers: Record<string, number>; // key → increment
}

const DEFAULT_OVERRIDES: SceneOverrides = {
  active: false,
  timeOverride: null,
  latitude: null,
  longitude: null,
  weatherCondition: null,
  windSpeed: null,
  cloudCover: null,
  temperature: null,
  biome: null,
  seasonalEvent: null,
  moonPhase: null,
  creatureTrigger: 0,
  companionTriggers: {},
};

interface SceneDebugContextType {
  overrides: SceneOverrides;
  setOverrides: (patch: Partial<SceneOverrides>) => void;
  resetOverrides: () => void;
  triggerCreature: () => void;
  triggerCompanion: (key: string) => void;
}

const SceneDebugContext = createContext<SceneDebugContextType | null>(null);

export function SceneDebugProvider({ children }: { children: ReactNode }) {
  const [overrides, setRaw] = useState<SceneOverrides>(DEFAULT_OVERRIDES);

  const setOverrides = useCallback((patch: Partial<SceneOverrides>) => {
    setRaw(prev => {
      const next = { ...prev, ...patch };
      // Auto-activate when any value is set
      const hasOverride = Object.entries(next).some(([k, v]) => {
        if (k === 'active' || k === 'creatureTrigger' || k === 'companionTriggers') return false;
        return v !== null;
      });
      return { ...next, active: hasOverride };
    });
  }, []);

  const resetOverrides = useCallback(() => setRaw(DEFAULT_OVERRIDES), []);

  const triggerCreature = useCallback(() => {
    setRaw(prev => ({ ...prev, creatureTrigger: prev.creatureTrigger + 1 }));
  }, []);

  const triggerCompanion = useCallback((key: string) => {
    setRaw(prev => ({
      ...prev,
      companionTriggers: {
        ...prev.companionTriggers,
        [key]: (prev.companionTriggers[key] || 0) + 1,
      },
    }));
  }, []);

  return (
    <SceneDebugContext.Provider value={{ overrides, setOverrides, resetOverrides, triggerCreature, triggerCompanion }}>
      {children}
    </SceneDebugContext.Provider>
  );
}

export function useSceneDebug(): SceneDebugContextType | null {
  return useContext(SceneDebugContext);
}

export default SceneDebugContext;
