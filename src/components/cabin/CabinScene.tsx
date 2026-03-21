/**
 * CabinScene — Fully illustrated header for every Cabin page.
 * 10 compositing layers stacked by z-index.
 * Now driven by useSolarCycle for real-time sun position and time-of-day.
 */

import { useMemo } from 'react';
import useSolarCycle from '@/hooks/useSolarCycle';

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
function SunRenderer({ sunPosition }: { sunPosition: number | null }) {
  if (sunPosition === null) return null;

  // viewBox 0 0 100 100, horizon at y=65, peak at y=15
  const horizonY = 65;
  const maxHeight = 50; // peak amplitude
  const sunR = 2.5; // ~5% diameter
  const x = 5 + sunPosition * 90; // 5–95 range
  const y = horizonY - Math.sin(sunPosition * Math.PI) * maxHeight;

  // Horizon glow when within 10% of edges
  let glowOpacity = 0;
  if (sunPosition < 0.15) {
    glowOpacity = 1 - sunPosition / 0.15;
  } else if (sunPosition > 0.85) {
    glowOpacity = (sunPosition - 0.85) / 0.15;
  }

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
      {/* Horizon glow at sunrise/sunset */}
      {glowOpacity > 0 && (
        <ellipse cx={x} cy={horizonY} rx={15} ry={6}
          fill="url(#horizon-sun-glow)"
          opacity={glowOpacity * 0.8}
          style={{ transition: 'cx 60s linear, opacity 60s linear' }} />
      )}
      {/* Sun glow (3x diameter) */}
      <circle cx={x} cy={y} r={sunR * 3} fill="url(#sun-glow)"
        style={{ transition: 'cx 60s linear, cy 60s linear' }} />
      {/* Sun core */}
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
function ForegroundGround({ renderTime }: { renderTime: RenderTimeOfDay }) {
  const tf = TIME_FILTERS[renderTime];
  const isNight = renderTime === 'night';
  const groundColor = isNight ? '#1a2e1a' : 'var(--biome-fg-ground, #2d5a3d)';
  const grassColor = isNight ? '#1a2e1a' : 'var(--biome-fg-ground, #3a7a4a)';

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

  return (
    <div className="absolute inset-0 w-full h-full" style={{ filter: tf.filter, transition: 'filter 3s ease' }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 100"
        preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d={`M0,85 ${grassSpikes} L1000,85 L1000,85 L0,85 Z`}
          fill={grassColor} opacity="0.7" style={{ transition: 'fill 3s ease' }} />
        <path d="M0,85 C100,83 250,86 400,84 C550,82 700,86 850,84 C950,83 1000,85 1000,85 L1000,100 L0,100 Z"
          fill={groundColor} style={{ transition: 'fill 3s ease' }} />
      </svg>
      {tf.blendOverlay && (
        <div className="absolute inset-0" style={{ backgroundColor: tf.blendOverlay, mixBlendMode: 'multiply' }} />
      )}
    </div>
  );
}

// ─── Midground Trees (Layer 5) ───
function MidgroundTrees({ renderTime, isGoldenHour }: { renderTime: RenderTimeOfDay; isGoldenHour: boolean }) {
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

  const renderCanopy = (type: string, cx: number, baseY: number, s: number) => {
    const canopyColor = 'var(--biome-canopy, #3a7d44)';
    const trunkColor = '#5c4033';
    switch (type) {
      case 'conifer-a':
        return (
          <g className="tree-sway" style={{ transformOrigin: `${cx}px ${baseY}px` }}>
            <rect x={cx - 1.2 * s} y={baseY - 18 * s} width={2.4 * s} height={18 * s} fill={trunkColor} rx={0.5} />
            <path d={`M${cx},${baseY - 38 * s} C${cx + 2 * s},${baseY - 34 * s} ${cx + 8 * s},${baseY - 28 * s} ${cx + 10 * s},${baseY - 22 * s} C${cx + 7 * s},${baseY - 20 * s} ${cx + 11 * s},${baseY - 14 * s} ${cx + 12 * s},${baseY - 8 * s} L${cx - 12 * s},${baseY - 8 * s} C${cx - 11 * s},${baseY - 14 * s} ${cx - 7 * s},${baseY - 20 * s} ${cx - 10 * s},${baseY - 22 * s} C${cx - 8 * s},${baseY - 28 * s} ${cx - 2 * s},${baseY - 34 * s} ${cx},${baseY - 38 * s}Z`} fill={canopyColor} />
          </g>
        );
      case 'conifer-b':
        return (
          <g className="tree-sway" style={{ transformOrigin: `${cx}px ${baseY}px` }}>
            <rect x={cx - 1.5 * s} y={baseY - 20 * s} width={3 * s} height={20 * s} fill={trunkColor} rx={0.6} />
            <path d={`M${cx},${baseY - 44 * s} C${cx + 3 * s},${baseY - 38 * s} ${cx + 6 * s},${baseY - 32 * s} ${cx + 9 * s},${baseY - 26 * s} C${cx + 6 * s},${baseY - 24 * s} ${cx + 10 * s},${baseY - 18 * s} ${cx + 13 * s},${baseY - 10 * s} C${cx + 10 * s},${baseY - 9 * s} ${cx + 14 * s},${baseY - 4 * s} ${cx + 14 * s},${baseY - 4 * s} L${cx - 14 * s},${baseY - 4 * s} C${cx - 14 * s},${baseY - 4 * s} ${cx - 10 * s},${baseY - 9 * s} ${cx - 13 * s},${baseY - 10 * s} C${cx - 10 * s},${baseY - 18 * s} ${cx - 6 * s},${baseY - 24 * s} ${cx - 9 * s},${baseY - 26 * s} C${cx - 6 * s},${baseY - 32 * s} ${cx - 3 * s},${baseY - 38 * s} ${cx},${baseY - 44 * s}Z`} fill={canopyColor} />
          </g>
        );
      case 'conifer-c':
        return (
          <g className="tree-sway" style={{ transformOrigin: `${cx}px ${baseY}px` }}>
            <rect x={cx - 1 * s} y={baseY - 14 * s} width={2 * s} height={14 * s} fill={trunkColor} rx={0.4} />
            <path d={`M${cx},${baseY - 30 * s} C${cx + 2 * s},${baseY - 26 * s} ${cx + 7 * s},${baseY - 18 * s} ${cx + 8 * s},${baseY - 12 * s} L${cx - 8 * s},${baseY - 12 * s} C${cx - 7 * s},${baseY - 18 * s} ${cx - 2 * s},${baseY - 26 * s} ${cx},${baseY - 30 * s}Z`} fill={canopyColor} />
          </g>
        );
      case 'deciduous-a':
        return (
          <g className="tree-sway" style={{ transformOrigin: `${cx}px ${baseY}px` }}>
            <rect x={cx - 1.5 * s} y={baseY - 16 * s} width={3 * s} height={16 * s} fill={trunkColor} rx={0.6} />
            <path d={`M${cx - 14 * s},${baseY - 20 * s} C${cx - 16 * s},${baseY - 28 * s} ${cx - 12 * s},${baseY - 36 * s} ${cx - 6 * s},${baseY - 38 * s} C${cx - 3 * s},${baseY - 42 * s} ${cx + 3 * s},${baseY - 42 * s} ${cx + 6 * s},${baseY - 38 * s} C${cx + 12 * s},${baseY - 36 * s} ${cx + 16 * s},${baseY - 28 * s} ${cx + 14 * s},${baseY - 20 * s} C${cx + 12 * s},${baseY - 16 * s} ${cx - 12 * s},${baseY - 16 * s} ${cx - 14 * s},${baseY - 20 * s}Z`} fill={canopyColor} />
          </g>
        );
      case 'deciduous-b':
        return (
          <g className="tree-sway" style={{ transformOrigin: `${cx}px ${baseY}px` }}>
            <rect x={cx - 2 * s} y={baseY - 18 * s} width={4 * s} height={18 * s} fill={trunkColor} rx={0.8} />
            <path d={`M${cx - 16 * s},${baseY - 22 * s} C${cx - 18 * s},${baseY - 30 * s} ${cx - 14 * s},${baseY - 40 * s} ${cx - 4 * s},${baseY - 44 * s} C${cx},${baseY - 46 * s} ${cx + 4 * s},${baseY - 44 * s} ${cx + 8 * s},${baseY - 42 * s} C${cx + 14 * s},${baseY - 38 * s} ${cx + 18 * s},${baseY - 30 * s} ${cx + 16 * s},${baseY - 22 * s} C${cx + 14 * s},${baseY - 18 * s} ${cx - 14 * s},${baseY - 18 * s} ${cx - 16 * s},${baseY - 22 * s}Z`} fill={canopyColor} />
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
          <g key={i}>{renderCanopy(t.type, t.x, t.groundY, t.scale)}</g>
        ))}
      </svg>
    </div>
  );
}

// ─── Foreground Framing Trees (Layer 8) ───
function ForegroundTrees({ renderTime, isGoldenHour }: { renderTime: RenderTimeOfDay; isGoldenHour: boolean }) {
  const tf = TIME_FILTERS[renderTime];
  const treeFilter = isGoldenHour ? 'hue-rotate(-10deg) saturate(1.2)' : (tf.treeFilter || tf.filter);
  const darkCanopy = '#2a5a30';
  const darkTrunk = '#3a2a1a';

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 100"
      preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: treeFilter, transition: 'filter 2s ease' }}>
      <g className="tree-sway" style={{ transformOrigin: '40px 100px' }}>
        <rect x={30} y={20} width={8} height={80} fill={darkTrunk} rx={2} />
        <path d="M34,0 C40,-2 56,8 60,18 C58,20 64,28 66,36 C62,38 68,48 68,56 L0,56 C0,48 6,38 2,36 C4,28 10,20 8,18 C12,8 28,-2 34,0Z" fill={darkCanopy} opacity="0.9" />
      </g>
      <g className="tree-sway" style={{ transformOrigin: '960px 100px' }}>
        <rect x={956} y={25} width={7} height={75} fill={darkTrunk} rx={2} />
        <path d="M960,5 C968,2 982,10 988,22 C994,30 996,40 992,48 C988,54 980,58 972,56 C964,58 950,52 946,44 C942,36 944,24 950,14 C952,10 956,6 960,5Z" fill={darkCanopy} opacity="0.85" />
      </g>
      <g className="tree-sway" style={{ transformOrigin: '920px 100px' }}>
        <rect x={917} y={40} width={5} height={60} fill={darkTrunk} rx={1.5} />
        <path d="M920,12 C924,16 934,28 936,38 C932,40 938,50 938,56 L902,56 C902,50 908,40 904,38 C906,28 916,16 920,12Z" fill={darkCanopy} opacity="0.8" />
      </g>
    </svg>
  );
}

// ─── Main Component ───
const CabinScene = ({ memberName, atmosphere = 'morning-mist', moonPhase = 0.5, latitude, longitude }: CabinSceneProps) => {
  const solar = useSolarCycle(latitude, longitude);
  const renderTime = toRenderTime(solar.timeOfDay);
  const isGoldenHour = solar.timeOfDay === 'golden-hour';

  const skyGradient = buildSkyGradient(renderTime);

  const atmosphereTint = useMemo(() => {
    return { tint: '#dcfce7', opacity: 0.08 };
  }, [atmosphere]);

  // Golden hour amber overlay opacity
  const goldenOverlayOpacity = isGoldenHour && solar.goldenHourProgress !== null
    ? solar.goldenHourProgress * 0.12
    : 0;

  // Granular star opacity for smooth transitions
  const starOpacity = useMemo(() => {
    switch (renderTime) {
      case 'night': return 1;
      case 'dusk': return 0.85;        // fading in during dusk
      case 'sunset': return 0.3;       // just starting to appear
      case 'pre-dawn': return 0.5;     // fading out
      case 'dawn': return 0;           // fully gone
      default: return 0;
    }
  }, [renderTime]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl"
      style={{
        aspectRatio: 'var(--cabin-scene-ratio, 3/1)',
        '--biome-bg-far': '#7a9a8a',
        '--biome-bg-mid': '#4a7c59',
        '--biome-bg-near': '#3a6b48',
        '--biome-fg-ground': '#2d5a3d',
        '--biome-canopy': '#3a7d44',
      } as React.CSSProperties}
    >
      <style>{`
        @media (max-width: 767px) { :root { --cabin-scene-ratio: 2/1; } }
        @media (min-width: 768px) { :root { --cabin-scene-ratio: 3/1; } }
        ${SCENE_CSS}
        .tree-sway { transform-origin: bottom center; }
      `}</style>

      {/* Layer 1: sky-gradient + starfield */}
      <div className={layerBase} style={{
        zIndex: 1, background: skyGradient, pointerEvents: 'none',
        transition: 'background 60s linear',
      }} data-layer="sky-gradient">
        <Starfield opacity={starOpacity} />
      </div>

      {/* Layer 2: background-landscape */}
      <div className={layerBase} style={{ zIndex: 2, pointerEvents: 'none' }} data-layer="background-landscape">
        <BackgroundHills renderTime={renderTime} />
      </div>

      {/* Layer 3: celestial-bodies (sun + moon) */}
      <div className={layerBase} style={{ zIndex: 3, pointerEvents: 'none' }} data-layer="celestial-bodies">
        <SunRenderer sunPosition={solar.sunPosition} />
        <MoonPhaseRenderer moonPhase={moonPhase} moonPosition={solar.moonPosition} renderTime={renderTime} />
      </div>

      {/* Layer 4: cloud-layer */}
      <div className={layerBase} style={{ zIndex: 4, pointerEvents: 'none' }} data-layer="cloud-layer" />

      {/* Layer 5: midground-trees */}
      <div className={layerBase} style={{ zIndex: 5, pointerEvents: 'none' }} data-layer="midground-trees">
        <MidgroundTrees renderTime={renderTime} isGoldenHour={isGoldenHour} />
      </div>

      {/* Layer 6: precipitation */}
      <div className={layerBase} style={{ zIndex: 6, pointerEvents: 'none' }} data-layer="precipitation" />

      {/* Layer 7: creature-layer */}
      <div className={layerBase} style={{ zIndex: 7 }} data-layer="creature-layer" />

      {/* Layer 8: foreground-elements */}
      <div className={layerBase} style={{ zIndex: 8, pointerEvents: 'none' }} data-layer="foreground-elements">
        <ForegroundGround renderTime={renderTime} />
        <ForegroundTrees renderTime={renderTime} isGoldenHour={isGoldenHour} />
      </div>

      {/* Layer 9: atmosphere-wash + golden hour overlay + moonlight glow */}
      <div className={layerBase} style={{
        zIndex: 9, pointerEvents: 'none',
      }} data-layer="atmosphere-wash">
        {/* Base atmosphere tint */}
        <div className="absolute inset-0" style={{
          backgroundColor: atmosphereTint.tint,
          opacity: atmosphereTint.opacity,
        }} />
        {/* Golden hour amber overlay */}
        {goldenOverlayOpacity > 0 && (
          <div className="absolute inset-0" style={{
            backgroundColor: '#f4a460',
            opacity: goldenOverlayOpacity,
            transition: 'opacity 60s linear',
          }} />
        )}
        {/* Moonlight glow — visible at night when moon is bright enough */}
        {(renderTime === 'night' || renderTime === 'dusk') && moonPhase > 0.35 && solar.moonPosition !== null && (
          <div className="absolute inset-0" style={{
            background: `radial-gradient(ellipse 40% 60% at ${5 + solar.moonPosition * 90}% ${65 - Math.sin(solar.moonPosition * Math.PI) * 45}%, #c4d4f0 0%, transparent 100%)`,
            opacity: 0.06,
            transition: 'background 60s linear, opacity 3s ease',
          }} />
        )}
      </div>

      {/* Layer 10: ambient-particles */}
      <div className={layerBase} style={{ zIndex: 10, pointerEvents: 'none' }} data-layer="ambient-particles" />

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
    </div>
  );
};

export default CabinScene;
