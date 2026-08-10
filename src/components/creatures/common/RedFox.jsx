import React from 'react';

const id = 'redfox-anims';
if (typeof document !== 'undefined' && !document.getElementById(id)) {
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `
@keyframes fox-trot {
  0% { transform: translateX(0) rotateZ(0); }
  12% { transform: translateX(10%) rotateZ(-1deg); }
  25% { transform: translateX(22%) rotateZ(1deg); }
  50% { transform: translateX(50%) rotateZ(-1deg); }
  75% { transform: translateX(75%) rotateZ(1deg); }
  100% { transform: translateX(100%) rotateZ(0); }
}
@keyframes fox-pause {
  0% { transform: translateX(0); }
  35% { transform: translateX(35%); }
  40%, 60% { transform: translateX(38%) scaleX(1); }
  48% { transform: translateX(38%) scaleX(-1); }
  52% { transform: translateX(38%) scaleX(-1); }
  56% { transform: translateX(38%) scaleX(1); }
  70% { transform: translateX(55%); }
  100% { transform: translateX(100%); }
}
  `;
  document.head.appendChild(s);
}

export default function RedFox({ variant = 0, direction = 'ltr', className = '' }) {
  const anims = ['fox-trot 5s ease-in-out forwards', 'fox-pause 6.5s ease-in-out forwards'];
  const flip = direction === 'rtl' ? 'scaleX(-1)' : '';

  return (
    <svg viewBox="0 0 80 60" width="80" height="60" className={className}
      style={{ willChange: 'transform', animation: anims[variant % anims.length], transform: flip }}
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="56" rx="16" ry="2.5" fill="rgba(0,0,0,0.1)" />
      {/* Tail */}
      <path d="M14 40 Q8 34 10 28 Q14 24 18 30 Q20 36 22 42"
        fill="#d4743a" stroke="#6a3a1a" strokeWidth="1" />
      <path d="M10 28 Q12 26 14 28" fill="#fff" stroke="none" />
      {/* Body */}
      <ellipse cx="36" cy="40" rx="16" ry="11" fill="#d4743a" stroke="#6a3a1a" strokeWidth="1.2" />
      {/* Belly */}
      <ellipse cx="38" cy="44" rx="10" ry="6" fill="#e8d0b0" />
      {/* Head */}
      <path d="M52 28 Q58 24 64 30 Q62 38 56 40 Q50 38 48 32 Q48 28 52 28Z"
        fill="#d4743a" stroke="#6a3a1a" strokeWidth="1.2" />
      {/* Muzzle */}
      <path d="M60 32 Q64 34 62 36 Q58 38 56 36"
        fill="#e8d0b0" stroke="#6a3a1a" strokeWidth="0.8" />
      {/* Ears */}
      <path d="M50 28 Q48 18 52 20 Q54 22 52 28" fill="#d4743a" stroke="#6a3a1a" strokeWidth="0.8" />
      <path d="M56 26 Q55 16 59 18 Q61 20 58 26" fill="#d4743a" stroke="#6a3a1a" strokeWidth="0.8" />
      <path d="M50 26 Q49 22 51 22" fill="#2a1a0a" />
      <path d="M57 24 Q56 20 58 20" fill="#2a1a0a" />
      {/* Eye */}
      <circle cx="54" cy="30" r="1.8" fill="#3a6a1a" />
      <circle cx="54" cy="30" r="1" fill="#1a1a0a" />
      <circle cx="54.4" cy="29.5" r="0.4" fill="#fff" />
      {/* Nose */}
      <circle cx="63" cy="33" r="1.2" fill="#1a1a1a" />
      {/* Legs */}
      <rect x="28" y="48" width="3.5" height="7" rx="1.5" fill="#6a3a1a" stroke="#4a2a0a" strokeWidth="0.6" />
      <rect x="42" y="48" width="3.5" height="7" rx="1.5" fill="#6a3a1a" stroke="#4a2a0a" strokeWidth="0.6" />
    </svg>
  );
}
