import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface Waypoint {
  position: number;
  pauseAt: number;
  resumeAt: number;
  caption: string;
  subcaption?: string;
}

const waypoints: Waypoint[] = [
  {
    position: 20,
    pauseAt: 6,
    resumeAt: 11,
    caption: 'Your Cabin. It\'s yours to make feel like home.',
  },
  {
    position: 45,
    pauseAt: 16,
    resumeAt: 22,
    caption: 'Campfires. How you talk to people here.',
    subcaption: 'No notifications unless you want them.',
  },
  {
    position: 70,
    pauseAt: 26,
    resumeAt: 32,
    caption: 'Camps. Communities built around the things you love.',
  },
  {
    position: 92,
    pauseAt: 35,
    resumeAt: 40,
    caption: 'Your Cabin is ready.',
  },
];

// Deterministic random with seed
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
};

const WalkThroughWoods = ({ onComplete }: { onComplete: () => void }) => {
  const [elapsed, setElapsed] = useState(0);
  const [activeWaypoint, setActiveWaypoint] = useState(-1);
  const [showButton, setShowButton] = useState(false);
  const animRef = useRef<number>();
  const startRef = useRef<number>();

  // Memoize all random positions so they don't regenerate on re-render
  const stars = useMemo(() =>
    Array.from({ length: 35 }, (_, i) => ({
      x: seededRandom(i * 3 + 1) * 100,
      y: seededRandom(i * 3 + 2) * 45,
      delay: seededRandom(i * 3 + 3) * 4,
      size: seededRandom(i * 7) * 2 + 0.5,
    })),
  []);

  const fireflies = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      x: 15 + seededRandom(i * 5 + 100) * 70,
      y: 35 + seededRandom(i * 5 + 101) * 35,
      delay: seededRandom(i * 5 + 102) * 6,
      duration: 3 + seededRandom(i * 5 + 103) * 4,
    })),
  []);

  // Far trees — very tall, slight silhouettes
  const farTrees = useMemo(() =>
    Array.from({ length: 9 }, (_, i) => ({
      x: i * 12 + seededRandom(i + 200) * 6,
      h: 100 + seededRandom(i + 210) * 60,
      w: 35 + seededRandom(i + 220) * 20,
    })),
  []);

  // Mid trees — more detail
  const midTrees = useMemo(() =>
    Array.from({ length: 11 }, (_, i) => ({
      x: i * 10 - 5 + seededRandom(i + 300) * 8,
      h: 120 + seededRandom(i + 310) * 80,
      w: 30 + seededRandom(i + 320) * 25,
    })),
  []);

  // Near trees — foreground silhouettes, larger
  const nearTrees = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => ({
      x: i * 25 + seededRandom(i + 400) * 10,
      h: 180 + seededRandom(i + 410) * 60,
      w: 50 + seededRandom(i + 420) * 30,
    })),
  []);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const secs = (timestamp - startRef.current) / 1000;
      setElapsed(secs);

      // Determine active waypoint — show caption between pauseAt and resumeAt
      let wp = -1;
      for (let i = waypoints.length - 1; i >= 0; i--) {
        if (secs >= waypoints[i].pauseAt && secs < waypoints[i].resumeAt + 2) {
          wp = i;
          break;
        }
      }
      setActiveWaypoint(wp);

      if (secs >= 42) {
        setShowButton(true);
        return;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Figure position — pauses at waypoints
  const getFigureX = (t: number) => {
    let effectiveTime = t;
    for (const wp of waypoints) {
      if (t > wp.pauseAt && t < wp.resumeAt) {
        effectiveTime = wp.pauseAt;
        break;
      } else if (t >= wp.resumeAt) {
        effectiveTime -= (wp.resumeAt - wp.pauseAt);
      }
    }
    const totalWalkTime = 42 - waypoints.reduce((a, w) => a + (w.resumeAt - w.pauseAt), 0);
    const progress = Math.min(effectiveTime / totalWalkTime, 1);
    return progress * 88 + 6;
  };

  const figureX = getFigureX(elapsed);
  const progress = Math.min(elapsed / 42, 1);

  // Is figure currently paused at a waypoint?
  const isPaused = waypoints.some(w => elapsed >= w.pauseAt && elapsed < w.resumeAt);

  return (
    <div className="fixed inset-0 overflow-hidden select-none" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 25%, #312e81 50%, #4c1d95 75%, #1e1b4b 100%)' }}>

      {/* Stars — twinkling night sky */}
      {stars.map((star, i) => (
        <div
          key={`s${i}`}
          className="absolute rounded-full"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            backgroundColor: i % 5 === 0 ? '#fef9c3' : 'white',
            animation: `twinkle ${2.5 + star.delay}s ease-in-out infinite`,
            animationDelay: `${star.delay}s`,
            willChange: 'opacity',
          }}
        />
      ))}

      {/* Crescent moon */}
      <div className="absolute" style={{ right: '12%', top: '8%' }}>
        <div
          className="rounded-full"
          style={{
            width: 28,
            height: 28,
            background: 'radial-gradient(circle at 35% 40%, #fef9c3 0%, #fde68a 100%)',
            boxShadow: '0 0 30px 8px rgba(254, 249, 195, 0.15), 0 0 60px 20px rgba(254, 249, 195, 0.06)',
          }}
        />
        {/* Moon shadow to make crescent */}
        <div
          className="absolute rounded-full"
          style={{
            width: 22,
            height: 22,
            top: -2,
            left: 10,
            background: '#1e1b4b',
          }}
        />
      </div>

      {/* Fireflies */}
      {fireflies.map((ff, i) => (
        <div
          key={`ff${i}`}
          className="absolute rounded-full"
          style={{
            left: `${ff.x}%`,
            top: `${ff.y}%`,
            width: 3,
            height: 3,
            backgroundColor: '#fde68a',
            boxShadow: '0 0 6px 2px rgba(253, 230, 138, 0.4)',
            animation: `firefly ${ff.duration}s ease-in-out infinite`,
            animationDelay: `${ff.delay}s`,
            willChange: 'opacity',
          }}
        />
      ))}

      {/* === PARALLAX TREE LAYERS === */}

      {/* Far layer — slowest movement, faintest */}
      <div
        className="absolute bottom-0 left-0 right-0 h-full"
        style={{ transform: `translateX(${-progress * 4}%)`, willChange: 'transform' }}
      >
        {farTrees.map((t, i) => (
          <svg
            key={`far${i}`}
            className="absolute bottom-0"
            style={{ left: `${t.x}%` }}
            width={t.w}
            height={t.h}
            viewBox={`0 0 ${t.w} ${t.h}`}
          >
            <path d={`M${t.w / 2} ${t.h * 0.1} L${t.w * 0.2} ${t.h * 0.7} L${t.w * 0.8} ${t.h * 0.7} Z`} fill="#14532d" opacity="0.2" />
            <path d={`M${t.w / 2} ${t.h * 0.3} L${t.w * 0.1} ${t.h * 0.85} L${t.w * 0.9} ${t.h * 0.85} Z`} fill="#14532d" opacity="0.15" />
            <rect x={t.w / 2 - 3} y={t.h * 0.82} width={6} height={t.h * 0.18} fill="#14532d" opacity="0.1" />
          </svg>
        ))}
      </div>

      {/* Mid layer — medium speed, medium opacity */}
      <div
        className="absolute bottom-0 left-0 right-0 h-full"
        style={{ transform: `translateX(${-progress * 10}%)`, willChange: 'transform' }}
      >
        {midTrees.map((t, i) => (
          <svg
            key={`mid${i}`}
            className="absolute bottom-0"
            style={{ left: `${t.x}%` }}
            width={t.w}
            height={t.h}
            viewBox={`0 0 ${t.w} ${t.h}`}
          >
            <path d={`M${t.w / 2} ${t.h * 0.05} L${t.w * 0.15} ${t.h * 0.4} L${t.w * 0.85} ${t.h * 0.4} Z`} fill="#166534" opacity="0.45" />
            <path d={`M${t.w / 2} ${t.h * 0.2} L${t.w * 0.08} ${t.h * 0.6} L${t.w * 0.92} ${t.h * 0.6} Z`} fill="#166534" opacity="0.35" />
            <path d={`M${t.w / 2} ${t.h * 0.35} L${t.w * 0.02} ${t.h * 0.8} L${t.w * 0.98} ${t.h * 0.8} Z`} fill="#166534" opacity="0.25" />
            <rect x={t.w / 2 - 3} y={t.h * 0.77} width={6} height={t.h * 0.23} rx={2} fill="#92400e" opacity="0.3" />
          </svg>
        ))}
      </div>

      {/* Near layer — fastest movement, most visible */}
      <div
        className="absolute bottom-0 left-0 right-0 h-full"
        style={{ transform: `translateX(${-progress * 20}%)`, willChange: 'transform' }}
      >
        {nearTrees.map((t, i) => (
          <svg
            key={`near${i}`}
            className="absolute bottom-0"
            style={{ left: `${t.x}%` }}
            width={t.w}
            height={t.h}
            viewBox={`0 0 ${t.w} ${t.h}`}
          >
            <path d={`M${t.w / 2} ${t.h * 0.02} L${t.w * 0.2} ${t.h * 0.35} L${t.w * 0.8} ${t.h * 0.35} Z`} fill="#052e16" opacity="0.7" />
            <path d={`M${t.w / 2} ${t.h * 0.15} L${t.w * 0.1} ${t.h * 0.55} L${t.w * 0.9} ${t.h * 0.55} Z`} fill="#052e16" opacity="0.6" />
            <path d={`M${t.w / 2} ${t.h * 0.3} L${t.w * 0.03} ${t.h * 0.75} L${t.w * 0.97} ${t.h * 0.75} Z`} fill="#052e16" opacity="0.5" />
            <rect x={t.w / 2 - 4} y={t.h * 0.72} width={8} height={t.h * 0.28} rx={2} fill="#1c0a00" opacity="0.5" />
          </svg>
        ))}
      </div>

      {/* Ground — layered for depth */}
      <div className="absolute bottom-0 left-0 right-0 h-28" style={{ background: 'linear-gradient(180deg, transparent 0%, #052e16 40%, #031a0d 100%)' }} />
      {/* Path / trail the figure walks on */}
      <div className="absolute bottom-12 left-0 right-0 h-3" style={{ background: 'linear-gradient(90deg, transparent 2%, rgba(92, 64, 14, 0.15) 10%, rgba(92, 64, 14, 0.2) 50%, rgba(92, 64, 14, 0.15) 90%, transparent 98%)', borderRadius: 4 }} />

      {/* === SCENE LANDMARKS (move with mid layer) === */}
      <div
        className="absolute bottom-0 left-0 right-0 h-full"
        style={{ transform: `translateX(${-progress * 10}%)`, willChange: 'transform' }}
      >
        {/* Waypoint 1: Cozy cabin with warm lit window */}
        <div className="absolute bottom-14" style={{ left: '18%' }}>
          <svg width="56" height="52" viewBox="0 0 56 52">
            {/* Roof */}
            <path d="M28 2 L2 24 L54 24 Z" fill="#7c2d12" opacity="0.8" />
            {/* Walls */}
            <rect x="6" y="24" width="44" height="24" fill="#92400e" opacity="0.75" />
            {/* Door */}
            <rect x="22" y="32" width="12" height="16" rx="2" fill="#7c2d12" opacity="0.9" />
            {/* Window left — warm glow */}
            <rect x="10" y="28" width="10" height="8" rx="1" fill="#fde68a" opacity="0.7" />
            {/* Window right */}
            <rect x="36" y="28" width="10" height="8" rx="1" fill="#fde68a" opacity="0.5" />
            {/* Chimney */}
            <rect x="38" y="6" width="6" height="18" fill="#7c2d12" opacity="0.6" />
          </svg>
          {/* Smoke from chimney */}
          <div className="absolute" style={{ left: 39, top: -8 }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: 4 + i * 2,
                  height: 4 + i * 2,
                  backgroundColor: 'rgba(203, 213, 225, 0.2)',
                  left: -i * 3,
                  top: -i * 8,
                  animation: `firefly ${3 + i}s ease-in-out infinite`,
                  animationDelay: `${i * 0.8}s`,
                }}
              />
            ))}
          </div>
          {/* Window light glow */}
          <div
            className="absolute rounded-full"
            style={{
              width: 40,
              height: 20,
              left: 8,
              bottom: 16,
              background: 'radial-gradient(ellipse, rgba(253, 230, 138, 0.15) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Waypoint 2: Campfire with two sitting figures */}
        <div className="absolute bottom-14" style={{ left: '43%' }}>
          {/* Fire */}
          <div className="relative">
            <div
              className="w-5 h-5 rounded-full"
              style={{
                background: 'radial-gradient(circle, #fbbf24, #f97316, #dc2626)',
                animation: 'firefly 1.5s ease-in-out infinite',
                boxShadow: '0 0 20px 8px rgba(251, 146, 60, 0.3), 0 -4px 12px rgba(251, 191, 36, 0.2)',
              }}
            />
            {/* Sparks */}
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: 2,
                  height: 2,
                  backgroundColor: '#fbbf24',
                  left: 6 + i * 4,
                  top: -4 - i * 3,
                  animation: `firefly ${1.5 + i * 0.5}s ease-in-out infinite`,
                  animationDelay: `${i * 0.4}s`,
                }}
              />
            ))}
          </div>
          {/* Two sitting figures */}
          <svg width="50" height="20" viewBox="0 0 50 20" className="absolute" style={{ left: -12, top: 4 }}>
            {/* Figure left */}
            <circle cx="8" cy="4" r="3" fill="#cbd5e1" opacity="0.5" />
            <path d="M8 7 L8 14 M5 10 L11 10 M6 18 L8 14 L10 18" stroke="#cbd5e1" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
            {/* Figure right */}
            <circle cx="42" cy="4" r="3" fill="#cbd5e1" opacity="0.5" />
            <path d="M42 7 L42 14 M39 10 L45 10 M40 18 L42 14 L44 18" stroke="#cbd5e1" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
          </svg>
          {/* Ground glow from fire */}
          <div
            className="absolute rounded-full"
            style={{
              width: 60,
              height: 16,
              left: -18,
              top: 8,
              background: 'radial-gradient(ellipse, rgba(251, 146, 60, 0.12) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Waypoint 3: Larger campfire with group */}
        <div className="absolute bottom-14" style={{ left: '68%' }}>
          {/* Larger fire */}
          <div className="relative">
            <div
              className="w-7 h-7 rounded-full"
              style={{
                background: 'radial-gradient(circle, #fbbf24, #f97316, #dc2626)',
                animation: 'firefly 1.2s ease-in-out infinite',
                boxShadow: '0 0 28px 12px rgba(251, 146, 60, 0.25), 0 -6px 16px rgba(251, 191, 36, 0.15)',
              }}
            />
          </div>
          {/* Group of 4-5 silhouettes */}
          <svg width="80" height="20" viewBox="0 0 80 20" className="absolute" style={{ left: -25, top: 6 }}>
            {[6, 18, 58, 70, 38].map((cx, i) => (
              <g key={i}>
                <circle cx={cx} cy="4" r="2.5" fill="#cbd5e1" opacity={0.35 + i * 0.03} />
                <path d={`M${cx} 6.5 L${cx} 13`} stroke="#cbd5e1" strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />
              </g>
            ))}
          </svg>
          <div
            className="absolute rounded-full"
            style={{
              width: 80,
              height: 20,
              left: -25,
              top: 10,
              background: 'radial-gradient(ellipse, rgba(251, 146, 60, 0.1) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Waypoint 4: Arrival cabin — door open, light inside */}
        <div className="absolute bottom-14" style={{ left: '90%' }}>
          <svg width="52" height="48" viewBox="0 0 52 48">
            <path d="M26 2 L2 22 L50 22 Z" fill="#7c2d12" opacity="0.85" />
            <rect x="6" y="22" width="40" height="22" fill="#92400e" opacity="0.8" />
            {/* Open door with interior light */}
            <rect x="18" y="26" width="14" height="18" rx="1" fill="#fde68a" opacity="0.5" />
            <rect x="18" y="26" width="14" height="18" rx="1" fill="url(#doorGlow)" />
            {/* Window */}
            <rect x="36" y="26" width="8" height="6" rx="1" fill="#fde68a" opacity="0.4" />
            <defs>
              <linearGradient id="doorGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fde68a" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.3" />
              </linearGradient>
            </defs>
          </svg>
          {/* Light spilling from door */}
          <div
            className="absolute"
            style={{
              width: 30,
              height: 12,
              left: 12,
              bottom: -4,
              background: 'radial-gradient(ellipse at top, rgba(253, 230, 138, 0.2) 0%, transparent 80%)',
              clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
            }}
          />
        </div>
      </div>

      {/* === PEARL GREY — the guide dog === */}
      <div
        className="absolute bottom-16 z-10"
        style={{
          left: `${figureX}%`,
          transform: 'translateX(-50%)',
          willChange: 'left',
        }}
      >
        <svg
          width="32"
          height="28"
          viewBox="0 0 32 28"
          style={{
            animation: isPaused ? 'pearl-grey-look 2s ease-in-out infinite' : 'walk-bob 0.5s ease-in-out infinite',
            willChange: 'transform',
          }}
        >
          {/* Body — stocky, muscular */}
          <ellipse cx="16" cy="18" rx="10" ry="7" fill="#7b8fa3" opacity="0.9" />
          {/* White chest patch */}
          <ellipse cx="16" cy="20" rx="4" ry="5" fill="#d1d9e0" opacity="0.7" />
          {/* Head — broad, blocky */}
          <ellipse cx="22" cy="10" rx="6" ry="5.5" fill="#8b9eb3" opacity="0.95" />
          {/* Lighter face */}
          <ellipse cx="23" cy="11" rx="4" ry="3.5" fill="#a8b8c8" opacity="0.7" />
          {/* Rose ears — soft, folded back */}
          <ellipse cx="18" cy="6" rx="2.5" ry="1.8" fill="#6e849a" opacity="0.8" transform="rotate(-15 18 6)" />
          <ellipse cx="26" cy="6" rx="2.5" ry="1.8" fill="#6e849a" opacity="0.8" transform="rotate(15 26 6)" />
          {/* Eyes — warm brown */}
          <circle cx="20.5" cy="9.5" r="1" fill="#5c3a1a" />
          <circle cx="24.5" cy="9.5" r="1" fill="#5c3a1a" />
          {/* Eye shine */}
          <circle cx="20.8" cy="9.2" r="0.4" fill="white" opacity="0.7" />
          <circle cx="24.8" cy="9.2" r="0.4" fill="white" opacity="0.7" />
          {/* Nose — wide, dark */}
          <ellipse cx="26" cy="11.5" rx="1.5" ry="1" fill="#3a3a4a" />
          {/* Smile line */}
          <path d="M24 13 Q26 14.5 27.5 13" stroke="#5a6a7a" strokeWidth="0.5" fill="none" opacity="0.6" />
          {/* Tongue peeking out */}
          <ellipse cx="25.5" cy="14" rx="1" ry="1.5" fill="#e8838a" opacity="0.7" />
          {/* Front legs — sturdy */}
          <rect x="11" y="22" width="3" height="5" rx="1" fill="#7b8fa3" opacity="0.85" />
          <rect x="18" y="22" width="3" height="5" rx="1" fill="#7b8fa3" opacity="0.85" />
          {/* White paw tips */}
          <rect x="11" y="25.5" width="3" height="1.5" rx="0.8" fill="#d1d9e0" opacity="0.6" />
          <rect x="18" y="25.5" width="3" height="1.5" rx="0.8" fill="#d1d9e0" opacity="0.6" />
          {/* Tail — low curve, wagging */}
          <path
            d="M6 16 Q3 13 4 10"
            stroke="#7b8fa3"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            opacity="0.8"
            style={{ animation: isPaused ? 'pearl-grey-wag 0.6s ease-in-out infinite' : undefined }}
          />
          {/* Forehead wrinkles */}
          <path d="M20 7.5 Q22 7 24 7.5" stroke="#6e849a" strokeWidth="0.3" fill="none" opacity="0.4" />
          <path d="M20.5 8 Q22 7.6 23.5 8" stroke="#6e849a" strokeWidth="0.3" fill="none" opacity="0.3" />
        </svg>
      </div>

      {/* === CAPTION AREA === */}
      <div className="absolute bottom-28 left-0 right-0 flex justify-center px-8 z-20">
        <AnimatePresence mode="wait">
          {activeWaypoint >= 0 && (
            <motion.div
              key={activeWaypoint}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="text-center max-w-md"
            >
              <p className="text-xl font-display leading-relaxed" style={{ color: '#dcfce7' }}>
                {waypoints[activeWaypoint].caption}
              </p>
              {waypoints[activeWaypoint].subcaption && (
                <p className="text-sm mt-3 font-body" style={{ color: 'rgba(220, 252, 231, 0.5)' }}>
                  {waypoints[activeWaypoint].subcaption}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* === STEP INSIDE BUTTON === */}
      <AnimatePresence>
        {showButton && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-12 left-0 right-0 flex justify-center z-30"
          >
            <Button
              onClick={onComplete}
              className="rounded-pill px-10 h-14 text-lg font-display bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-500 animate-breathing shadow-glow"
            >
              Step inside →
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WalkThroughWoods;
