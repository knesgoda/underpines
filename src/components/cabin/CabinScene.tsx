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

// ─── Midground Trees (Layer 5) ───
// Organic, hand-drawn feel — conifer + deciduous mix along middle hills
function MidgroundTrees({ timeOfDay }: { timeOfDay: TimeOfDay }) {
  const tf = TIME_FILTERS[timeOfDay];

  // Each tree: { x, groundY, trunkH, trunkW, type, scale }
  const trees = [
    // Conifer variants — pointed, irregular
    { x: 120, groundY: 72, scale: 0.7, type: 'conifer-a' },
    { x: 310, groundY: 70, scale: 1.0, type: 'conifer-b' },
    { x: 680, groundY: 71, scale: 0.85, type: 'conifer-a' },
    { x: 850, groundY: 73, scale: 0.6, type: 'conifer-c' },
    // Deciduous variants — rounded, organic
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
            <path d={`M${cx},${baseY - 38 * s} 
              C${cx + 2 * s},${baseY - 34 * s} ${cx + 8 * s},${baseY - 28 * s} ${cx + 10 * s},${baseY - 22 * s}
              C${cx + 7 * s},${baseY - 20 * s} ${cx + 11 * s},${baseY - 14 * s} ${cx + 12 * s},${baseY - 8 * s}
              L${cx - 12 * s},${baseY - 8 * s}
              C${cx - 11 * s},${baseY - 14 * s} ${cx - 7 * s},${baseY - 20 * s} ${cx - 10 * s},${baseY - 22 * s}
              C${cx - 8 * s},${baseY - 28 * s} ${cx - 2 * s},${baseY - 34 * s} ${cx},${baseY - 38 * s}Z`}
              fill={canopyColor} />
          </g>
        );
      case 'conifer-b':
        return (
          <g className="tree-sway" style={{ transformOrigin: `${cx}px ${baseY}px` }}>
            <rect x={cx - 1.5 * s} y={baseY - 20 * s} width={3 * s} height={20 * s} fill={trunkColor} rx={0.6} />
            <path d={`M${cx},${baseY - 44 * s}
              C${cx + 3 * s},${baseY - 38 * s} ${cx + 6 * s},${baseY - 32 * s} ${cx + 9 * s},${baseY - 26 * s}
              C${cx + 6 * s},${baseY - 24 * s} ${cx + 10 * s},${baseY - 18 * s} ${cx + 13 * s},${baseY - 10 * s}
              C${cx + 10 * s},${baseY - 9 * s} ${cx + 14 * s},${baseY - 4 * s} ${cx + 14 * s},${baseY - 4 * s}
              L${cx - 14 * s},${baseY - 4 * s}
              C${cx - 14 * s},${baseY - 4 * s} ${cx - 10 * s},${baseY - 9 * s} ${cx - 13 * s},${baseY - 10 * s}
              C${cx - 10 * s},${baseY - 18 * s} ${cx - 6 * s},${baseY - 24 * s} ${cx - 9 * s},${baseY - 26 * s}
              C${cx - 6 * s},${baseY - 32 * s} ${cx - 3 * s},${baseY - 38 * s} ${cx},${baseY - 44 * s}Z`}
              fill={canopyColor} />
          </g>
        );
      case 'conifer-c':
        return (
          <g className="tree-sway" style={{ transformOrigin: `${cx}px ${baseY}px` }}>
            <rect x={cx - 1 * s} y={baseY - 14 * s} width={2 * s} height={14 * s} fill={trunkColor} rx={0.4} />
            <path d={`M${cx},${baseY - 30 * s}
              C${cx + 2 * s},${baseY - 26 * s} ${cx + 7 * s},${baseY - 18 * s} ${cx + 8 * s},${baseY - 12 * s}
              L${cx - 8 * s},${baseY - 12 * s}
              C${cx - 7 * s},${baseY - 18 * s} ${cx - 2 * s},${baseY - 26 * s} ${cx},${baseY - 30 * s}Z`}
              fill={canopyColor} />
          </g>
        );
      case 'deciduous-a':
        return (
          <g className="tree-sway" style={{ transformOrigin: `${cx}px ${baseY}px` }}>
            <rect x={cx - 1.5 * s} y={baseY - 16 * s} width={3 * s} height={16 * s} fill={trunkColor} rx={0.6} />
            <path d={`M${cx - 14 * s},${baseY - 20 * s}
              C${cx - 16 * s},${baseY - 28 * s} ${cx - 12 * s},${baseY - 36 * s} ${cx - 6 * s},${baseY - 38 * s}
              C${cx - 3 * s},${baseY - 42 * s} ${cx + 3 * s},${baseY - 42 * s} ${cx + 6 * s},${baseY - 38 * s}
              C${cx + 12 * s},${baseY - 36 * s} ${cx + 16 * s},${baseY - 28 * s} ${cx + 14 * s},${baseY - 20 * s}
              C${cx + 12 * s},${baseY - 16 * s} ${cx - 12 * s},${baseY - 16 * s} ${cx - 14 * s},${baseY - 20 * s}Z`}
              fill={canopyColor} />
          </g>
        );
      case 'deciduous-b':
        return (
          <g className="tree-sway" style={{ transformOrigin: `${cx}px ${baseY}px` }}>
            <rect x={cx - 2 * s} y={baseY - 18 * s} width={4 * s} height={18 * s} fill={trunkColor} rx={0.8} />
            <path d={`M${cx - 16 * s},${baseY - 22 * s}
              C${cx - 18 * s},${baseY - 30 * s} ${cx - 14 * s},${baseY - 40 * s} ${cx - 4 * s},${baseY - 44 * s}
              C${cx},${baseY - 46 * s} ${cx + 4 * s},${baseY - 44 * s} ${cx + 8 * s},${baseY - 42 * s}
              C${cx + 14 * s},${baseY - 38 * s} ${cx + 18 * s},${baseY - 30 * s} ${cx + 16 * s},${baseY - 22 * s}
              C${cx + 14 * s},${baseY - 18 * s} ${cx - 14 * s},${baseY - 18 * s} ${cx - 16 * s},${baseY - 22 * s}Z`}
              fill={canopyColor} />
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full" style={{ filter: tf.filter }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 100"
        preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        {trees.map((t, i) => (
          <g key={i}>{renderCanopy(t.type, t.x, t.groundY, t.scale)}</g>
        ))}
      </svg>
      {tf.blendOverlay && (
        <div className="absolute inset-0" style={{ backgroundColor: tf.blendOverlay, mixBlendMode: 'multiply' }} />
      )}
    </div>
  );
}

// ─── Foreground Framing Trees (Layer 8, rendered above ground) ───
function ForegroundTrees({ timeOfDay }: { timeOfDay: TimeOfDay }) {
  const tf = TIME_FILTERS[timeOfDay];
  const darkCanopy = '#2a5a30';
  const darkTrunk = '#3a2a1a';

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 100"
      preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: tf.filter }}>
      {/* Left edge — large conifer, partially off-screen */}
      <g className="tree-sway" style={{ transformOrigin: '40px 100px' }}>
        <rect x={30} y={20} width={8} height={80} fill={darkTrunk} rx={2} />
        <path d={`M34,0
          C40,-2 56,8 60,18
          C58,20 64,28 66,36
          C62,38 68,48 68,56
          L0,56
          C0,48 6,38 2,36
          C4,28 10,20 8,18
          C12,8 28,-2 34,0Z`}
          fill={darkCanopy} opacity="0.9" />
      </g>

      {/* Right edge — tall deciduous, partially off-screen */}
      <g className="tree-sway" style={{ transformOrigin: '960px 100px' }}>
        <rect x={956} y={25} width={7} height={75} fill={darkTrunk} rx={2} />
        <path d={`M960,5
          C968,2 982,10 988,22
          C994,30 996,40 992,48
          C988,54 980,58 972,56
          C964,58 950,52 946,44
          C942,36 944,24 950,14
          C952,10 956,6 960,5Z`}
          fill={darkCanopy} opacity="0.85" />
      </g>

      {/* Right edge — smaller conifer behind the deciduous */}
      <g className="tree-sway" style={{ transformOrigin: '920px 100px' }}>
        <rect x={917} y={40} width={5} height={60} fill={darkTrunk} rx={1.5} />
        <path d={`M920,12
          C924,16 934,28 936,38
          C932,40 938,50 938,56
          L902,56
          C902,50 908,40 904,38
          C906,28 916,16 920,12Z`}
          fill={darkCanopy} opacity="0.8" />
      </g>
    </svg>
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
      <div className={layerBase} style={{ zIndex: 5, pointerEvents: 'none' }} data-layer="midground-trees">
        <MidgroundTrees timeOfDay={timeOfDay} />
      </div>

      {/* Layer 6: precipitation */}
      <div className={layerBase} style={{ zIndex: 6, pointerEvents: 'none' }} data-layer="precipitation" />

      {/* Layer 7: creature-layer */}
      <div className={layerBase} style={{ zIndex: 7 }} data-layer="creature-layer" />

      {/* Layer 8: foreground-elements (near ground + grass + framing trees) */}
      <div className={layerBase} style={{ zIndex: 8, pointerEvents: 'none' }} data-layer="foreground-elements">
        <ForegroundGround timeOfDay={timeOfDay} />
        <ForegroundTrees timeOfDay={timeOfDay} />
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
