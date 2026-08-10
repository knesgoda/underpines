/**
 * PrecipitationLayer — Rain, snow, hail & fog for CabinScene Layer 6.
 * Max 160 DOM elements. GPU-accelerated via will-change: transform.
 */

import { useMemo } from 'react';

// ─── Seeded random for deterministic layouts ───
function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

// ─── Wind angle mapping ───
const WIND_ANGLE: Record<string, number> = {
  calm: 0, light: 5, moderate: 15, strong: 30, extreme: 45,
};

// ─── CSS keyframes (injected once) ───
const PRECIP_CSS = `
@keyframes rain-fall {
  0%   { transform: translateY(-5%) rotate(var(--rain-angle, 0deg)); opacity: 0; }
  5%   { opacity: var(--rain-opacity, 0.5); }
  95%  { opacity: var(--rain-opacity, 0.5); }
  100% { transform: translateY(110vh) rotate(var(--rain-angle, 0deg)); opacity: 0; }
}
@keyframes snow-fall {
  0%   { transform: translate(0, -5%) rotate(0deg); opacity: 0; }
  5%   { opacity: var(--snow-opacity, 0.7); }
  50%  { transform: translate(var(--snow-drift, 15px), 50%) rotate(180deg); }
  95%  { opacity: var(--snow-opacity, 0.7); }
  100% { transform: translate(0, 110vh) rotate(360deg); opacity: 0; }
}
@keyframes hail-fall {
  0%   { transform: translateY(-5%) rotate(var(--hail-angle, 0deg)); opacity: 0; }
  5%   { opacity: 0.8; }
  90%  { opacity: 0.7; }
  100% { transform: translateY(110vh) rotate(var(--hail-angle, 0deg)); opacity: 0; }
}
@keyframes fog-drift-1 { 0% { transform: translateX(-20%); } 100% { transform: translateX(30%); } }
@keyframes fog-drift-2 { 0% { transform: translateX(10%); } 100% { transform: translateX(-25%); } }
@keyframes fog-drift-3 { 0% { transform: translateX(-10%); } 100% { transform: translateX(20%); } }
`;

type Condition = string;
type RenderTimeOfDay = string;

interface PrecipitationLayerProps {
  condition: Condition;
  windIntensity: string;
  windDirection: number;
  isSnowing: boolean;
  isRaining: boolean;
  renderTime?: RenderTimeOfDay;
  moonPhase?: number;
  isGoldenHour?: boolean;
}

// ─── Rain particles ───
interface RainDrop { x: number; delay: number; duration: number; height: number; opacity: number; }

function useRainDrops(condition: Condition, windIntensity: string): RainDrop[] {
  return useMemo(() => {
    const isHeavy = condition === 'heavy-rain' || condition === 'thunderstorm';
    const isLight = condition === 'light-rain';
    if (!isHeavy && !isLight) return [];

    const baseCount = isHeavy ? 140 : 50;
    const count = Math.min(baseCount, 160);
    const rand = seededRandom(42);

    return Array.from({ length: count }, () => ({
      x: rand() * 100,
      delay: rand() * 2,
      duration: 0.6 + rand() * 0.4,
      height: 12 + rand() * 6,
      opacity: 0.4 + rand() * 0.3,
    }));
  }, [condition, windIntensity]);
}

// ─── Snow particles ───
interface SnowFlake { x: number; delay: number; duration: number; size: number; opacity: number; drift: number; }

function useSnowFlakes(condition: Condition, windIntensity: string): SnowFlake[] {
  return useMemo(() => {
    const isHeavy = condition === 'heavy-snow';
    const isLight = condition === 'light-snow';
    if (!isHeavy && !isLight) return [];

    const baseCount = isHeavy ? 120 : 40;
    const count = Math.min(baseCount, 160);
    const rand = seededRandom(77);
    const windDrift = windIntensity === 'strong' ? 30 : windIntensity === 'extreme' ? 50 :
      windIntensity === 'moderate' ? 20 : windIntensity === 'light' ? 10 : 5;

    return Array.from({ length: count }, () => ({
      x: rand() * 100,
      delay: rand() * 5,
      duration: 3 + rand() * 3,
      size: 2 + rand() * 2,
      opacity: 0.6 + rand() * 0.3,
      drift: (rand() - 0.5) * windDrift,
    }));
  }, [condition, windIntensity]);
}

// ─── Hail particles ───
interface HailStone { x: number; delay: number; duration: number; size: number; }

function useHailStones(condition: Condition): HailStone[] {
  return useMemo(() => {
    if (condition !== 'hail') return [];
    const count = 50;
    const rand = seededRandom(99);
    return Array.from({ length: count }, () => ({
      x: rand() * 100,
      delay: rand() * 1.5,
      duration: 0.3 + rand() * 0.2,
      size: 3 + rand() * 2,
    }));
  }, [condition]);
}

// ─── Mist overlay ───
function MistOverlay({ condition }: { condition: Condition }) {
  const isHeavyRain = condition === 'heavy-rain' || condition === 'thunderstorm';
  const isHeavySnow = condition === 'heavy-snow';
  if (!isHeavyRain && !isHeavySnow) return null;

  const opacity = isHeavySnow ? 0.16 : 0.11;
  return (
    <div className="absolute inset-0" style={{
      backgroundColor: 'white',
      opacity,
      transition: 'opacity 3s ease',
      pointerEvents: 'none',
    }} />
  );
}

// ─── Snow accumulation (white gradient on ground edges) ───
function SnowAccumulation({ isSnowing }: { isSnowing: boolean }) {
  if (!isSnowing) return null;
  return (
    <div className="absolute bottom-0 left-0 right-0" style={{
      height: '18%',
      background: 'linear-gradient(to top, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 40%, transparent 100%)',
      opacity: 1,
      animation: 'fade-in 30s ease-out forwards',
      pointerEvents: 'none',
    }} />
  );
}

// ─── Fog bands ───
function FogLayer({ renderTime, moonPhase, isGoldenHour }: {
  renderTime: string; moonPhase: number; isGoldenHour: boolean;
}) {
  const isNight = renderTime === 'night' || renderTime === 'dusk';
  const hasMoonlight = isNight && moonPhase > 0.2;

  // Tint: night+moon = blue, golden hour = amber, default = white
  const fogColor = hasMoonlight ? '#b8c8e8' : isGoldenHour ? '#e8c89a' : '#ffffff';

  const bands = [
    { y: '80%', h: '22%', opacity: 0.35, blur: 10, anim: 'fog-drift-1', dur: 90 },
    { y: '48%', h: '22%', opacity: 0.20, blur: 12, anim: 'fog-drift-2', dur: 110 },
    { y: '38%', h: '22%', opacity: 0.12, blur: 8,  anim: 'fog-drift-3', dur: 140 },
  ];

  return (
    <>
      {bands.map((b, i) => (
        <svg
          key={`fog-${i}`}
          className="absolute"
          style={{
            top: b.y, left: '-30%', width: '160%', height: b.h,
            opacity: b.opacity,
            animation: `${b.anim} ${b.dur}s ease-in-out infinite alternate`,
            pointerEvents: 'none',
          }}
          viewBox="0 0 200 30"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id={`fog-blur-${i}`}>
              <feGaussianBlur stdDeviation={b.blur} />
            </filter>
          </defs>
          <ellipse
            cx="100" cy="15" rx="110" ry="14"
            fill={fogColor}
            filter={`url(#fog-blur-${i})`}
          />
        </svg>
      ))}
    </>
  );
}

// ─── Main component ───
export default function PrecipitationLayer({
  condition, windIntensity, windDirection, isSnowing, isRaining,
  renderTime = 'morning', moonPhase = 0.5, isGoldenHour = false,
}: PrecipitationLayerProps) {
  const rainDrops = useRainDrops(condition, windIntensity);
  const snowFlakes = useSnowFlakes(condition, windIntensity);
  const hailStones = useHailStones(condition);

  const rainAngle = (WIND_ANGLE[windIntensity] || 0) * (windDirection < 180 ? 1 : -1);
  const hailAngle = rainAngle * 1.2;
  const showRain = rainDrops.length > 0;
  const showSnow = snowFlakes.length > 0;
  const showHail = hailStones.length > 0;
  const showFog = condition === 'fog';

  if (!showRain && !showSnow && !showHail && !showFog) return null;

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ pointerEvents: 'none' }}>
      <style>{PRECIP_CSS}</style>

      <MistOverlay condition={condition} />

      {/* Fog */}
      {showFog && (
        <FogLayer renderTime={renderTime} moonPhase={moonPhase} isGoldenHour={isGoldenHour} />
      )}

      {/* Rain */}
      {showRain && rainDrops.map((drop, i) => (
        <div
          key={`r${i}`}
          style={{
            position: 'absolute',
            left: `${drop.x}%`,
            top: 0,
            width: 2,
            height: drop.height,
            backgroundColor: 'rgba(255,255,255,0.5)',
            borderRadius: 1,
            willChange: 'transform',
            '--rain-angle': `${rainAngle}deg`,
            '--rain-opacity': `${drop.opacity}`,
            animation: `rain-fall ${drop.duration}s linear infinite`,
            animationDelay: `${drop.delay}s`,
          } as React.CSSProperties}
        />
      ))}

      {/* Snow */}
      {showSnow && snowFlakes.map((flake, i) => (
        <div
          key={`s${i}`}
          style={{
            position: 'absolute',
            left: `${flake.x}%`,
            top: 0,
            width: flake.size,
            height: flake.size,
            borderRadius: '50%',
            backgroundColor: 'white',
            willChange: 'transform',
            '--snow-opacity': `${flake.opacity}`,
            '--snow-drift': `${flake.drift}px`,
            animation: `snow-fall ${flake.duration}s ease-in-out infinite`,
            animationDelay: `${flake.delay}s`,
          } as React.CSSProperties}
        />
      ))}

      {/* Hail */}
      {showHail && hailStones.map((stone, i) => (
        <div
          key={`h${i}`}
          style={{
            position: 'absolute',
            left: `${stone.x}%`,
            top: 0,
            width: stone.size,
            height: stone.size,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.85)',
            willChange: 'transform',
            '--hail-angle': `${hailAngle}deg`,
            animation: `hail-fall ${stone.duration}s linear infinite`,
            animationDelay: `${stone.delay}s`,
            boxShadow: '0 8px 1px rgba(255,255,255,0.3)',
          } as React.CSSProperties}
        />
      ))}

      <SnowAccumulation isSnowing={isSnowing} />
    </div>
  );
}
