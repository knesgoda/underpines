import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface Waypoint {
  position: number; // percentage across screen
  pauseAt: number; // seconds
  caption: string;
  subcaption?: string;
}

const waypoints: Waypoint[] = [
  {
    position: 20,
    pauseAt: 8,
    caption: 'Your Cabin. It\'s yours to make feel like home.',
  },
  {
    position: 45,
    pauseAt: 14,
    caption: 'Campfires. How you talk to people here.',
    subcaption: 'No notifications unless you want them.',
  },
  {
    position: 70,
    pauseAt: 24,
    caption: 'Camps. Communities built around the things you love.',
  },
  {
    position: 92,
    pauseAt: 36,
    caption: 'Your Cabin is ready.',
  },
];

const WalkThroughWoods = ({ onComplete }: { onComplete: () => void }) => {
  const [elapsed, setElapsed] = useState(0);
  const [activeWaypoint, setActiveWaypoint] = useState(-1);
  const [showButton, setShowButton] = useState(false);
  const animRef = useRef<number>();
  const startRef = useRef<number>();

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const secs = (timestamp - startRef.current) / 1000;
      setElapsed(secs);

      // Determine active waypoint
      for (let i = waypoints.length - 1; i >= 0; i--) {
        if (secs >= waypoints[i].pauseAt) {
          setActiveWaypoint(i);
          break;
        }
      }

      if (secs >= 40) {
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

  // Calculate figure position
  const progress = Math.min(elapsed / 40, 1);
  const figureX = progress * 90 + 5; // 5% to 95%

  // Generate stars
  const stars = Array.from({ length: 25 }, (_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 40,
    delay: Math.random() * 3,
    size: Math.random() * 2 + 1,
  }));

  // Generate fireflies
  const fireflies = Array.from({ length: 6 }, (_, i) => ({
    x: 20 + Math.random() * 60,
    y: 40 + Math.random() * 30,
    delay: Math.random() * 5,
  }));

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 30%, #4c1d95 60%, #1e1b4b 100%)' }}>
      {/* Stars */}
      {stars.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            backgroundColor: 'white',
            animation: `twinkle ${2 + star.delay}s ease-in-out infinite`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}

      {/* Fireflies */}
      {fireflies.map((ff, i) => (
        <div
          key={`ff-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${ff.x}%`,
            top: `${ff.y}%`,
            width: 4,
            height: 4,
            backgroundColor: '#fde68a',
            boxShadow: '0 0 8px 2px rgba(253, 230, 138, 0.5)',
            animation: `firefly ${4 + ff.delay}s ease-in-out infinite`,
            animationDelay: `${ff.delay}s`,
          }}
        />
      ))}

      {/* Background trees — far layer */}
      <div className="absolute bottom-0 left-0 right-0" style={{ transform: `translateX(${-progress * 5}%)` }}>
        {[10, 25, 40, 55, 70, 85].map((x, i) => (
          <svg key={i} className="absolute bottom-0" style={{ left: `${x}%` }} width="60" height="120" viewBox="0 0 60 120">
            <path d="M30 10 L10 80 L50 80 Z" fill="#14532d" opacity="0.3" />
            <rect x="26" y="80" width="8" height="40" fill="#14532d" opacity="0.2" />
          </svg>
        ))}
      </div>

      {/* Mid trees */}
      <div className="absolute bottom-0 left-0 right-0" style={{ transform: `translateX(${-progress * 12}%)` }}>
        {[5, 20, 38, 52, 68, 80, 95].map((x, i) => (
          <svg key={i} className="absolute bottom-0" style={{ left: `${x}%` }} width="50" height="160" viewBox="0 0 50 160">
            <path d="M25 20 L8 100 L42 100 Z" fill="#166534" opacity="0.5" />
            <path d="M25 50 L5 130 L45 130 Z" fill="#166534" opacity="0.4" />
            <rect x="22" y="130" width="6" height="30" fill="#92400e" opacity="0.4" />
          </svg>
        ))}
      </div>

      {/* Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-24" style={{ background: 'linear-gradient(180deg, transparent, #052e16)' }} />

      {/* Walking figure */}
      <div
        className="absolute bottom-20 transition-none"
        style={{
          left: `${figureX}%`,
          transform: 'translateX(-50%)',
          willChange: 'left',
        }}
      >
        <svg width="24" height="48" viewBox="0 0 24 48" style={{ animation: 'walk-bob 0.6s ease-in-out infinite' }}>
          {/* Head */}
          <circle cx="12" cy="6" r="5" fill="#e2e8f0" />
          {/* Body */}
          <path d="M12 11 L12 30" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
          {/* Legs */}
          <path d="M12 30 L7 44" stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M12 30 L17 44" stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round" />
          {/* Arms */}
          <path d="M12 18 L5 26" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 18 L19 26" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      {/* Scene waypoints — cabin window, campfire, group fire, arrival cabin */}
      {/* Small cabin at 20% */}
      <svg className="absolute bottom-16" style={{ left: '18%', transform: `translateX(${-progress * 12}%)` }} width="40" height="36" viewBox="0 0 40 36">
        <path d="M20 2 L2 18 L38 18 Z" fill="#92400e" opacity="0.7" />
        <rect x="6" y="18" width="28" height="16" fill="#7c2d12" opacity="0.7" />
        <rect x="14" y="20" width="8" height="8" fill="#fde68a" opacity="0.6" />
      </svg>

      {/* Campfire at 45% */}
      <div className="absolute bottom-16" style={{ left: '43%', transform: `translateX(${-progress * 12}%)` }}>
        <div className="w-3 h-3 rounded-full bg-amber-light" style={{ animation: 'firefly 2s ease-in-out infinite', boxShadow: '0 0 12px 4px rgba(251, 146, 60, 0.4)' }} />
      </div>

      {/* Caption area */}
      <div className="absolute bottom-32 left-0 right-0 flex justify-center px-8">
        <AnimatePresence mode="wait">
          {activeWaypoint >= 0 && (
            <motion.div
              key={activeWaypoint}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-center max-w-lg"
            >
              <p className="text-lg font-display text-pine-light">
                {waypoints[activeWaypoint].caption}
              </p>
              {waypoints[activeWaypoint].subcaption && (
                <p className="text-sm text-pine-light/60 mt-2 font-body">
                  {waypoints[activeWaypoint].subcaption}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Step inside button */}
      <AnimatePresence>
        {showButton && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="absolute bottom-16 left-0 right-0 flex justify-center"
          >
            <Button
              onClick={onComplete}
              className="rounded-pill px-10 h-14 text-lg font-display bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 animate-breathing"
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
