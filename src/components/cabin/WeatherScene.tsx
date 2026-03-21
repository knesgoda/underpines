import { useMemo, useState, useEffect } from 'react';
import MoonPhase from './MoonPhase';
import { getMoonPhase, getMoonPhaseDescription, getStarOpacityForPhase } from '@/lib/moon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WeatherSceneProps {
  weatherCode?: number;
  windSpeed?: number;
  temperature?: number;
  hour?: number;
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  className?: string;
  reducedParticles?: boolean;
}

const getWeatherCondition = (code: number) => {
  if (code === 0) return 'clear';
  if ([1, 2].includes(code)) return 'partly-cloudy';
  if (code === 3) return 'overcast';
  if ([45, 48].includes(code)) return 'fog';
  if ([51, 53].includes(code)) return 'light-rain';
  if ([55, 61, 63].includes(code)) return 'rain';
  if ([65, 82].includes(code)) return 'heavy-rain';
  if ([71, 73].includes(code)) return 'light-snow';
  if ([75, 77].includes(code)) return 'heavy-snow';
  if ([80, 81].includes(code)) return 'rain-showers';
  if ([85, 86].includes(code)) return 'snow-showers';
  if ([95, 96, 99].includes(code)) return 'thunderstorm';
  return 'clear';
};

const getSkyGradient = (hour: number) => {
  if (hour >= 5 && hour < 7) return 'linear-gradient(180deg, #fde68a, #fb923c, #7c3aed)';
  if (hour >= 7 && hour < 12) return 'linear-gradient(180deg, #bfdbfe, #dbeafe)';
  if (hour >= 12 && hour < 17) return 'linear-gradient(180deg, #93c5fd, #60a5fa)';
  if (hour >= 17 && hour < 19) return 'linear-gradient(180deg, #fcd34d, #f97316, #dc2626)';
  if (hour >= 19 && hour < 20) return 'linear-gradient(180deg, #6d28d9, #1e1b4b)';
  return 'linear-gradient(180deg, #0f172a, #1e1b4b)';
};

const isNight = (hour: number) => hour < 5 || hour >= 20;
const isDusk = (hour: number) => hour >= 19 && hour < 20;

const getSeasonColor = (season: string) => {
  switch (season) {
    case 'spring': return '#86efac';
    case 'summer': return '#166534';
    case 'autumn': return '#d97706';
    case 'winter': return '#94a3b8';
    default: return '#166534';
  }
};

const getWindSway = (windSpeed: number) => {
  if (windSpeed > 40) return 4;
  if (windSpeed > 20) return 2;
  if (windSpeed > 8) return 1;
  return 0;
};

const WeatherScene = ({
  weatherCode = 0,
  windSpeed = 0,
  temperature,
  hour,
  season = 'summer',
  className = '',
  reducedParticles: reducedParticlesProp,
}: WeatherSceneProps) => {
  // Auto-reduce particles on mobile for GPU performance
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const reducedParticles = reducedParticlesProp ?? prefersReduced;
  const currentHour = hour ?? new Date().getHours();
  const condition = getWeatherCondition(weatherCode);
  const skyGradient = getSkyGradient(currentHour);
  const night = isNight(currentHour);
  const dusk = isDusk(currentHour);
  const treeColor = getSeasonColor(season);
  const sway = getWindSway(windSpeed);
  const particleMultiplier = reducedParticles ? 0.5 : 1;

  // Moon phase — recompute at midnight
  const [moonPhase, setMoonPhase] = useState(() => getMoonPhase());
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const ms = midnight.getTime() - now.getTime();
    const timer = setTimeout(() => setMoonPhase(getMoonPhase(new Date())), ms);
    return () => clearTimeout(timer);
  }, [moonPhase]);

  const starOpacity = getStarOpacityForPhase(moonPhase);

  const stars = useMemo(() =>
    Array.from({ length: 25 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 50,
      delay: Math.random() * 4,
      size: Math.random() * 2 + 0.5,
    })),
  []);

  const rainDrops = useMemo(() => {
    const count = condition === 'heavy-rain' ? 100 : condition === 'rain' ? 60 : 40;
    return Array.from({ length: Math.floor(count * particleMultiplier) }, (_, i) => ({
      x: Math.random() * 110 - 5,
      delay: Math.random() * 2,
      duration: 0.5 + Math.random() * 0.5,
      height: 12 + Math.random() * 8,
    }));
  }, [condition, particleMultiplier]);

  const snowFlakes = useMemo(() => {
    const count = condition === 'heavy-snow' ? 70 : 35;
    return Array.from({ length: Math.floor(count * particleMultiplier) }, (_, i) => ({
      x: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 4 + Math.random() * 4,
      size: 2 + Math.random() * 4,
    }));
  }, [condition, particleMultiplier]);

  const showRain = ['light-rain', 'rain', 'heavy-rain', 'rain-showers', 'thunderstorm'].includes(condition);
  const showSnow = ['light-snow', 'heavy-snow', 'snow-showers'].includes(condition);
  const showFog = condition === 'fog';

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} style={{ background: skyGradient }}>
      {/* Stars (night only) — opacity adjusts with moon brightness */}
      {night && stars.map((star, i) => (
        <div
          key={`star-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            backgroundColor: 'white',
            opacity: starOpacity,
            animation: `twinkle ${2 + star.delay}s ease-in-out infinite`,
            animationDelay: `${star.delay}s`,
            willChange: 'opacity',
          }}
        />
      ))}

      {/* Moon (dusk/night) — phase-accurate */}
      {(night || dusk) && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="absolute cursor-default"
                style={{ right: '15%', top: '12%' }}
              >
                <MoonPhase phase={moonPhase} size={24} />
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="bg-card/90 backdrop-blur-sm border-border text-foreground text-xs font-body px-3 py-1.5"
            >
              {getMoonPhaseDescription(moonPhase)}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Trees */}
      <div className="absolute bottom-0 left-0 right-0 h-full">
        {[8, 22, 50, 72, 90].map((x, i) => {
          const h = 80 + i * 15;
          const w = 40 + i * 5;
          return (
            <svg
              key={`tree-${i}`}
              className="absolute bottom-0"
              style={{
                left: `${x}%`,
                transform: `rotate(0deg)`,
                transformOrigin: 'bottom center',
                animation: sway > 0 ? `tree-sway ${3 - sway * 0.3}s ease-in-out infinite` : undefined,
                willChange: sway > 0 ? 'transform' : undefined,
              }}
              width={w}
              height={h}
              viewBox={`0 0 ${w} ${h}`}
            >
              <path d={`M${w / 2} ${h * 0.05} L${w * 0.15} ${h * 0.55} L${w * 0.85} ${h * 0.55} Z`} fill={treeColor} opacity="0.85" />
              <path d={`M${w / 2} ${h * 0.2} L${w * 0.08} ${h * 0.75} L${w * 0.92} ${h * 0.75} Z`} fill={treeColor} opacity="0.7" />
              {season === 'winter' ? null : (
                <path d={`M${w / 2} ${h * 0.35} L${w * 0.02} ${h * 0.9} L${w * 0.98} ${h * 0.9} Z`} fill={treeColor} opacity="0.55" />
              )}
              <rect x={w / 2 - 3} y={h * 0.85} width={6} height={h * 0.15} rx={2} fill="#92400e" opacity="0.6" />
            </svg>
          );
        })}
      </div>

      {/* Rain */}
      {showRain && rainDrops.map((drop, i) => (
        <div
          key={`rain-${i}`}
          className="absolute"
          style={{
            left: `${drop.x}%`,
            top: '-5%',
            width: 1.5,
            height: drop.height,
            backgroundColor: 'rgba(191, 219, 254, 0.4)',
            borderRadius: 1,
            animation: `rain-fall ${drop.duration}s linear infinite`,
            animationDelay: `${drop.delay}s`,
            transform: 'rotate(8deg)',
            willChange: 'transform',
          }}
        />
      ))}

      {/* Snow */}
      {showSnow && snowFlakes.map((flake, i) => (
        <div
          key={`snow-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${flake.x}%`,
            top: '-5%',
            width: flake.size,
            height: flake.size,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            animation: `snow-drift ${flake.duration}s ease-in-out infinite`,
            animationDelay: `${flake.delay}s`,
            willChange: 'transform, opacity',
          }}
        />
      ))}

      {/* Fog */}
      {showFog && (
        <div
          className="absolute inset-0 animate-fade-in"
          style={{
            background: 'rgba(255, 255, 255, 0.45)',
            transition: 'opacity 3s ease-out',
          }}
        />
      )}

      {/* Ground gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-16" style={{ background: 'linear-gradient(transparent, rgba(5, 46, 22, 0.8))' }} />
    </div>
  );
};

export default WeatherScene;
