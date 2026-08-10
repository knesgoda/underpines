/**
 * AlwaysPresentHover — Memorial companion animation for hummingbirds.
 *
 * Cycles through 4 position sets every 3–5 minutes:
 *  1. Hovering near flowers (wings blurred, slight float)
 *  2. Darting to a new position (0.5s quick move)
 *  3. Perched on branch (rare, 10% of time, wings folded, still)
 *  4. Hovering in open space, looking around
 *
 * Transition between positions: 0.3s dart.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';

const id = 'comp-hummer-hover';
if (typeof document !== 'undefined' && !document.getElementById(id)) {
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `
@keyframes hummer-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
@keyframes hummer-wing-blur{0%{opacity:0.3}50%{opacity:0.8}100%{opacity:0.3}}
@keyframes hummer-dart{0%{transform:translate(var(--dart-from-x),var(--dart-from-y))}100%{transform:translate(var(--dart-to-x),var(--dart-to-y))}}
@keyframes hummer-look{0%,40%{transform:rotate(0)}45%{transform:rotate(10deg)}55%{transform:rotate(-8deg)}60%,100%{transform:rotate(0)}}
`;
  document.head.appendChild(s);
}

// Position configs: { x%, y%, mode }
const POSITIONS = [
  { x: 35, y: 45, mode: 'hover-flower' },
  { x: 60, y: 38, mode: 'hover-open' },
  { x: 22, y: 42, mode: 'hover-flower' },
  { x: 50, y: 35, mode: 'perched' },
  { x: 70, y: 40, mode: 'hover-open' },
  { x: 40, y: 48, mode: 'hover-flower' },
];

function pickNextPosition(current) {
  // 10% chance of perched (index 3)
  if (Math.random() < 0.1) return 3;
  let next;
  do { next = Math.floor(Math.random() * POSITIONS.length); } while (next === current);
  return next;
}

export default function AlwaysPresentHover({ isRaining = false, className = '' }) {
  const [posIdx, setPosIdx] = useState(0);
  const [darting, setDarting] = useState(false);
  const timerRef = useRef(null);

  const cyclePosition = useCallback(() => {
    setDarting(true);
    setTimeout(() => {
      setPosIdx(prev => pickNextPosition(prev));
      setDarting(false);
    }, 300); // 0.3s dart
  }, []);

  useEffect(() => {
    const interval = (180 + Math.random() * 120) * 1000; // 3–5 min
    timerRef.current = setInterval(cyclePosition, interval);
    return () => clearInterval(timerRef.current);
  }, [cyclePosition]);

  const pos = POSITIONS[posIdx];
  const isPerched = pos.mode === 'perched';
  const isNearFlower = pos.mode === 'hover-flower';

  return (
    <div className={className} style={{
      position: 'absolute',
      left: `${pos.x}%`,
      top: `${pos.y}%`,
      transition: darting ? 'left 0.3s ease-in-out, top 0.3s ease-in-out' : 'left 0.5s ease, top 0.5s ease',
      pointerEvents: 'none',
      zIndex: 9,
    }} aria-hidden="true">
      <div style={{
        animation: isPerched ? 'none' : 'hummer-float 1.5s ease-in-out infinite',
      }}>
        <svg viewBox="0 0 30 24" width="30" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Body — tiny, iridescent */}
          <ellipse cx="15" cy="12" rx="4" ry="3" fill="#2a8a4a" stroke="#1a5a2a" strokeWidth="0.5"/>
          {/* Iridescent throat */}
          <ellipse cx="18" cy="11" rx="2" ry="2" fill="#4ac87a" opacity="0.6"/>

          {/* Head */}
          <circle cx="20" cy="9" r="2.5" fill="#2a7a3a" stroke="#1a5a2a" strokeWidth="0.4"/>
          {/* Eye */}
          <circle cx="21" cy="8.5" r="0.8" fill="#1a1a0a"/>
          <circle cx="21.2" cy="8.2" r="0.25" fill="#fff" opacity="0.6"/>
          {/* Beak — long, thin */}
          <line x1="22.5" y1="9" x2="28" y2="8.5" stroke="#2a2a1a" strokeWidth="0.6" strokeLinecap="round"/>

          {/* Tail */}
          <path d="M11 12 Q8 14 6 13 Q8 12 7 10" fill="#2a6a3a" stroke="#1a4a2a" strokeWidth="0.3"/>

          {isPerched ? (
            /* Wings folded — still, peaceful */
            <>
              <path d="M14 10 Q12 8 14 7 Q16 8 14 10" fill="#2a7a3a" opacity="0.7"/>
              {/* Tiny feet gripping branch */}
              <line x1="14" y1="15" x2="13" y2="17" stroke="#3a3a2a" strokeWidth="0.4"/>
              <line x1="16" y1="15" x2="17" y2="17" stroke="#3a3a2a" strokeWidth="0.4"/>
              {/* Branch */}
              <line x1="8" y1="17" x2="22" y2="17" stroke="#5c4033" strokeWidth="0.8" strokeLinecap="round"/>
            </>
          ) : (
            /* Wings — blur effect */
            <>
              <ellipse cx="13" cy="8" rx="5" ry="2.5" fill="#3a9a5a" opacity="0.3"
                style={{ animation: 'hummer-wing-blur 20ms linear infinite' }}/>
              <ellipse cx="13" cy="8" rx="4" ry="2" fill="#4aaa6a" opacity="0.25"
                style={{ animation: 'hummer-wing-blur 20ms linear infinite 10ms' }}/>
            </>
          )}

          {/* Flower (only in hover-flower positions) */}
          {isNearFlower && !isRaining && (
            <g opacity="0.6">
              <line x1="26" y1="24" x2="26" y2="14" stroke="#4a8a3a" strokeWidth="0.5"/>
              <circle cx="26" cy="13" r="1.5" fill="#d06080"/>
              <circle cx="27" cy="12" r="1" fill="#e070a0" opacity="0.7"/>
            </g>
          )}

          {/* Rain shelter indicator */}
          {isRaining && !isPerched && (
            <g opacity="0.4">
              {/* Leaf overhang */}
              <path d="M8 4 Q15 2 22 4 Q15 6 8 4" fill="#4a8a3a" stroke="#2a5a2a" strokeWidth="0.3"/>
            </g>
          )}
        </svg>

        {/* Head looking around (open space mode) */}
        {pos.mode === 'hover-open' && (
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            animation: 'hummer-look 4s ease-in-out infinite',
            transformOrigin: '66% 37%',
          }}/>
        )}
      </div>
    </div>
  );
}
