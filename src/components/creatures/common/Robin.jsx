import React from 'react';

const id = 'robin-anims';
if (typeof document !== 'undefined' && !document.getElementById(id)) {
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `
@keyframes robin-hop {
  0% { transform: translateX(0); }
  12% { transform: translateX(10%) translateY(-8%); }
  18% { transform: translateX(18%) translateY(0); }
  30% { transform: translateX(30%) translateY(-6%); }
  36% { transform: translateX(38%) translateY(0); }
  50% { transform: translateX(52%) translateY(-7%); }
  56% { transform: translateX(60%) translateY(0); }
  100% { transform: translateX(100%); }
}
@keyframes robin-perch {
  0% { transform: translateX(30%) translateY(0); }
  20%, 45% { transform: translateX(40%) translateY(-15%); }
  35% { transform: translateX(40%) translateY(-15%) rotateZ(8deg); }
  40% { transform: translateX(40%) translateY(-15%) rotateZ(-5deg); }
  60% { transform: translateX(40%) translateY(-15%) rotateZ(6deg); }
  80%, 100% { transform: translateX(40%) translateY(-15%) rotateZ(0); }
}
  `;
  document.head.appendChild(s);
}

export default function Robin({ variant = 0, direction = 'ltr', className = '' }) {
  const anims = ['robin-hop 4.5s ease-in-out forwards', 'robin-perch 5s ease-in-out forwards'];
  const flip = direction === 'rtl' ? 'scaleX(-1)' : '';

  return (
    <svg viewBox="0 0 40 30" width="40" height="30" className={className}
      style={{ willChange: 'transform', animation: anims[variant % anims.length], transform: flip }}
      fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shadow */}
      <ellipse cx="20" cy="28" rx="6" ry="1.5" fill="rgba(0,0,0,0.1)" />
      {/* Body */}
      <ellipse cx="18" cy="18" rx="9" ry="7" fill="#7a6a5a" stroke="#4a3a2a" strokeWidth="0.8" />
      {/* Red breast */}
      <ellipse cx="20" cy="20" rx="6" ry="5" fill="#c84030" />
      {/* Head */}
      <circle cx="26" cy="13" r="5" fill="#5a5040" stroke="#4a3a2a" strokeWidth="0.8" />
      {/* Eye */}
      <circle cx="28" cy="12" r="1" fill="#1a1a1a" />
      <circle cx="28.3" cy="11.7" r="0.3" fill="#fff" />
      {/* Beak */}
      <path d="M30 13 L34 12 L30 14Z" fill="#d4a030" stroke="#8a6a20" strokeWidth="0.3" />
      {/* Wing */}
      <path d="M14 16 Q10 14 12 18 Q14 20 16 18" fill="#6a5a4a" stroke="#4a3a2a" strokeWidth="0.5" />
      {/* Tail */}
      <path d="M9 18 L5 16 L6 20Z" fill="#6a5a4a" stroke="#4a3a2a" strokeWidth="0.4" />
      {/* Legs */}
      <line x1="17" y1="24" x2="17" y2="27" stroke="#7a6040" strokeWidth="0.6" />
      <line x1="21" y1="24" x2="21" y2="27" stroke="#7a6040" strokeWidth="0.6" />
    </svg>
  );
}
