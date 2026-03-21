/**
 * CabinScene — Fully illustrated header for every Cabin page.
 * 10 compositing layers stacked by z-index.
 * Layer 1: sky-gradient + starfield (night/dusk)
 * Layer 3: moon (celestial-bodies)
 * Layer 9: atmosphere-wash
 */

import { useMemo } from 'react';

type TimeOfDay = 'night' | 'dawn' | 'morning' | 'afternoon' | 'golden-hour' | 'dusk';

interface CabinSceneProps {
  memberName: string;
  atmosphere?: string;
  timeOfDay?: TimeOfDay;
  moonPhase?: number; // 0–1: 0=new, 0.5=full, 1=new
}

const SKY_GRADIENTS: Record<TimeOfDay, string> = {
  night:        'linear-gradient(to bottom, #0c1445, #1a1a3e)',
  dawn:         'linear-gradient(to bottom, #1a1a3e, #f4a460, #87ceeb)',
  morning:      'linear-gradient(to bottom, #87ceeb, #b0d4f1)',
  afternoon:    'linear-gradient(to bottom, #87ceeb, #6bb3e0)',
  'golden-hour':'linear-gradient(to bottom, #f4a460, #e8734a, #8b4789)',
  dusk:         'linear-gradient(to bottom, #8b4789, #2d1b4e, #0c1445)',
};

const layerBase = 'absolute inset-0 w-full h-full';

// Seeded pseudo-random for deterministic star placement
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

interface Star {
  cx: number; cy: number; r: number;
  delay: number; duration: number;
  color: string;
}

function generateStars(): Star[] {
  const rand = seededRandom(42);
  const count = 60 + Math.floor(rand() * 21); // 60–80
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const isYellow = rand() > 0.7;
    stars.push({
      cx: rand() * 100,
      cy: rand() * 70, // upper 70%
      r: 0.5 + rand() * 1.0, // 0.5–1.5
      delay: rand() * 6,
      duration: 2 + rand() * 4, // 2–6s
      color: isYellow ? '#fffde0' : '#ffffff',
    });
  }
  return stars;
}

const STARS = generateStars();

const TWINKLE_CSS = `
@keyframes cabin-twinkle {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
`;

function Starfield({ opacity }: { opacity: number }) {
  if (opacity <= 0) return null;
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ opacity, transition: 'opacity 1.5s ease' }}
    >
      {STARS.map((s, i) => (
        <circle
          key={i}
          cx={s.cx}
          cy={s.cy}
          r={s.r * 0.15} // scale for viewBox 100
          fill={s.color}
          style={{
            animation: `cabin-twinkle ${s.duration}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </svg>
  );
}

function MoonPhaseRenderer({ moonPhase, timeOfDay }: { moonPhase: number; timeOfDay: TimeOfDay }) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'dusk';
  const isDaytime = timeOfDay === 'morning' || timeOfDay === 'afternoon' || timeOfDay === 'golden-hour';

  // Daytime: only show if near-full (0.3–0.7), faint
  let moonOpacity = 1;
  if (isDaytime) {
    if (moonPhase >= 0.3 && moonPhase <= 0.7) {
      moonOpacity = 0.2;
    } else {
      return null;
    }
  }
  if (timeOfDay === 'dawn') {
    if (moonPhase >= 0.3 && moonPhase <= 0.7) {
      moonOpacity = 0.15;
    } else {
      return null;
    }
  }

  // Moon geometry — 4% of width in a 100-unit viewBox
  const moonR = 2;
  const cx = 82;
  const cy = 18;

  // Shadow offset: at phase=0 or 1, fully covered. At 0.5, no shadow.
  // Phase 0–0.5: waxing (shadow on left, moving right to reveal)
  // Phase 0.5–1: waning (shadow on right, moving left to cover)
  const normalizedPhase = moonPhase <= 0.5 ? moonPhase * 2 : (1 - moonPhase) * 2;
  // normalizedPhase: 0=new(covered), 1=full(no shadow)
  const shadowOffsetX = (1 - normalizedPhase) * moonR * 1.6;
  const isWaxing = moonPhase <= 0.5;
  const shadowCx = isWaxing ? cx - shadowOffsetX : cx + shadowOffsetX;

  const clipId = 'cabin-moon-clip';
  const glowId = 'cabin-moon-glow';

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ opacity: moonOpacity }}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={moonR} />
        </clipPath>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f5f0c1" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#f5f0c1" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Glow */}
      <circle cx={cx} cy={cy} r={moonR * 2} fill={`url(#${glowId})`} />
      {/* Moon disc */}
      <circle cx={cx} cy={cy} r={moonR} fill="#f5f0c1" />
      {/* Shadow overlay clipped to moon */}
      {normalizedPhase < 0.98 && (
        <circle
          cx={shadowCx}
          cy={cy}
          r={moonR}
          fill="#0c1445"
          clipPath={`url(#${clipId})`}
          opacity={0.92}
        />
      )}
    </svg>
  );
}

const CabinScene = ({ memberName, atmosphere = 'morning-mist', timeOfDay = 'morning', moonPhase = 0.5 }: CabinSceneProps) => {
  const skyGradient = SKY_GRADIENTS[timeOfDay] ?? SKY_GRADIENTS.morning;

  const atmosphereTint = useMemo(() => {
    return { tint: '#dcfce7', opacity: 0.08 };
  }, [atmosphere]);

  // Star visibility
  const starOpacity = useMemo(() => {
    if (timeOfDay === 'night') return 1;
    if (timeOfDay === 'dusk') return 0.7;
    if (timeOfDay === 'dawn') return 0.3;
    return 0;
  }, [timeOfDay]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl"
      style={{ aspectRatio: 'var(--cabin-scene-ratio, 3/1)' }}
    >
      <style>{`
        @media (max-width: 767px) { :root { --cabin-scene-ratio: 2/1; } }
        @media (min-width: 768px) { :root { --cabin-scene-ratio: 3/1; } }
        ${TWINKLE_CSS}
      `}</style>

      {/* Layer 1: sky-gradient + starfield */}
      <div
        className={layerBase}
        style={{ zIndex: 1, background: skyGradient, pointerEvents: 'none' }}
        data-layer="sky-gradient"
      >
        <Starfield opacity={starOpacity} />
      </div>

      {/* Layer 2: background-landscape */}
      <div className={layerBase} style={{ zIndex: 2, pointerEvents: 'none' }} data-layer="background-landscape" />

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

      {/* Layer 8: foreground-elements */}
      <div className={layerBase} style={{ zIndex: 8, pointerEvents: 'none' }} data-layer="foreground-elements" />

      {/* Layer 9: atmosphere-wash */}
      <div
        className={layerBase}
        style={{
          zIndex: 9, pointerEvents: 'none',
          backgroundColor: atmosphereTint.tint,
          opacity: atmosphereTint.opacity,
        }}
        data-layer="atmosphere-wash"
      />

      {/* Layer 10: ambient-particles */}
      <div className={layerBase} style={{ zIndex: 10, pointerEvents: 'none' }} data-layer="ambient-particles" />

      {/* Member name */}
      <div className="absolute bottom-0 left-0 px-5 pb-4" style={{ zIndex: 11 }}>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 22, fontWeight: 300, color: '#ffffff',
            textShadow: '0 1px 4px rgba(0,0,0,0.45)',
            margin: 0, lineHeight: 1.3,
          }}
        >
          {memberName}
        </h2>
      </div>
    </div>
  );
};

export default CabinScene;
