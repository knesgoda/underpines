import React from 'react';

const id = 'squirrel-anims';
if (typeof document !== 'undefined' && !document.getElementById(id)) {
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `
@keyframes squirrel-scamper {
  0% { transform: translateX(0) translateY(0); }
  15% { transform: translateX(18%) translateY(-4%); }
  30% { transform: translateX(36%) translateY(0); }
  50% { transform: translateX(55%) translateY(-3%); }
  70% { transform: translateX(75%) translateY(0); }
  100% { transform: translateX(100%); }
}
@keyframes squirrel-climb {
  0% { transform: translateX(40%) translateY(0) rotateZ(0); }
  30% { transform: translateX(42%) translateY(-30%) rotateZ(-70deg); }
  60%, 75% { transform: translateX(42%) translateY(-50%) rotateZ(-70deg); }
  100% { transform: translateX(42%) translateY(-50%) rotateZ(-70deg) scale(0.9); }
}
@keyframes squirrel-tail-flick {
  0%, 100% { transform: rotateZ(0); }
  30% { transform: rotateZ(8deg); }
  60% { transform: rotateZ(-5deg); }
}
  `;
  document.head.appendChild(s);
}

export default function Squirrel({ variant = 0, direction = 'ltr', className = '' }) {
  const anims = ['squirrel-scamper 3.5s ease-in-out forwards', 'squirrel-climb 4s ease-in-out forwards', 'squirrel-scamper 5s ease-in-out forwards'];
  const flip = direction === 'rtl' ? 'scaleX(-1)' : '';

  return (
    <svg viewBox="0 0 80 60" width="80" height="60" className={className}
      style={{ willChange: 'transform', animation: anims[variant % anims.length], transform: flip }}
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="55" rx="10" ry="2" fill="rgba(0,0,0,0.1)" />
      {/* Tail */}
      <path d="M26 44 Q16 30 20 22 Q24 16 28 24 Q30 32 30 40"
        fill="#a07040" stroke="#5a3a2a" strokeWidth="1"
        style={{ animation: variant === 2 ? 'squirrel-tail-flick 1.5s ease-in-out infinite' : 'none', transformOrigin: '30px 40px' }} />
      {/* Body */}
      <ellipse cx="38" cy="42" rx="12" ry="10" fill="#b08050" stroke="#5a3a2a" strokeWidth="1.2" />
      {/* Head */}
      <circle cx="50" cy="34" r="8" fill="#c09060" stroke="#5a3a2a" strokeWidth="1.2" />
      {/* Ear */}
      <path d="M47 27 Q46 22 49 23 Q51 24 49 28" fill="#c09060" stroke="#5a3a2a" strokeWidth="0.8" />
      <path d="M53 26 Q53 21 56 22 Q58 24 55 27" fill="#c09060" stroke="#5a3a2a" strokeWidth="0.8" />
      {/* Eye */}
      <circle cx="53" cy="32" r="1.8" fill="#1a1a0a" />
      <circle cx="53.5" cy="31.5" r="0.5" fill="#fff" />
      {/* Nose */}
      <circle cx="57" cy="35" r="1" fill="#3a2a1a" />
      {/* Belly */}
      <ellipse cx="40" cy="44" rx="7" ry="6" fill="#d8c0a0" />
      {/* Legs */}
      <rect x="32" y="49" width="3.5" height="5" rx="1.5" fill="#b08050" stroke="#5a3a2a" strokeWidth="0.7" />
      <rect x="42" y="49" width="3.5" height="5" rx="1.5" fill="#b08050" stroke="#5a3a2a" strokeWidth="0.7" />
    </svg>
  );
}
