import React from 'react';

const id = 'badger-anims';
if (typeof document !== 'undefined' && !document.getElementById(id)) {
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `
@keyframes badger-waddle {
  0% { transform: translateX(0) rotateZ(0); }
  12% { transform: translateX(10%) rotateZ(-2deg); }
  25% { transform: translateX(22%) rotateZ(2deg); }
  37% { transform: translateX(35%) rotateZ(-2deg); }
  50% { transform: translateX(50%) rotateZ(2deg); }
  75% { transform: translateX(75%) rotateZ(-1deg); }
  100% { transform: translateX(100%) rotateZ(0); }
}
@keyframes badger-dig {
  0% { transform: translateX(0); }
  30% { transform: translateX(30%); }
  35%, 50% { transform: translateX(32%) rotateZ(6deg); }
  40% { transform: translateX(32%) rotateZ(-4deg); }
  45% { transform: translateX(32%) rotateZ(5deg); }
  60% { transform: translateX(40%) rotateZ(0); }
  100% { transform: translateX(100%); }
}
  `;
  document.head.appendChild(s);
}

export default function Badger({ variant = 0, direction = 'ltr', className = '' }) {
  const anims = ['badger-waddle 5.5s ease-in-out forwards', 'badger-dig 6s ease-in-out forwards'];
  const flip = direction === 'rtl' ? 'scaleX(-1)' : '';

  return (
    <svg viewBox="0 0 80 60" width="80" height="60" className={className}
      style={{ willChange: 'transform', animation: anims[variant % anims.length], transform: flip }}
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="56" rx="18" ry="2.5" fill="rgba(0,0,0,0.1)" />
      {/* Body — low and wide */}
      <ellipse cx="38" cy="46" rx="20" ry="10" fill="#5a5a5a" stroke="#2a2a2a" strokeWidth="1.2" />
      {/* White stripe on body */}
      <path d="M18 46 Q28 42 38 42 Q48 42 58 46" stroke="#e8e4e0" strokeWidth="2.5" fill="none" />
      {/* Head */}
      <ellipse cx="58" cy="44" rx="10" ry="8" fill="#3a3a3a" stroke="#2a2a2a" strokeWidth="1.2" />
      {/* Face stripe */}
      <path d="M58 36 L58 48" stroke="#e8e4e0" strokeWidth="3" strokeLinecap="round" />
      {/* Eyes */}
      <circle cx="55" cy="42" r="1.2" fill="#eee" />
      <circle cx="61" cy="42" r="1.2" fill="#eee" />
      {/* Nose */}
      <ellipse cx="66" cy="44" rx="1.5" ry="1" fill="#1a1a1a" />
      {/* Legs */}
      <rect x="28" y="52" width="5" height="5" rx="2" fill="#4a4a4a" stroke="#2a2a2a" strokeWidth="0.8" />
      <rect x="46" y="52" width="5" height="5" rx="2" fill="#4a4a4a" stroke="#2a2a2a" strokeWidth="0.8" />
    </svg>
  );
}
