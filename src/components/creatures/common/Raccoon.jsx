import React from 'react';

const id = 'raccoon-anims';
if (typeof document !== 'undefined' && !document.getElementById(id)) {
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `
@keyframes raccoon-shuffle {
  0% { transform: translateX(0); }
  50% { transform: translateX(50%) rotateZ(-2deg); }
  100% { transform: translateX(100%); }
}
@keyframes raccoon-standup {
  0% { transform: translateX(0) scaleY(1); }
  25% { transform: translateX(30%) scaleY(1); }
  35%, 55% { transform: translateX(35%) scaleY(1.12) translateY(-6%); }
  45% { transform: translateX(35%) scaleY(1.12) translateY(-6%) rotateZ(4deg); }
  50% { transform: translateX(35%) scaleY(1.12) translateY(-6%) rotateZ(-4deg); }
  65% { transform: translateX(35%) scaleY(1); }
  100% { transform: translateX(100%); }
}
  `;
  document.head.appendChild(s);
}

export default function Raccoon({ variant = 0, direction = 'ltr', className = '' }) {
  const anims = ['raccoon-shuffle 6s ease-in-out forwards', 'raccoon-standup 7s ease-in-out forwards'];
  const flip = direction === 'rtl' ? 'scaleX(-1)' : '';

  return (
    <svg viewBox="0 0 80 60" width="80" height="60" className={className}
      style={{ willChange: 'transform', animation: anims[variant % anims.length], transform: flip }}
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="55" rx="16" ry="3" fill="rgba(0,0,0,0.1)" />
      {/* Body */}
      <ellipse cx="38" cy="42" rx="18" ry="13" fill="#7a7a7a" stroke="#3a3a3a" strokeWidth="1.2" />
      {/* Head */}
      <circle cx="56" cy="36" r="10" fill="#8a8a8a" stroke="#3a3a3a" strokeWidth="1.2" />
      {/* Mask */}
      <path d="M48 33 Q52 30 56 33 Q60 30 64 33 Q60 36 56 34 Q52 36 48 33Z" fill="#2a2a2a" />
      {/* Eyes */}
      <circle cx="52" cy="33" r="1.6" fill="#eee" />
      <circle cx="52" cy="33" r="0.8" fill="#1a1a1a" />
      <circle cx="60" cy="33" r="1.6" fill="#eee" />
      <circle cx="60" cy="33" r="0.8" fill="#1a1a1a" />
      {/* Nose */}
      <ellipse cx="56" cy="37" rx="1.5" ry="1" fill="#2a2a2a" />
      {/* Ears */}
      <circle cx="50" cy="28" r="3" fill="#6a6a6a" stroke="#3a3a3a" strokeWidth="0.8" />
      <circle cx="62" cy="28" r="3" fill="#6a6a6a" stroke="#3a3a3a" strokeWidth="0.8" />
      {/* Tail - ringed */}
      <path d="M20 40 Q14 36 12 40 Q10 44 16 44 Q18 42 20 44" stroke="#3a3a3a" strokeWidth="1.2" fill="#7a7a7a" />
      <path d="M16 38 L14 40" stroke="#3a3a3a" strokeWidth="1.5" />
      <path d="M18 40 L15 42" stroke="#3a3a3a" strokeWidth="1.5" />
      {/* Legs */}
      <rect x="30" y="50" width="4" height="6" rx="2" fill="#6a6a6a" stroke="#3a3a3a" strokeWidth="0.8" />
      <rect x="44" y="50" width="4" height="6" rx="2" fill="#6a6a6a" stroke="#3a3a3a" strokeWidth="0.8" />
    </svg>
  );
}
