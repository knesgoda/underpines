import React from 'react';

const id = 'otter-anims';
if (typeof document !== 'undefined' && !document.getElementById(id)) {
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `
@keyframes otter-roll {
  0% { transform: translateX(0) rotateZ(0); }
  25% { transform: translateX(25%) rotateZ(15deg); }
  50% { transform: translateX(50%) rotateZ(-10deg); }
  75% { transform: translateX(75%) rotateZ(8deg); }
  100% { transform: translateX(100%) rotateZ(0); }
}
@keyframes otter-slide {
  0% { transform: translateX(0) rotateZ(0); }
  30% { transform: translateX(20%) rotateZ(0); }
  40% { transform: translateX(30%) rotateZ(5deg) scaleY(0.85); }
  70% { transform: translateX(70%) rotateZ(3deg) scaleY(0.85); }
  85% { transform: translateX(85%) rotateZ(0) scaleY(1); }
  100% { transform: translateX(100%); }
}
  `;
  document.head.appendChild(s);
}

export default function Otter({ variant = 0, direction = 'ltr', className = '' }) {
  const anims = ['otter-roll 5s ease-in-out forwards', 'otter-slide 4.5s ease-in-out forwards'];
  const flip = direction === 'rtl' ? 'scaleX(-1)' : '';

  return (
    <svg viewBox="0 0 80 60" width="80" height="60" className={className}
      style={{ willChange: 'transform', animation: anims[variant % anims.length], transform: flip }}
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="55" rx="14" ry="2.5" fill="rgba(0,0,0,0.1)" />
      {/* Body — sleek and elongated */}
      <ellipse cx="36" cy="42" rx="18" ry="9" fill="#6a5040" stroke="#3a2a1a" strokeWidth="1.2" />
      {/* Belly */}
      <ellipse cx="38" cy="44" rx="12" ry="5" fill="#c4a882" />
      {/* Head */}
      <ellipse cx="56" cy="38" rx="8" ry="7" fill="#7a6050" stroke="#3a2a1a" strokeWidth="1.2" />
      {/* Muzzle */}
      <ellipse cx="62" cy="40" rx="4" ry="3" fill="#c4a882" stroke="#3a2a1a" strokeWidth="0.6" />
      {/* Nose */}
      <ellipse cx="65" cy="39" rx="1.2" ry="0.8" fill="#1a1a1a" />
      {/* Eyes */}
      <circle cx="56" cy="36" r="1.5" fill="#1a1a0a" />
      <circle cx="56.4" cy="35.5" r="0.4" fill="#fff" />
      {/* Ears */}
      <circle cx="52" cy="33" r="2" fill="#7a6050" stroke="#3a2a1a" strokeWidth="0.6" />
      <circle cx="58" cy="32" r="2" fill="#7a6050" stroke="#3a2a1a" strokeWidth="0.6" />
      {/* Whiskers */}
      <line x1="64" y1="39" x2="70" y2="37" stroke="#5a4a3a" strokeWidth="0.4" />
      <line x1="64" y1="40" x2="70" y2="40" stroke="#5a4a3a" strokeWidth="0.4" />
      <line x1="64" y1="41" x2="70" y2="43" stroke="#5a4a3a" strokeWidth="0.4" />
      {/* Tail */}
      <path d="M18 42 Q12 40 10 44 Q12 48 18 46" fill="#6a5040" stroke="#3a2a1a" strokeWidth="0.8" />
      {/* Legs */}
      <ellipse cx="30" cy="50" rx="3" ry="4" fill="#5a4030" stroke="#3a2a1a" strokeWidth="0.6" />
      <ellipse cx="44" cy="50" rx="3" ry="4" fill="#5a4030" stroke="#3a2a1a" strokeWidth="0.6" />
    </svg>
  );
}
