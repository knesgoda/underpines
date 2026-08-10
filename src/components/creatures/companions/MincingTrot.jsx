/**
 * MincingTrot — Memorial companion animation for coyotes.
 *
 * ~8 seconds: proud, light-footed, bouncy trot with a mid-frame pause.
 * "Too dignified to run, too busy to walk."
 */
import React, { useState, useEffect, useMemo } from 'react';

const id = 'comp-coyote-trot';
if (typeof document !== 'undefined' && !document.getElementById(id)) {
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `
@keyframes coyote-trot-ltr{
  0%{transform:translateX(-8%);opacity:0}
  3%{opacity:1}
  100%{transform:translateX(108%)}
}
@keyframes coyote-trot-rtl{
  0%{transform:translateX(108%);opacity:0}
  3%{opacity:1}
  100%{transform:translateX(-8%)}
}
@keyframes coyote-bounce{
  0%,100%{transform:translateY(0) rotate(0)}
  25%{transform:translateY(-3px) rotate(0.5deg)}
  50%{transform:translateY(0) rotate(0)}
  75%{transform:translateY(-2px) rotate(-0.3deg)}
}
@keyframes coyote-legs{
  0%{transform:rotate(0)}
  25%{transform:rotate(15deg)}
  50%{transform:rotate(0)}
  75%{transform:rotate(-12deg)}
  100%{transform:rotate(0)}
}
@keyframes coyote-pause-look{
  0%,30%{transform:translateX(0)}
  35%{transform:translateX(2px)}
  65%{transform:translateX(2px)}
  70%,100%{transform:translateX(0)}
}
`;
  document.head.appendChild(s);
}

export default function MincingTrot({ direction = 'ltr', className = '', onComplete }) {
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);

  const dir = useMemo(() => {
    if (direction === 'random') return Math.random() < 0.5 ? 'ltr' : 'rtl';
    return direction;
  }, [direction]);

  // Pause at a random point (30–70% through the 8s animation = 2.4–5.6s)
  const pauseAt = useMemo(() => 2400 + Math.random() * 3200, []);

  useEffect(() => {
    const t1 = setTimeout(() => setPaused(true), pauseAt);
    const t2 = setTimeout(() => setPaused(false), pauseAt + 1500);
    const t3 = setTimeout(() => {
      setDone(true);
      onComplete?.();
    }, 8000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [pauseAt, onComplete]);

  if (done) return null;

  const flip = dir === 'rtl' ? 'scaleX(-1)' : '';

  return (
    <div className={className} style={{
      position: 'absolute', bottom: '16%', left: 0, width: '100%',
      pointerEvents: 'none', zIndex: 9,
    }}>
      <div style={{
        display: 'inline-block',
        animation: paused ? 'none' : `coyote-trot-${dir} 8s linear forwards`,
        animationPlayState: paused ? 'paused' : 'running',
        willChange: 'transform',
        transform: flip,
      }}>
        <div style={{
          animation: paused
            ? 'coyote-pause-look 1.5s ease-in-out forwards'
            : 'coyote-bounce 0.4s ease-in-out infinite',
        }}>
          <svg viewBox="0 0 70 50" width="70" height="50" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Body — lean, proud */}
            <ellipse cx="35" cy="24" rx="18" ry="9" fill="#b08a5a" stroke="#7a5a3a" strokeWidth="0.8"/>
            {/* Chest lighter */}
            <ellipse cx="48" cy="26" rx="6" ry="5" fill="#c0a070" opacity="0.5"/>
            {/* Head — held high */}
            <ellipse cx="56" cy="14" rx="7" ry="5.5" fill="#b08a5a" stroke="#7a5a3a" strokeWidth="0.7"/>
            {/* Neck — arched */}
            <path d="M50 20 Q52 16 54 14" stroke="#b08a5a" strokeWidth="4" fill="none"/>
            {/* Snout — pointed */}
            <ellipse cx="63" cy="14" rx="4" ry="2.5" fill="#c0a070"/>
            <ellipse cx="66" cy="13.5" rx="1.2" ry="0.8" fill="#3a2a1a"/>
            {/* Ears — tall, alert */}
            <path d="M52 10 L50 3 L54 8" fill="#b08a5a" stroke="#7a5a3a" strokeWidth="0.5"/>
            <path d="M57 9 L56 2 L59 7" fill="#b08a5a" stroke="#7a5a3a" strokeWidth="0.5"/>
            <path d="M51 8 L50 4 L53 7" fill="#c8a878" opacity="0.6"/>
            <path d="M56.5 7 L56 3 L58 6" fill="#c8a878" opacity="0.6"/>
            {/* Eye — bright, knowing */}
            <circle cx="58" cy="12.5" r="1.5" fill="#2a1a0a"/>
            <circle cx="58.3" cy="12" r="0.5" fill="#e8d8c0" opacity="0.6"/>
            {/* Front legs — doing their own thing */}
            <g style={{animation: paused ? 'none' : 'coyote-legs 0.35s ease-in-out infinite', transformOrigin: '44px 30px'}}>
              <rect x="43" y="30" width="3" height="14" rx="1.5" fill="#b08a5a" stroke="#7a5a3a" strokeWidth="0.4"/>
              <ellipse cx="44" cy="45" rx="2.5" ry="1.5" fill="#b08a5a"/>
            </g>
            <g style={{animation: paused ? 'none' : 'coyote-legs 0.35s ease-in-out infinite 0.17s', transformOrigin: '48px 30px'}}>
              <rect x="47" y="30" width="3" height="13" rx="1.5" fill="#a07a4a" stroke="#7a5a3a" strokeWidth="0.4"/>
              <ellipse cx="48" cy="44" rx="2.5" ry="1.5" fill="#a07a4a"/>
            </g>
            {/* Hind legs */}
            <g style={{animation: paused ? 'none' : 'coyote-legs 0.35s ease-in-out infinite 0.08s', transformOrigin: '26px 30px'}}>
              <rect x="25" y="29" width="3" height="14" rx="1.5" fill="#b08a5a" stroke="#7a5a3a" strokeWidth="0.4"/>
              <ellipse cx="26" cy="44" rx="2.5" ry="1.5" fill="#b08a5a"/>
            </g>
            <g style={{animation: paused ? 'none' : 'coyote-legs 0.35s ease-in-out infinite 0.25s', transformOrigin: '30px 30px'}}>
              <rect x="29" y="30" width="3" height="13" rx="1.5" fill="#a07a4a" stroke="#7a5a3a" strokeWidth="0.4"/>
              <ellipse cx="30" cy="44" rx="2.5" ry="1.5" fill="#a07a4a"/>
            </g>
            {/* Tail — up, bushy, confident */}
            <path d="M17 22 Q10 14 8 10 Q6 8 8 6" stroke="#b08a5a" strokeWidth="3" fill="none" strokeLinecap="round"/>
            <path d="M8 6 Q6 4 8 4 Q10 4 10 6" fill="#c0a070" opacity="0.6"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
