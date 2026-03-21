/**
 * CabinScene — Fully illustrated header for every Cabin page.
 * 10 compositing layers stacked by z-index.
 * Layer 1: sky-gradient + starfield
 * Layer 2: background-landscape (rolling hills)
 * Layer 3: celestial-bodies (moon)
 * Layer 8: foreground-elements (near ground + grass)
 * Layer 9: atmosphere-wash
 */

import { useMemo } from 'react';

type TimeOfDay = 'night' | 'dawn' | 'morning' | 'afternoon' | 'golden-hour' | 'dusk';

interface CabinSceneProps {
  memberName: string;
  atmosphere?: string;
  timeOfDay?: TimeOfDay;
  moonPhase?: number;
}

const SKY_GRADIENTS: Record<TimeOfDay, string> = {
  night:        'linear-gradient(to bottom, #0c1445, #1a1a3e)',
  dawn:         'linear-gradient(to bottom, #1a1a3e, #f4a460, #87ceeb)',
  morning:      'linear-gradient(to bottom, #87ceeb, #b0d4f1)',
  afternoon:    'linear-gradient(to bottom, #87ceeb, #6bb3e0)',
  'golden-hour':'linear-gradient(to bottom, #f4a460, #e8734a, #8b4789)',
  dusk:         'linear-gradient(to bottom, #8b4789, #2d1b4e, #0c1445)',
};

// Time-of-day color modifiers for ground layers
const TIME_FILTERS: Record<TimeOfDay, { filter: string; blendOverlay?: string }> = {
  night:        { filter: 'saturate(0.6) brightness(0.6)' },
  dawn:         { filter: 'saturate(0.8) brightness(0.7)', blendOverlay: 'rgba(100,130,180,0.12)' },
  morning:      { filter: 'none' },
  afternoon:    { filter: 'none' },
  'golden-hour':{ filter: 'saturate(1.1) brightness(0.95)', blendOverlay: 'rgba(210,160,80,0.15)' },
  dusk:         { filter: 'saturate(0.7) brightness(0.65)' },
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

// ─── Moon ───
function MoonPhaseRenderer({ moonPhase, timeOfDay }: { moonPhase: number; timeOfDay: TimeOfDay }) {
  const isDaytime = timeOfDay === 'morning' || timeOfDay === 'afternoon' || timeOfDay === 'golden-hour';
  let moonOpacity = 1;
  if (isDaytime) {
    if (moonPhase >= 0.3 && moonPhase <= 0.7) moonOpacity = 0.2;
    else return null;
  }
  if (timeOfDay === 'dawn') {
    if (moonPhase >= 0.3 && moonPhase <= 0.7) moonOpacity = 0.15;
    else return null;
  }

  const moonR = 2, cx = 82, cy = 18;
  const normalizedPhase = moonPhase <= 0.5 ? moonPhase * 2 : (1 - moonPhase) * 2;
  const shadowOffsetX = (1 - normalizedPhase) * moonR * 1.6;
  const isWaxing = moonPhase <= 0.5;
  const shadowCx = isWaxing ? cx - shadowOffsetX : cx + shadowOffsetX;

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100"
      preserveAspectRatio="none" style={{ opacity: moonOpacity }}>
      <defs>
        <clipPath id="cabin-moon-clip"><circle cx={cx} cy={cy} r={moonR} /></clipPath>
        <radialGradient id="cabin-moon-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f5f0c1" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#f5f0c1" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={moonR * 2} fill="url(#cabin-moon-glow)" />
      <circle cx={cx} cy={cy} r={moonR} fill="#f5f0c1" />
      {normalizedPhase < 0.98 && (
        <circle cx={shadowCx} cy={cy} r={moonR} fill="#0c1445"
          clipPath="url(#cabin-moon-clip)" opacity={0.92} />
      )}
    </svg>
  );
}

// ─── Background Hills (Layer 2) ───
function BackgroundHills({ timeOfDay }: { timeOfDay: TimeOfDay }) {
  const tf = TIME_FILTERS[timeOfDay];
  const showHorizonGlow = timeOfDay === 'dawn' || timeOfDay === 'golden-hour';

  return (
    <div className="absolute inset-0 w-full h-full" style={{ filter: tf.filter }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 333"
        preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Horizon glow gradient */}
          <linearGradient id="horizon-glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f4a460" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f4a460" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizon glow line — visible at dawn/golden hour */}
        {showHorizonGlow && (
          <rect x="0" y="214" width="1000" height="4" fill="url(#horizon-glow)" opacity="0.7" />
        )}

        {/* Far hills — blue-grey, hazy, opacity 0.6 */}
        <path
          d="M0,250 C100,215 200,230 300,218 C400,206 500,225 600,210 C700,195 800,220 900,208 C950,202 1000,215 1000,215 L1000,333 L0,333 Z"
          fill="var(--biome-bg-far, #7a9a8a)"
          opacity="0.6"
        />

        {/* Mid hills — medium green, opacity 0.8 */}
        <path
          d="M0,270 C80,248 180,260 280,245 C380,230 450,255 560,240 C670,225 780,250 880,238 C940,232 1000,245 1000,245 L1000,333 L0,333 Z"
          fill="var(--biome-bg-mid, #4a7c59)"
          opacity="0.8"
        />

        {/* Near hills — deeper green */}
        <path
          d="M0,285 C120,268 220,278 340,265 C460,252 540,272 660,260 C780,248 880,268 1000,258 L1000,333 L0,333 Z"
          fill="var(--biome-bg-near, #3a6b48)"
          opacity="0.9"
        />
      </svg>

      {/* Time-of-day color overlay */}
      {tf.blendOverlay && (
        <div className="absolute inset-0" style={{
          backgroundColor: tf.blendOverlay,
          mixBlendMode: 'multiply',
        }} />
      )}
    </div>
  );
}

// ─── Foreground Ground (Layer 8) ───
function ForegroundGround({ timeOfDay }: { timeOfDay: TimeOfDay }) {
  const tf = TIME_FILTERS[timeOfDay];

  // Generate deterministic grass spikes
  const grassSpikes = useMemo(() => {
    const rand = seededRandom(77);
    const spikes: string[] = [];
    let x = 0;
    while (x < 1000) {
      const spikeH = 3 + rand() * 3; // 3–6px in viewBox units
      const spikeW = 1.5 + rand() * 2;
      spikes.push(`L${x},${85 - spikeH} L${x + spikeW},85`);
      x += 2 + rand() * 5; // random spacing
    }
    return spikes.join(' ');
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full" style={{ filter: tf.filter }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 100"
        preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        {/* Grass texture spikes */}
        <path
          d={`M0,85 ${grassSpikes} L1000,85 L1000,85 L0,85 Z`}
          fill="var(--biome-fg-ground, #3a7a4a)"
          opacity="0.7"
        />
        {/* Main foreground ground — bottom 15% */}
        <path
          d="M0,85 C100,83 250,86 400,84 C550,82 700,86 850,84 C950,83 1000,85 1000,85 L1000,100 L0,100 Z"
          fill="var(--biome-fg-ground, #2d5a3d)"
        />
      </svg>
      {tf.blendOverlay && (
        <div className="absolute inset-0" style={{
          backgroundColor: tf.blendOverlay,
          mixBlendMode: 'multiply',
        }} />
      )}
    </div>
  );
}

// ─── Main Component ───
const CabinScene = ({ memberName, atmosphere = 'morning-mist', timeOfDay = 'morning', moonPhase = 0.5 }: CabinSceneProps) => {
  const skyGradient = SKY_GRADIENTS[timeOfDay] ?? SKY_GRADIENTS.morning;

  const atmosphereTint = useMemo(() => {
    return { tint: '#dcfce7', opacity: 0.08 };
  }, [atmosphere]);

  const starOpacity = useMemo(() => {
    if (timeOfDay === 'night') return 1;
    if (timeOfDay === 'dusk') return 0.7;
    if (timeOfDay === 'dawn') return 0.3;
    return 0;
  }, [timeOfDay]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl"
      style={{
        aspectRatio: 'var(--cabin-scene-ratio, 3/1)',
        '--biome-bg-far': '#7a9a8a',
        '--biome-bg-mid': '#4a7c59',
        '--biome-bg-near': '#3a6b48',
        '--biome-fg-ground': '#2d5a3d',
      } as React.CSSProperties}
    >
      <style>{`
        @media (max-width: 767px) { :root { --cabin-scene-ratio: 2/1; } }
        @media (min-width: 768px) { :root { --cabin-scene-ratio: 3/1; } }
        ${SCENE_CSS}
      `}</style>

      {/* Layer 1: sky-gradient + starfield */}
      <div className={layerBase} style={{ zIndex: 1, background: skyGradient, pointerEvents: 'none' }} data-layer="sky-gradient">
        <Starfield opacity={starOpacity} />
      </div>

      {/* Layer 2: background-landscape (rolling hills) */}
      <div className={layerBase} style={{ zIndex: 2, pointerEvents: 'none' }} data-layer="background-landscape">
        <BackgroundHills timeOfDay={timeOfDay} />
      </div>

      {/* Layer 3: celestial-bodies (moon) */}
      <div className={layerBase} style={{ zIndex: 3, pointerEvents: 'none' }} data-layer="celestial-bodies">
        <MoonPhaseRenderer moonPhase={moonPhase} timeOfDay={timeOfDay} />
      </div>

      {/* Layer 4: cloud-layer */}
      <div className={layerBase} style={{ zIndex: 4, pointerEvents: 'none' }} data-layer="cloud-layer" />

      {/* Layer 5: midground-trees */}
      <div className={layerBase} style={{ zIndex: 5, pointerEvents: 'none' }} data-layer="midground-trees" />

      {/* Layer 6: precipitation */}
      <div className={layerBase} style={{ zIndex: 6, pointerEvents: 'none' }} data-layer="precipitation" />

      {/* Layer 7: creature-layer */}
      <div className={layerBase} style={{ zIndex: 7 }} data-layer="creature-layer" />

      {/* Layer 8: foreground-elements (near ground + grass) */}
      <div className={layerBase} style={{ zIndex: 8, pointerEvents: 'none' }} data-layer="foreground-elements">
        <ForegroundGround timeOfDay={timeOfDay} />
      </div>

      {/* Layer 9: atmosphere-wash */}
      <div className={layerBase} style={{
        zIndex: 9, pointerEvents: 'none',
        backgroundColor: atmosphereTint.tint, opacity: atmosphereTint.opacity,
      }} data-layer="atmosphere-wash" />

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
