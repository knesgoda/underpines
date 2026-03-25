/**
 * BearWaveSpecial — A special daily bear animation for user @joyo4.
 *
 * Once per calendar day, a bear walks in from the left, stops in the center,
 * sits up, waves a paw, then walks off to the right.
 * Tracked in localStorage so it only fires once per day.
 */

import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'bear_wave_last_shown';

// Inject keyframes once
const animId = 'bear-wave-special-anims';
if (typeof document !== 'undefined' && !document.getElementById(animId)) {
  const s = document.createElement('style');
  s.id = animId;
  s.textContent = `
@keyframes bear-walk-in {
  0% { transform: translateX(-15%) scaleX(1); }
  35% { transform: translateX(42%) scaleX(1); }
  100% { transform: translateX(42%) scaleX(1); }
}
@keyframes bear-sit-wave-walk {
  0% { transform: translateX(42%) scaleX(1) scaleY(1); }
  /* Sit up */
  8% { transform: translateX(42%) scaleX(1) scaleY(1.08); }
  /* Turn to face viewer */
  15% { transform: translateX(42%) scaleX(1) scaleY(1.08) rotateY(0deg); }
  /* Wave paw up */
  25% { transform: translateX(42%) scaleX(1) scaleY(1.08) rotateZ(-4deg); }
  30% { transform: translateX(42%) scaleX(1) scaleY(1.08) rotateZ(4deg); }
  35% { transform: translateX(42%) scaleX(1) scaleY(1.08) rotateZ(-3deg); }
  40% { transform: translateX(42%) scaleX(1) scaleY(1.08) rotateZ(3deg); }
  /* Hold */
  55% { transform: translateX(42%) scaleX(1) scaleY(1.08) rotateZ(0deg); }
  /* Turn and walk out */
  65% { transform: translateX(42%) scaleX(1) scaleY(1) rotateZ(0deg); }
  100% { transform: translateX(115%) scaleX(1); }
}
`;
  document.head.appendChild(s);
}

export default function BearWaveSpecial({ handle }) {
  const [phase, setPhase] = useState('idle'); // idle | walk-in | sit-wave | done

  useEffect(() => {
    if (handle !== 'joyo4') return;

    const today = new Date().toISOString().slice(0, 10);
    const lastShown = localStorage.getItem(STORAGE_KEY);
    if (lastShown === today) return;

    // Random delay 2-8 seconds
    const delay = 2000 + Math.random() * 6000;
    const t = setTimeout(() => {
      setPhase('walk-in');
      localStorage.setItem(STORAGE_KEY, today);
    }, delay);

    return () => clearTimeout(t);
  }, [handle]);

  useEffect(() => {
    if (phase === 'walk-in') {
      // Walk-in takes 4s, then transition to sit-wave
      const t = setTimeout(() => setPhase('sit-wave'), 4000);
      return () => clearTimeout(t);
    }
    if (phase === 'sit-wave') {
      // Sit-wave-walkout takes 7s
      const t = setTimeout(() => setPhase('done'), 7000);
      return () => clearTimeout(t);
    }
  }, [phase]);

  if (phase === 'idle' || phase === 'done') return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '62%',
        left: 0,
        width: '100%',
        height: 'auto',
        pointerEvents: 'none',
        zIndex: 7,
      }}
      aria-hidden="true"
    >
      <div
        style={{
          display: 'inline-block',
          willChange: 'transform',
          animation: phase === 'walk-in'
            ? 'bear-walk-in 4s ease-out forwards'
            : 'bear-sit-wave-walk 7s ease-in-out forwards',
        }}
      >
        <svg
          viewBox="0 0 120 90"
          width="120"
          height="90"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Shadow */}
          <ellipse cx="60" cy="82" rx="28" ry="5" fill="rgba(0,0,0,0.12)" />
          {/* Body */}
          <ellipse cx="60" cy="62" rx="28" ry="22" fill="#5a3e2b" stroke="#3a2a1a" strokeWidth="1.5" />
          {/* Head */}
          <circle cx="82" cy="44" r="16" fill="#6a4e3b" stroke="#3a2a1a" strokeWidth="1.5" />
          {/* Ears */}
          <circle cx="72" cy="30" r="5" fill="#5a3e2b" stroke="#3a2a1a" strokeWidth="1" />
          <circle cx="72" cy="30" r="2.5" fill="#8b6f5e" />
          <circle cx="92" cy="30" r="5" fill="#5a3e2b" stroke="#3a2a1a" strokeWidth="1" />
          <circle cx="92" cy="30" r="2.5" fill="#8b6f5e" />
          {/* Snout */}
          <ellipse cx="94" cy="48" rx="6" ry="5" fill="#7a5e4b" />
          <ellipse cx="94" cy="46" rx="2.5" ry="1.5" fill="#2a1a0a" />
          {/* Eyes */}
          <circle cx="78" cy="42" r="2.5" fill="#1a0a00" />
          <circle cx="78.8" cy="41.2" r="0.7" fill="#fff" />
          <circle cx="88" cy="42" r="2.5" fill="#1a0a00" />
          <circle cx="88.8" cy="41.2" r="0.7" fill="#fff" />
          {/* Front legs */}
          <path d="M72 78 Q74 84 78 84" stroke="#3a2a1a" strokeWidth="1.5" fill="#5a3e2b" />
          <path d="M52 78 Q50 84 46 84" stroke="#3a2a1a" strokeWidth="1.5" fill="#5a3e2b" />
          {/* Back legs */}
          <path d="M38 72 Q34 82 30 82" stroke="#3a2a1a" strokeWidth="1.5" fill="#5a3e2b" />
          {/* Paw (waves) */}
          {phase === 'sit-wave' && (
            <g style={{ transformOrigin: '78px 70px', animation: 'bear-sit-wave-walk 7s ease-in-out forwards' }}>
              <ellipse cx="90" cy="36" rx="4" ry="3" fill="#6a4e3b" stroke="#3a2a1a" strokeWidth="0.8" />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
