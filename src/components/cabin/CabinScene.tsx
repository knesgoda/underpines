/**
 * CabinScene — Fully illustrated header for every Cabin page.
 * 10 compositing layers stacked by z-index.
 * Now driven by useSolarCycle, useWeather, useWheelOfTheYear,
 * CreatureRenderer, CompanionRenderer, and resolveLocation.
 */

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import useSolarCycle from '@/hooks/useSolarCycle';
import { useWeather } from '@/hooks/useWeather';
import { useWheelOfTheYear, WHEEL_OF_THE_YEAR } from '@/lib/wheelOfTheYear';
import { useCompanions } from '@/hooks/useCompanions';
import { resolveLocation } from '@/lib/locationResolver';
import { useSceneDebug } from '@/contexts/SceneDebugContext';
import PrecipitationLayer from './PrecipitationLayer';
import { getBiomeConfig } from '@/config/biomes';
import CreatureRenderer from '@/components/creatures/CreatureRenderer';
import CompanionRenderer from '@/components/creatures/CompanionRenderer';

// ── Biome component imports ──
import { PNWBackground, PNWMidground, PNWForeground } from '@/components/biomes/PacificNorthwest';
import { CaliforniaSWBackground, CaliforniaSWMidground, CaliforniaSWForeground } from '@/components/biomes/CaliforniaSW';
import { NortheastBackground, NortheastMidground, NortheastForeground } from '@/components/biomes/Northeast';
import { SoutheastBackground, SoutheastMidground, SoutheastForeground } from '@/components/biomes/Southeast';
import { MidwestBackground, MidwestMidground, MidwestForeground } from '@/components/biomes/Midwest';
import { MountainWestBackground, MountainWestMidground, MountainWestForeground } from '@/components/biomes/MountainWest';
import { BritishIslesBackground, BritishIslesMidground, BritishIslesForeground } from '@/components/biomes/BritishIsles';
import { NordicBackground, NordicMidground, NordicForeground } from '@/components/biomes/Nordic';
import { MedBackground, MedMidground, MedForeground } from '@/components/biomes/Mediterranean';

type BiomeComponents = {
  Background: React.ComponentType<any>;
  Midground: React.ComponentType<any>;
  Foreground: React.ComponentType<any>;
};

const BIOME_COMPONENTS: Record<string, BiomeComponents> = {
  'pacific-northwest': { Background: PNWBackground, Midground: PNWMidground, Foreground: PNWForeground },
  'california-sw':     { Background: CaliforniaSWBackground, Midground: CaliforniaSWMidground, Foreground: CaliforniaSWForeground },
  'northeast':         { Background: NortheastBackground, Midground: NortheastMidground, Foreground: NortheastForeground },
  'southeast':         { Background: SoutheastBackground, Midground: SoutheastMidground, Foreground: SoutheastForeground },
  'midwest':           { Background: MidwestBackground, Midground: MidwestMidground, Foreground: MidwestForeground },
  'mountain-west':     { Background: MountainWestBackground, Midground: MountainWestMidground, Foreground: MountainWestForeground },
  'british-isles':     { Background: BritishIslesBackground, Midground: BritishIslesMidground, Foreground: BritishIslesForeground },
  'nordic':            { Background: NordicBackground, Midground: NordicMidground, Foreground: NordicForeground },
  'mediterranean':     { Background: MedBackground, Midground: MedMidground, Foreground: MedForeground },
};

// All recognized time-of-day values — kept granular for smooth transitions
type RenderTimeOfDay = 'night' | 'pre-dawn' | 'dawn' | 'morning' | 'afternoon' | 'golden-hour' | 'sunset' | 'dusk';
function toRenderTime(t: string): RenderTimeOfDay {
  const valid: RenderTimeOfDay[] = ['night','pre-dawn','dawn','morning','afternoon','golden-hour','sunset','dusk'];
  return (valid.includes(t as RenderTimeOfDay) ? t : 'morning') as RenderTimeOfDay;
}

interface CabinSceneProps {
  memberName: string;
  atmosphere?: string;
  moonPhase?: number;
  latitude?: number;
  longitude?: number;
  biome?: string;
  postalCode?: string;
  countryCode?: string;
  creatureKey?: string;
  userId?: string;
}

// Sky gradient stops as RGB arrays for interpolation
const SKY_STOPS: Record<RenderTimeOfDay, [number,number,number][]> = {
  night:        [[12,20,69],[26,26,62]],
  'pre-dawn':   [[20,22,58],[40,40,80],[100,130,180]],
  dawn:         [[26,26,62],[244,164,96],[135,206,235]],
  morning:      [[135,206,235],[176,212,241]],
  afternoon:    [[135,206,235],[107,179,224]],
  'golden-hour':[[244,164,96],[232,115,74],[139,71,137]],
  sunset:       [[200,120,80],[139,71,137],[45,27,78]],
  dusk:         [[139,71,137],[45,27,78],[12,20,69]],
};

function buildSkyGradient(tod: RenderTimeOfDay): string {
  const stops = SKY_STOPS[tod];
  const pcts = stops.map((_, i) => `${Math.round(i / (stops.length - 1) * 100)}%`);
  const parts = stops.map((s, i) => `rgb(${s[0]},${s[1]},${s[2]}) ${pcts[i]}`);
  return `linear-gradient(to bottom, ${parts.join(', ')})`;
}

// Filters for landscape/tree layers — night is very dark for silhouette effect
const TIME_FILTERS: Record<RenderTimeOfDay, { filter: string; treeFilter?: string; blendOverlay?: string }> = {
  night:        { filter: 'saturate(0.4) brightness(0.35)', treeFilter: 'brightness(0.3) saturate(0.4)' },
  'pre-dawn':   { filter: 'saturate(0.6) brightness(0.5)', treeFilter: 'brightness(0.4) saturate(0.5)', blendOverlay: 'rgba(80,100,160,0.1)' },
  dawn:         { filter: 'saturate(0.8) brightness(0.7)', blendOverlay: 'rgba(100,130,180,0.12)' },
  morning:      { filter: 'none' },
  afternoon:    { filter: 'none' },
  'golden-hour':{ filter: 'hue-rotate(-10deg) saturate(1.2) brightness(0.95)', blendOverlay: 'rgba(210,160,80,0.15)' },
  sunset:       { filter: 'saturate(0.8) brightness(0.7)', blendOverlay: 'rgba(200,120,60,0.12)' },
  dusk:         { filter: 'saturate(0.55) brightness(0.5)', treeFilter: 'brightness(0.4) saturate(0.5)' },
};

// Darken a hex color by ~15% for wet-ground effect
function darkenColor(hex: string): string {
  const m = hex.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  if (!m) return hex;
  const d = (v: string) => Math.max(0, Math.round(parseInt(v, 16) * 0.85)).toString(16).padStart(2, '0');
  return `#${d(m[1])}${d(m[2])}${d(m[3])}`;
}

const layerBase = 'absolute inset-0 w-full h-full';

// ─── Seeded random ───
function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

// ─── Stars ───
interface Star { cx: number; cy: number; r: number; delay: number; duration: number; color: string; }
const STARS: Star[] = (() => {
  const rand = seededRandom(42);
  const count = 60 + Math.floor(rand() * 21);
  return Array.from({ length: count }, () => ({
    cx: rand() * 100, cy: rand() * 70,
    r: 0.5 + rand() * 1.0,
    delay: rand() * 6, duration: 2 + rand() * 4,
    color: rand() > 0.7 ? '#fffde0' : '#ffffff',
  }));
})();

const SCENE_CSS = `
@keyframes cabin-twinkle {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
@keyframes tree-sway-light {
  0%, 100% { transform: rotate(var(--sway-base, 0deg)); }
  50% { transform: rotate(calc(var(--sway-base, 0deg) + var(--sway-max, 0.8deg))); }
}
@keyframes tree-sway-moderate {
  0%, 100% { transform: rotate(var(--sway-base, 0deg)); }
  50% { transform: rotate(calc(var(--sway-base, 0deg) + var(--sway-max, 2.5deg))); }
}
@keyframes canopy-flutter {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}
@keyframes tree-sway-strong {
  0%, 100% { transform: rotate(var(--sway-base, 0deg)); }
  50% { transform: rotate(calc(var(--sway-base, 0deg) + var(--sway-max, 5deg))); }
}
@keyframes tree-sway-extreme {
  0%, 100% { transform: rotate(calc(var(--lean, 3deg) + 0deg)); }
  50% { transform: rotate(calc(var(--lean, 3deg) + var(--sway-max, 8deg))); }
}
@keyframes leaf-drift-ltr {
  0% { transform: translate(-5%, 0) rotate(0deg); opacity: 0; }
  10% { opacity: 0.8; }
  90% { opacity: 0.6; }
  100% { transform: translate(110%, 15%) rotate(360deg); opacity: 0; }
}
@keyframes leaf-drift-rtl {
  0% { transform: translate(105%, 0) rotate(0deg); opacity: 0; }
  10% { opacity: 0.8; }
  90% { opacity: 0.6; }
  100% { transform: translate(-10%, 15%) rotate(-360deg); opacity: 0; }
}
@keyframes grass-sway {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(var(--grass-sway, 0deg)); }
}
@keyframes cloud-drift {
  0% { transform: translateX(110%); }
  100% { transform: translateX(-30%); }
}
@keyframes heat-shimmer {
  0%, 100% { transform: scaleY(1.0); }
  50% { transform: scaleY(1.003); }
}
/* Sun occlusion dimming */
.cabin-scene-root.sun-obscured [data-layer="sky-gradient"] {
  filter: saturate(0.85) !important;
}
.cabin-scene-root.sun-obscured .sun-glow-outer {
  r: 2.5 !important;
}
/* Lightning flash backlights trees */
.cabin-scene-root.lightning-flash [data-layer="midground-trees"],
.cabin-scene-root.lightning-flash [data-layer="foreground-elements"] {
  filter: brightness(1.8) !important;
  transition: filter 0ms !important;
}
`;

function Starfield({ opacity }: { opacity: number }) {
  if (opacity <= 0) return null;
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100"
      preserveAspectRatio="none" style={{ opacity, transition: 'opacity 1.5s ease' }}>
      {STARS.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r * 0.15} fill={s.color}
          style={{ animation: `cabin-twinkle ${s.duration}s ease-in-out infinite`, animationDelay: `${s.delay}s` }} />
      ))}
    </svg>
  );
}

// ─── Sun ───
function SunRenderer({ sunPosition, sunObscured }: { sunPosition: number | null; sunObscured: boolean }) {
  if (sunPosition === null) return null;

  const horizonY = 65;
  const maxHeight = 50;
  const sunR = 2.5;
  const x = 5 + sunPosition * 90;
  const y = horizonY - Math.sin(sunPosition * Math.PI) * maxHeight;

  let glowOpacity = 0;
  if (sunPosition < 0.15) {
    glowOpacity = 1 - sunPosition / 0.15;
  } else if (sunPosition > 0.85) {
    glowOpacity = (sunPosition - 0.85) / 0.15;
  }

  const glowR = sunObscured ? sunR * 1 : sunR * 3;

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100"
      preserveAspectRatio="none">
      <defs>
        <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff4c4" stopOpacity="1" />
          <stop offset="33%" stopColor="#fff4c4" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#fff4c4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="horizon-sun-glow" cx="50%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#f4a460" stopOpacity="0.7" />
          <stop offset="40%" stopColor="#e8734a" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#e8734a" stopOpacity="0" />
        </radialGradient>
      </defs>
      {glowOpacity > 0 && (
        <ellipse cx={x} cy={horizonY} rx={15} ry={6}
          fill="url(#horizon-sun-glow)"
          opacity={glowOpacity * 0.8}
          style={{ transition: 'cx 60s linear, opacity 60s linear' }} />
      )}
      <circle className="sun-glow-outer" cx={x} cy={y} r={glowR} fill="url(#sun-glow)"
        style={{ transition: 'cx 60s linear, cy 60s linear, r 1.5s ease' }} />
      <circle cx={x} cy={y} r={sunR} fill="#fff4c4"
        style={{ transition: 'cx 60s linear, cy 60s linear' }} />
    </svg>
  );
}
// ─── Moon ───
// Moon opacity by time-of-day for smooth transitions
function getMoonOpacity(renderTime: RenderTimeOfDay, moonPhase: number): number {
  const isBright = moonPhase >= 0.3 && moonPhase <= 0.7;
  switch (renderTime) {
    case 'night': return 1;
    case 'dusk': return 0.85;
    case 'sunset': return 0.5;
    case 'pre-dawn': return 0.6;
    case 'dawn': return isBright ? 0.15 : 0;
    case 'morning': case 'afternoon': return isBright ? 0.2 : 0;
    case 'golden-hour': return isBright ? 0.15 : 0;
    default: return 0;
  }
}

function MoonPhaseRenderer({ moonPhase, moonPosition, renderTime }: {
  moonPhase: number; moonPosition: number | null; renderTime: RenderTimeOfDay;
}) {
  const moonOpacity = getMoonOpacity(renderTime, moonPhase);
  if (moonOpacity <= 0) return null;

  const moonR = 2;
  // Arc position: if moonPosition available, trace arc like sun; else fixed position
  const horizonY = 65;
  const maxHeight = 45;
  let cx: number, cy: number;

  if (moonPosition !== null && moonPosition >= 0 && moonPosition <= 1) {
    cx = 5 + moonPosition * 90;
    cy = horizonY - Math.sin(moonPosition * Math.PI) * maxHeight;
  } else {
    // Fallback: upper-right for transition phases
    cx = 82;
    cy = 18;
  }

  const normalizedPhase = moonPhase <= 0.5 ? moonPhase * 2 : (1 - moonPhase) * 2;
  const shadowOffsetX = (1 - normalizedPhase) * moonR * 1.6;
  const isWaxing = moonPhase <= 0.5;
  const shadowCx = isWaxing ? cx - shadowOffsetX : cx + shadowOffsetX;

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100"
      preserveAspectRatio="none" style={{
        opacity: moonOpacity,
        transition: 'opacity 3s ease',
      }}>
      <defs>
        <clipPath id="cabin-moon-clip"><circle cx={cx} cy={cy} r={moonR} /></clipPath>
        <radialGradient id="cabin-moon-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f5f0c1" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#f5f0c1" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={moonR * 2} fill="url(#cabin-moon-glow)"
        style={{ transition: 'cx 60s linear, cy 60s linear' }} />
      <circle cx={cx} cy={cy} r={moonR} fill="#f5f0c1"
        style={{ transition: 'cx 60s linear, cy 60s linear' }} />
      {normalizedPhase < 0.98 && (
        <circle cx={shadowCx} cy={cy} r={moonR} fill="#0c1445"
          clipPath="url(#cabin-moon-clip)" opacity={0.92}
          style={{ transition: 'cx 60s linear' }} />
      )}
    </svg>
  );
}

// ─── Background Hills (Layer 2) ───
function BackgroundHills({ renderTime }: { renderTime: RenderTimeOfDay }) {
  const tf = TIME_FILTERS[renderTime];
  const showHorizonGlow = renderTime === 'dawn' || renderTime === 'golden-hour' || renderTime === 'pre-dawn' || renderTime === 'sunset';

  return (
    <div className="absolute inset-0 w-full h-full" style={{ filter: tf.filter, transition: 'filter 3s ease' }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 333"
        preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="horizon-glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f4a460" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f4a460" stopOpacity="0" />
          </linearGradient>
        </defs>
        {showHorizonGlow && (
          <rect x="0" y="214" width="1000" height="4" fill="url(#horizon-glow)" opacity="0.7" />
        )}
        <path d="M0,250 C100,215 200,230 300,218 C400,206 500,225 600,210 C700,195 800,220 900,208 C950,202 1000,215 1000,215 L1000,333 L0,333 Z"
          fill="var(--biome-bg-far, #7a9a8a)" opacity="0.6" />
        <path d="M0,270 C80,248 180,260 280,245 C380,230 450,255 560,240 C670,225 780,250 880,238 C940,232 1000,245 1000,245 L1000,333 L0,333 Z"
          fill="var(--biome-bg-mid, #4a7c59)" opacity="0.8" />
        <path d="M0,285 C120,268 220,278 340,265 C460,252 540,272 660,260 C780,248 880,268 1000,258 L1000,333 L0,333 Z"
          fill="var(--biome-bg-near, #3a6b48)" opacity="0.9" />
      </svg>
      {tf.blendOverlay && (
        <div className="absolute inset-0" style={{ backgroundColor: tf.blendOverlay, mixBlendMode: 'multiply' }} />
      )}
    </div>
  );
}

// ─── Foreground Ground (Layer 8) ───
function ForegroundGround({ renderTime, windIntensity }: { renderTime: RenderTimeOfDay; windIntensity: string }) {
  const tf = TIME_FILTERS[renderTime];
  const isNight = renderTime === 'night';
  const groundColor = isNight ? '#1a2e1a' : 'var(--biome-fg-ground, #2d5a3d)';
  const grassColor = isNight ? '#1a2e1a' : 'var(--biome-fg-ground, #3a7a4a)';

  const grassSwayMap: Record<string, string> = {
    calm: '0deg', light: '0.4deg', moderate: '1.2deg', strong: '2.5deg', extreme: '4deg',
  };
  const grassDuration: Record<string, string> = {
    calm: '0s', light: '4s', moderate: '2.5s', strong: '1.5s', extreme: '1s',
  };

  const grassSpikes = useMemo(() => {
    const rand = seededRandom(77);
    const spikes: string[] = [];
    let x = 0;
    while (x < 1000) {
      const spikeH = 3 + rand() * 3;
      const spikeW = 1.5 + rand() * 2;
      spikes.push(`L${x},${85 - spikeH} L${x + spikeW},85`);
      x += 2 + rand() * 5;
    }
    return spikes.join(' ');
  }, []);

  const grassAnim = windIntensity !== 'calm'
    ? `grass-sway ${grassDuration[windIntensity] || '4s'} ease-in-out infinite`
    : 'none';

  return (
    <div className="absolute inset-0 w-full h-full" style={{
      filter: tf.filter, transition: 'filter 3s ease',
      '--grass-sway': grassSwayMap[windIntensity] || '0deg',
    } as React.CSSProperties}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 100"
        preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <g style={{ transformOrigin: '500px 85px', animation: grassAnim }}>
          <path d={`M0,85 ${grassSpikes} L1000,85 L1000,85 L0,85 Z`}
            fill={grassColor} opacity="0.7" style={{ transition: 'fill 3s ease' }} />
        </g>
        <path d="M0,85 C100,83 250,86 400,84 C550,82 700,86 850,84 C950,83 1000,85 1000,85 L1000,100 L0,100 Z"
          fill={groundColor} style={{ transition: 'fill 3s ease' }} />
      </svg>
      {tf.blendOverlay && (
        <div className="absolute inset-0" style={{ backgroundColor: tf.blendOverlay, mixBlendMode: 'multiply' }} />
      )}
    </div>
  );
}

// ─── Wind sway style helper ───
function getTreeSwayStyle(windIntensity: string, index: number, fromLeft: boolean): React.CSSProperties {
  const rand = seededRandom(index * 137 + 42);
  const delayOffset = 100 + rand() * 300; // 100-400ms
  const rotVariance = (rand() - 0.5) * 1; // ±0.5deg

  const leanDir = fromLeft ? 1 : -1;

  const configs: Record<string, { anim: string; dur: number; maxRot: number; lean: number }> = {
    calm:     { anim: 'none', dur: 0, maxRot: 0, lean: 0 },
    light:    { anim: 'tree-sway-light', dur: 4, maxRot: 0.8, lean: 0 },
    moderate: { anim: 'tree-sway-moderate', dur: 2.5, maxRot: 2.5, lean: 0 },
    strong:   { anim: 'tree-sway-strong', dur: 1.5, maxRot: 5, lean: 0 },
    extreme:  { anim: 'tree-sway-extreme', dur: 1, maxRot: 8, lean: 3 },
  };

  const cfg = configs[windIntensity] || configs.calm;
  if (cfg.anim === 'none') return {};

  return {
    '--sway-max': `${(cfg.maxRot + rotVariance) * leanDir}deg`,
    '--sway-base': '0deg',
    '--lean': `${cfg.lean * leanDir}deg`,
    animation: `${cfg.anim} ${cfg.dur}s ease-in-out infinite`,
    animationDelay: `${delayOffset}ms`,
  } as React.CSSProperties;
}

// ─── Midground Trees (Layer 5) ───
function MidgroundTrees({ renderTime, isGoldenHour, windIntensity, fromLeft }: {
  renderTime: RenderTimeOfDay; isGoldenHour: boolean; windIntensity: string; fromLeft: boolean;
}) {
  const tf = TIME_FILTERS[renderTime];
  const treeFilter = isGoldenHour ? 'hue-rotate(-10deg) saturate(1.2)' : (tf.treeFilter || tf.filter);

  const trees = [
    { x: 120, groundY: 72, scale: 0.7, type: 'conifer-a' },
    { x: 310, groundY: 70, scale: 1.0, type: 'conifer-b' },
    { x: 680, groundY: 71, scale: 0.85, type: 'conifer-a' },
    { x: 850, groundY: 73, scale: 0.6, type: 'conifer-c' },
    { x: 200, groundY: 71, scale: 0.8, type: 'deciduous-a' },
    { x: 500, groundY: 69, scale: 1.1, type: 'deciduous-b' },
    { x: 760, groundY: 72, scale: 0.75, type: 'deciduous-a' },
  ];

  const renderCanopy = (type: string, cx: number, baseY: number, s: number, treeIndex: number) => {
    const canopyColor = 'var(--biome-canopy, #3a7d44)';
    const trunkColor = 'var(--biome-trunk, #5c4033)';
    const swayStyle = getTreeSwayStyle(windIntensity, treeIndex, fromLeft);
    const flutterAnim = (windIntensity === 'moderate' || windIntensity === 'strong' || windIntensity === 'extreme')
      ? { animation: `canopy-flutter ${windIntensity === 'moderate' ? '3s' : '2s'} ease-in-out infinite`, animationDelay: `${treeIndex * 200}ms` }
      : {};

    switch (type) {
      case 'conifer-a':
        return (
          <g className="tree-sway" style={{ transformOrigin: `${cx}px ${baseY}px`, ...swayStyle }}>
            <rect x={cx - 1.2 * s} y={baseY - 18 * s} width={2.4 * s} height={18 * s} fill={trunkColor} rx={0.5} />
            <path style={flutterAnim} d={`M${cx},${baseY - 38 * s} C${cx + 2 * s},${baseY - 34 * s} ${cx + 8 * s},${baseY - 28 * s} ${cx + 10 * s},${baseY - 22 * s} C${cx + 7 * s},${baseY - 20 * s} ${cx + 11 * s},${baseY - 14 * s} ${cx + 12 * s},${baseY - 8 * s} L${cx - 12 * s},${baseY - 8 * s} C${cx - 11 * s},${baseY - 14 * s} ${cx - 7 * s},${baseY - 20 * s} ${cx - 10 * s},${baseY - 22 * s} C${cx - 8 * s},${baseY - 28 * s} ${cx - 2 * s},${baseY - 34 * s} ${cx},${baseY - 38 * s}Z`} fill={canopyColor} />
          </g>
        );
      case 'conifer-b':
        return (
          <g className="tree-sway" style={{ transformOrigin: `${cx}px ${baseY}px`, ...swayStyle }}>
            <rect x={cx - 1.5 * s} y={baseY - 20 * s} width={3 * s} height={20 * s} fill={trunkColor} rx={0.6} />
            <path style={flutterAnim} d={`M${cx},${baseY - 44 * s} C${cx + 3 * s},${baseY - 38 * s} ${cx + 6 * s},${baseY - 32 * s} ${cx + 9 * s},${baseY - 26 * s} C${cx + 6 * s},${baseY - 24 * s} ${cx + 10 * s},${baseY - 18 * s} ${cx + 13 * s},${baseY - 10 * s} C${cx + 10 * s},${baseY - 9 * s} ${cx + 14 * s},${baseY - 4 * s} ${cx + 14 * s},${baseY - 4 * s} L${cx - 14 * s},${baseY - 4 * s} C${cx - 14 * s},${baseY - 4 * s} ${cx - 10 * s},${baseY - 9 * s} ${cx - 13 * s},${baseY - 10 * s} C${cx - 10 * s},${baseY - 18 * s} ${cx - 6 * s},${baseY - 24 * s} ${cx - 9 * s},${baseY - 26 * s} C${cx - 6 * s},${baseY - 32 * s} ${cx - 3 * s},${baseY - 38 * s} ${cx},${baseY - 44 * s}Z`} fill={canopyColor} />
          </g>
        );
      case 'conifer-c':
        return (
          <g className="tree-sway" style={{ transformOrigin: `${cx}px ${baseY}px`, ...swayStyle }}>
            <rect x={cx - 1 * s} y={baseY - 14 * s} width={2 * s} height={14 * s} fill={trunkColor} rx={0.4} />
            <path style={flutterAnim} d={`M${cx},${baseY - 30 * s} C${cx + 2 * s},${baseY - 26 * s} ${cx + 7 * s},${baseY - 18 * s} ${cx + 8 * s},${baseY - 12 * s} L${cx - 8 * s},${baseY - 12 * s} C${cx - 7 * s},${baseY - 18 * s} ${cx - 2 * s},${baseY - 26 * s} ${cx},${baseY - 30 * s}Z`} fill={canopyColor} />
          </g>
        );
      case 'deciduous-a':
        return (
          <g className="tree-sway" style={{ transformOrigin: `${cx}px ${baseY}px`, ...swayStyle }}>
            <rect x={cx - 1.5 * s} y={baseY - 16 * s} width={3 * s} height={16 * s} fill={trunkColor} rx={0.6} />
            <path style={flutterAnim} d={`M${cx - 14 * s},${baseY - 20 * s} C${cx - 16 * s},${baseY - 28 * s} ${cx - 12 * s},${baseY - 36 * s} ${cx - 6 * s},${baseY - 38 * s} C${cx - 3 * s},${baseY - 42 * s} ${cx + 3 * s},${baseY - 42 * s} ${cx + 6 * s},${baseY - 38 * s} C${cx + 12 * s},${baseY - 36 * s} ${cx + 16 * s},${baseY - 28 * s} ${cx + 14 * s},${baseY - 20 * s} C${cx + 12 * s},${baseY - 16 * s} ${cx - 12 * s},${baseY - 16 * s} ${cx - 14 * s},${baseY - 20 * s}Z`} fill={canopyColor} />
          </g>
        );
      case 'deciduous-b':
        return (
          <g className="tree-sway" style={{ transformOrigin: `${cx}px ${baseY}px`, ...swayStyle }}>
            <rect x={cx - 2 * s} y={baseY - 18 * s} width={4 * s} height={18 * s} fill={trunkColor} rx={0.8} />
            <path style={flutterAnim} d={`M${cx - 16 * s},${baseY - 22 * s} C${cx - 18 * s},${baseY - 30 * s} ${cx - 14 * s},${baseY - 40 * s} ${cx - 4 * s},${baseY - 44 * s} C${cx},${baseY - 46 * s} ${cx + 4 * s},${baseY - 44 * s} ${cx + 8 * s},${baseY - 42 * s} C${cx + 14 * s},${baseY - 38 * s} ${cx + 18 * s},${baseY - 30 * s} ${cx + 16 * s},${baseY - 22 * s} C${cx + 14 * s},${baseY - 18 * s} ${cx - 14 * s},${baseY - 18 * s} ${cx - 16 * s},${baseY - 22 * s}Z`} fill={canopyColor} />
          </g>
        );
      default: return null;
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full" style={{ filter: treeFilter, transition: 'filter 2s ease' }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 100"
        preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        {trees.map((t, i) => (
          <g key={i}>{renderCanopy(t.type, t.x, t.groundY, t.scale, i)}</g>
        ))}
      </svg>
    </div>
  );
}

// ─── Foreground Framing Trees (Layer 8) ───
function ForegroundTrees({ renderTime, isGoldenHour, windIntensity, fromLeft }: {
  renderTime: RenderTimeOfDay; isGoldenHour: boolean; windIntensity: string; fromLeft: boolean;
}) {
  const tf = TIME_FILTERS[renderTime];
  const treeFilter = isGoldenHour ? 'hue-rotate(-10deg) saturate(1.2)' : (tf.treeFilter || tf.filter);
  const darkCanopy = '#2a5a30';
  const darkTrunk = '#3a2a1a';

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 100"
      preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: treeFilter, transition: 'filter 2s ease' }}>
      <g className="tree-sway" style={{ transformOrigin: '40px 100px', ...getTreeSwayStyle(windIntensity, 10, fromLeft) }}>
        <rect x={30} y={20} width={8} height={80} fill={darkTrunk} rx={2} />
        <path d="M34,0 C40,-2 56,8 60,18 C58,20 64,28 66,36 C62,38 68,48 68,56 L0,56 C0,48 6,38 2,36 C4,28 10,20 8,18 C12,8 28,-2 34,0Z" fill={darkCanopy} opacity="0.9" />
      </g>
      <g className="tree-sway" style={{ transformOrigin: '960px 100px', ...getTreeSwayStyle(windIntensity, 11, fromLeft) }}>
        <rect x={956} y={25} width={7} height={75} fill={darkTrunk} rx={2} />
        <path d="M960,5 C968,2 982,10 988,22 C994,30 996,40 992,48 C988,54 980,58 972,56 C964,58 950,52 946,44 C942,36 944,24 950,14 C952,10 956,6 960,5Z" fill={darkCanopy} opacity="0.85" />
      </g>
      <g className="tree-sway" style={{ transformOrigin: '920px 100px', ...getTreeSwayStyle(windIntensity, 12, fromLeft) }}>
        <rect x={917} y={40} width={5} height={60} fill={darkTrunk} rx={1.5} />
        <path d="M920,12 C924,16 934,28 936,38 C932,40 938,50 938,56 L902,56 C902,50 908,40 904,38 C906,28 916,16 920,12Z" fill={darkCanopy} opacity="0.8" />
      </g>
    </svg>
  );
}

// ─── Wind Debris Leaves ───
function WindDebris({ windIntensity, fromLeft }: { windIntensity: string; fromLeft: boolean }) {
  const showDebris = windIntensity === 'strong' || windIntensity === 'extreme';
  if (!showDebris) return null;

  const count = windIntensity === 'extreme' ? 7 : 4;
  const driftAnim = fromLeft ? 'leaf-drift-ltr' : 'leaf-drift-rtl';
  const rand = seededRandom(99);

  const leaves = Array.from({ length: count }, (_, i) => ({
    y: 20 + rand() * 50,
    size: 1 + rand() * 1.5,
    duration: 3 + rand() * 4,
    delay: rand() * 6,
    color: rand() > 0.5 ? 'var(--biome-canopy, #3a7d44)' : 'var(--biome-trunk, #5c4033)',
  }));

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100"
      preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
      {leaves.map((l, i) => (
        <ellipse key={i} cx={50} cy={l.y} rx={l.size * 0.6} ry={l.size * 0.3}
          fill={l.color} opacity="0.7"
          style={{
            animation: `${driftAnim} ${l.duration}s linear infinite`,
            animationDelay: `${l.delay}s`,
          }} />
      ))}
    </svg>
  );
}

// ─── Cloud Layer ───
interface CloudDef {
  variant: 'wispy' | 'puffy' | 'heavy';
  y: number;       // % from top (0-40)
  opacity: number;  // 0.7-0.95
  delay: number;    // animation-delay in seconds
  scale: number;    // size multiplier
}

function generateClouds(cloudCover: number): CloudDef[] {
  let count = 0;
  let variants: Array<'wispy' | 'puffy' | 'heavy'> = [];

  if (cloudCover <= 10) return [];
  if (cloudCover <= 30) { count = 1 + Math.round(Math.random()); variants = ['wispy']; }
  else if (cloudCover <= 60) { count = 3 + Math.round(Math.random()); variants = ['wispy', 'puffy']; }
  else if (cloudCover <= 80) { count = 5 + Math.round(Math.random()); variants = ['puffy', 'heavy', 'puffy']; }
  else { count = 7 + Math.round(Math.random()); variants = ['heavy', 'heavy', 'puffy']; }

  const rand = seededRandom(cloudCover * 7 + 13);
  return Array.from({ length: count }, (_, i) => ({
    variant: variants[i % variants.length],
    y: 3 + rand() * 35,
    opacity: 0.7 + rand() * 0.25,
    delay: rand() * 60,
    scale: 0.7 + rand() * 0.6,
  }));
}

const WIND_SPEED_MAP: Record<string, number> = {
  calm: 120, light: 80, moderate: 45, strong: 20, extreme: 10,
};

function CloudShape({ variant, isNight }: { variant: 'wispy' | 'puffy' | 'heavy'; isNight: boolean }) {
  const fill = isNight ? '#3a3a5a' : '#f0f0f0';
  const fill2 = isNight ? '#2e2e4a' : '#e8e8e8';
  const fill3 = isNight ? '#34345a' : '#e0e0e0';

  switch (variant) {
    case 'wispy':
      return (
        <g>
          <ellipse cx="30" cy="14" rx="22" ry="7" fill={fill} />
          <ellipse cx="50" cy="12" rx="16" ry="5" fill={fill2} />
        </g>
      );
    case 'puffy':
      return (
        <g>
          <ellipse cx="30" cy="18" rx="24" ry="10" fill={fill} />
          <ellipse cx="50" cy="14" rx="20" ry="12" fill={fill2} />
          <ellipse cx="40" cy="10" rx="16" ry="9" fill={fill} />
          <ellipse cx="55" cy="18" rx="14" ry="8" fill={fill3} />
        </g>
      );
    case 'heavy':
      return (
        <g>
          <ellipse cx="40" cy="20" rx="35" ry="14" fill={fill} />
          <ellipse cx="60" cy="16" rx="28" ry="13" fill={fill2} />
          <ellipse cx="30" cy="14" rx="22" ry="11" fill={fill} />
          <ellipse cx="55" cy="10" rx="20" ry="10" fill={fill3} />
          <ellipse cx="70" cy="20" rx="18" ry="10" fill={fill} />
        </g>
      );
  }
}

function CloudLayer({ cloudCover, windIntensity, renderTime }: {
  cloudCover: number; windIntensity: string; renderTime: RenderTimeOfDay;
}) {
  const isNight = renderTime === 'night' || renderTime === 'dusk';
  const clouds = useMemo(() => generateClouds(cloudCover), [cloudCover]);
  const duration = WIND_SPEED_MAP[windIntensity] || 120;

  if (clouds.length === 0) return null;

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {clouds.map((c, i) => (
        <svg
          key={i}
          data-cloud
          className="absolute"
          viewBox="0 0 100 30"
          preserveAspectRatio="xMidYMid meet"
          style={{
            width: `${12 * c.scale}%`,
            height: 'auto',
            top: `${c.y}%`,
            left: 0,
            opacity: isNight ? c.opacity * 0.5 : c.opacity,
            animation: `cloud-drift ${duration + i * 5}s linear infinite`,
            animationDelay: `${-c.delay}s`,
            pointerEvents: 'none',
            transition: 'opacity 1.5s ease',
          }}
        >
          <CloudShape variant={c.variant} isNight={isNight} />
        </svg>
      ))}
    </div>
  );
}

// ─── Main Component ───
// ── Atmosphere wash tints ───
const ATMOSPHERE_TINTS: Record<string, { tint: string; opacity: number }> = {
  'morning-mist':   { tint: '#dcfce7', opacity: 0.08 },
  'golden-hour':    { tint: '#fef3c7', opacity: 0.10 },
  'twilight':       { tint: '#c4b5fd', opacity: 0.08 },
  'midnight':       { tint: '#1e1b4b', opacity: 0.12 },
  'overcast':       { tint: '#d1d5db', opacity: 0.06 },
  'warm-hearth':    { tint: '#fed7aa', opacity: 0.09 },
  'frost':          { tint: '#e0f2fe', opacity: 0.07 },
  'autumn-amber':   { tint: '#fbbf24', opacity: 0.08 },
};

const CabinScene = ({ memberName, atmosphere = 'morning-mist', moonPhase = 0.5, latitude, longitude, biome: biomeProp, postalCode, countryCode, creatureKey, userId }: CabinSceneProps) => {
  const debug = useSceneDebug();
  const dbg = debug?.overrides;

  // ── Location resolution ──
  const [resolvedLocation, setResolvedLocation] = useState<{ latitude: number; longitude: number; countryCode: string; biome: string } | null>(null);

  useEffect(() => {
    if (postalCode) {
      resolveLocation(postalCode, countryCode).then(result => {
        // If a biome is already stored on the profile, prefer it
        if (biomeProp && biomeProp !== 'default') {
          setResolvedLocation({ ...result, biome: biomeProp });
        } else {
          setResolvedLocation(result);
        }
      });
    } else if (latitude != null && longitude != null) {
      setResolvedLocation({ latitude, longitude, countryCode: countryCode || 'US', biome: biomeProp || 'default' });
    } else {
      setResolvedLocation({ latitude: 47.6, longitude: -122.3, countryCode: 'US', biome: biomeProp || 'default' });
    }
  }, [postalCode, countryCode, latitude, longitude, biomeProp]);

  const lat = dbg?.latitude ?? resolvedLocation?.latitude ?? 47.6;
  const lng = dbg?.longitude ?? resolvedLocation?.longitude ?? -122.3;
  const resolvedBiome = dbg?.biome || resolvedLocation?.biome || biomeProp || 'default';

  const biomeConfig = useMemo(() => getBiomeConfig(resolvedBiome), [resolvedBiome]);
  const solarRaw = useSolarCycle(lat, lng);
  const weatherRaw = useWeather(lat, lng);
  const seasonalRaw = useWheelOfTheYear();
  const { companions, markDailyVisitComplete, markPassingComplete } = useCompanions(userId, { isViewingCabin: true });

  // ── Apply debug overrides ──
  const solar = useMemo(() => {
    if (!dbg?.active || dbg.timeOverride == null) return solarRaw;
    const mins = dbg.timeOverride;
    const h = mins / 60;
    let tod: string;
    if (h < 5) tod = 'night';
    else if (h < 6) tod = 'pre-dawn';
    else if (h < 7.5) tod = 'dawn';
    else if (h < 12) tod = 'morning';
    else if (h < 16.5) tod = 'afternoon';
    else if (h < 18) tod = 'golden-hour';
    else if (h < 19.5) tod = 'sunset';
    else if (h < 20.5) tod = 'dusk';
    else tod = 'night';
    return { ...solarRaw, timeOfDay: tod, goldenHourProgress: tod === 'golden-hour' ? 0.5 : null };
  }, [solarRaw, dbg?.active, dbg?.timeOverride]);

  const weather = useMemo(() => {
    if (!dbg?.active) return weatherRaw;
    return {
      ...weatherRaw,
      ...(dbg.weatherCondition != null ? { condition: dbg.weatherCondition, isRaining: dbg.weatherCondition.includes('rain'), isSnowing: dbg.weatherCondition.includes('snow') } : {}),
      ...(dbg.windSpeed != null ? { windSpeed: dbg.windSpeed, windIntensity: dbg.windSpeed > 40 ? 'strong' : dbg.windSpeed > 20 ? 'moderate' : dbg.windSpeed > 5 ? 'light' : 'calm' } : {}),
      ...(dbg.cloudCover != null ? { cloudCover: dbg.cloudCover } : {}),
      ...(dbg.temperature != null ? { temperature: dbg.temperature, unit: 'C' as const } : {}),
    };
  }, [weatherRaw, dbg?.active, dbg?.weatherCondition, dbg?.windSpeed, dbg?.cloudCover, dbg?.temperature]);

  const seasonal = useMemo(() => {
    if (!dbg?.active || dbg.seasonalEvent == null) return seasonalRaw;
    const ev = WHEEL_OF_THE_YEAR.find(e => e.key === dbg.seasonalEvent) || null;
    return { ...seasonalRaw, event: ev, progress: ev ? { phase: 'active', opacity: 1 } : { phase: 'none', opacity: 0 } };
  }, [seasonalRaw, dbg?.active, dbg?.seasonalEvent]);

  const renderTime = toRenderTime(solar.timeOfDay);
  const isGoldenHour = solar.timeOfDay === 'golden-hour';
  const windIntensity = weather.windIntensity || 'calm';
  const fromLeft = (weather.windDirection ?? 0) >= 180;
  const [sunObscured, setSunObscured] = useState(false);
  const [lightningFlash, setLightningFlash] = useState(0);
  const sceneRef = useRef<HTMLDivElement>(null);

  // Apply seasonal token overrides to biome CSS vars
  const seasonalCssOverrides = useMemo(() => {
    if (!seasonal.event) return {};
    const overrides = biomeConfig.seasonalOverrides?.[seasonal.event.key];
    return overrides || {};
  }, [seasonal.event, biomeConfig]);

  // Samhain spectral quality for creatures
  const isSamhain = seasonal.event?.key === 'samhain';

  // Heat shimmer: clear + hot
  const showHeatShimmer = weather.condition === 'clear' && (weather.temperature ?? 0) > 32 && (weather.unit === 'C' || ((weather.temperature ?? 0) > 90 && weather.unit === 'F'));

  const effectiveMoonPhase = dbg?.moonPhase ?? seasonal.moonPhase ?? moonPhase;

  const goldenOverlayOpacity = isGoldenHour && solar.goldenHourProgress !== null
    ? solar.goldenHourProgress * 0.12
    : 0;

  const starOpacity = useMemo(() => {
    switch (renderTime) {
      case 'night': return 1;
      case 'dusk': return 0.85;
      case 'sunset': return 0.3;
      case 'pre-dawn': return 0.5;
      case 'dawn': return 0;
      default: return 0;
    }
  }, [renderTime]);

  const skyGradient = useMemo(() => buildSkyGradient(renderTime), [renderTime]);

  const atmosphereTint = useMemo(() => {
    return ATMOSPHERE_TINTS[atmosphere] || ATMOSPHERE_TINTS['morning-mist'];
  }, [atmosphere]);

  return (
    <div
      ref={sceneRef}
      className={`cabin-scene-root relative w-full overflow-hidden rounded-xl${sunObscured ? ' sun-obscured' : ''}${lightningFlash > 0 ? ' lightning-flash' : ''}`}
      style={{
        aspectRatio: 'var(--cabin-scene-ratio, 3/1)',
        ...biomeConfig.cssVariables,
        // Wet-ground override when raining
        ...(weather.isRaining ? { '--biome-fg-ground': darkenColor(biomeConfig.cssVariables['--biome-fg-ground'] || '#2d5a3d') } : {}),
        '--wind-intensity': windIntensity,
      } as React.CSSProperties}
    >
      <style>{`
        @media (max-width: 767px) { :root { --cabin-scene-ratio: 2/1; } }
        @media (min-width: 768px) { :root { --cabin-scene-ratio: 3/1; } }
        ${SCENE_CSS}
      `}</style>

      {/* Layer 1: sky-gradient + starfield */}
      <div className={layerBase} style={{
        zIndex: 1, background: skyGradient, pointerEvents: 'none',
        transition: 'background 60s linear, filter 1.5s ease',
        filter: sunObscured ? 'saturate(0.85)' : 'none',
      }} data-layer="sky-gradient">
        <Starfield opacity={starOpacity} />
      </div>

      {/* Layer 2: background-landscape */}
      <div className={layerBase} style={{
        zIndex: 2, pointerEvents: 'none',
        filter: [
          sunObscured ? 'brightness(0.9)' : '',
          showHeatShimmer ? '' : '',
        ].filter(Boolean).join(' ') || 'none',
        transition: 'filter 1.5s ease',
        animation: showHeatShimmer ? 'heat-shimmer 6s ease-in-out infinite' : 'none',
        transformOrigin: 'bottom center',
      }} data-layer="background-landscape">
        <BackgroundHills renderTime={renderTime} />
      </div>

      {/* Layer 3: celestial-bodies (sun + moon) */}
      <div className={layerBase} style={{ zIndex: 3, pointerEvents: 'none' }} data-layer="celestial-bodies">
        <SunRenderer sunPosition={solar.sunPosition} sunObscured={sunObscured} />
        <MoonPhaseRenderer moonPhase={moonPhase} moonPosition={solar.moonPosition} renderTime={renderTime} />
      </div>

      {/* Layer 4: cloud-layer */}
      <div className={layerBase} style={{ zIndex: 4, pointerEvents: 'none' }} data-layer="cloud-layer">
        <CloudLayer cloudCover={weather.cloudCover} windIntensity={windIntensity} renderTime={renderTime} />
      </div>

      {/* Layer 5: midground-trees */}
      <div className={layerBase} style={{
        zIndex: 5, pointerEvents: 'none',
        filter: sunObscured ? 'brightness(0.9)' : 'none',
        transition: 'filter 1.5s ease',
      }} data-layer="midground-trees">
        <MidgroundTrees renderTime={renderTime} isGoldenHour={isGoldenHour} windIntensity={windIntensity} fromLeft={fromLeft} />
      </div>

      {/* Layer 6: precipitation */}
      <div className={layerBase} style={{ zIndex: 6, pointerEvents: 'none' }} data-layer="precipitation">
        <PrecipitationLayer
          condition={weather.condition}
          windIntensity={windIntensity}
          windDirection={weather.windDirection}
          isSnowing={weather.isSnowing}
          isRaining={weather.isRaining}
          renderTime={renderTime}
          moonPhase={moonPhase}
          isGoldenHour={isGoldenHour}
        />
      </div>

      {/* Layer 7: creature-layer */}
      <div className={layerBase} style={{ zIndex: 7 }} data-layer="creature-layer" />

      {/* Layer 8: foreground-elements */}
      <div className={layerBase} style={{ zIndex: 8, pointerEvents: 'none' }} data-layer="foreground-elements">
        <ForegroundGround renderTime={renderTime} windIntensity={windIntensity} />
        <ForegroundTrees renderTime={renderTime} isGoldenHour={isGoldenHour} windIntensity={windIntensity} fromLeft={fromLeft} />
        <WindDebris windIntensity={windIntensity} fromLeft={fromLeft} />
      </div>

      {/* Layer 9: atmosphere-wash + golden hour overlay + moonlight glow */}
      <div className={layerBase} style={{
        zIndex: 9, pointerEvents: 'none',
      }} data-layer="atmosphere-wash">
        <div className="absolute inset-0" style={{
          backgroundColor: atmosphereTint.tint,
          opacity: atmosphereTint.opacity,
        }} />
        {goldenOverlayOpacity > 0 && (
          <div className="absolute inset-0" style={{
            backgroundColor: '#f4a460',
            opacity: goldenOverlayOpacity,
            transition: 'opacity 60s linear',
          }} />
        )}
        {(renderTime === 'night' || renderTime === 'dusk') && moonPhase > 0.35 && solar.moonPosition !== null && (
          <div className="absolute inset-0" style={{
            background: `radial-gradient(ellipse 40% 60% at ${5 + solar.moonPosition * 90}% ${65 - Math.sin(solar.moonPosition * Math.PI) * 45}%, #c4d4f0 0%, transparent 100%)`,
            opacity: 0.06,
            transition: 'background 60s linear, opacity 3s ease',
          }} />
        )}
      </div>

      {/* Layer 10: ambient-particles + lightning flash */}
      <div className={layerBase} style={{ zIndex: 10, pointerEvents: 'none' }} data-layer="ambient-particles">
        {weather.condition === 'thunderstorm' && (
          <div className="absolute inset-0" style={{
            backgroundColor: 'white',
            opacity: lightningFlash,
            transition: 'opacity 0ms',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* Member name */}
      <div className="absolute bottom-0 left-0 px-5 pb-4" style={{ zIndex: 11 }}>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 22, fontWeight: 300, color: '#ffffff',
          textShadow: '0 1px 4px rgba(0,0,0,0.45)',
          margin: 0, lineHeight: 1.3,
        }}>
          {memberName}
        </h2>
      </div>

      {/* Debug: OVERRIDES ACTIVE indicator */}
      {dbg?.active && (
        <div className="absolute top-2 right-2" style={{
          zIndex: 12, background: '#f59e0b', color: '#1a1a2a',
          padding: '2px 6px', borderRadius: 4, fontSize: 9,
          fontWeight: 700, letterSpacing: 1, fontFamily: 'system-ui',
        }}>
          OVERRIDES ACTIVE
        </div>
      )}
    </div>
  );
};

export default CabinScene;
