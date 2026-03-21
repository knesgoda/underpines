import React from 'react';

const id = 'greyfox-anims';
if (typeof document !== 'undefined' && !document.getElementById(id)) {
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `
@keyframes greyfox-dash {
  0% { transform: translateX(0); }
  100% { transform: translateX(110%); }
}
@keyframes greyfox-pause {
  0% { transform: translateX(0); }
  40% { transform: translateX(40%); }
  45%, 55% { transform: translateX(42%); }
  50% { transform: translateX(42%) rotateZ(-2deg); }
  65% { transform: translateX(55%); }
  100% { transform: translateX(110%); }
}
  `;
  document.head.appendChild(s);
}

export default function GreyFox({ variant = 0, direction = 'ltr', className = '' }) {
  const anims = ['greyfox-dash 3s ease-in-out forwards', 'greyfox-pause 5s ease-in-out forwards'];
  const flip = direction === 'rtl' ? 'scaleX(-1)' : '';

  return (
    <svg viewBox="0 0 80 60" width="80" height="60" className={className}
      style={{ willChange: 'transform', animation: anims[variant % anims.length], transform: flip }}
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="56" rx="14" ry="2" fill="rgba(0,0,0,0.1)" />
      {/* Tail */}
      <path d="M16 42 Q10 36 12 30 Q16 28 18 34 Q20 38 22 42" fill="#9a9080" stroke="#5a5048" strokeWidth="1" />
      {/* Body */}
      <ellipse cx="36" cy="42" rx="15" ry="10" fill="#9a9080" stroke="#5a5048" strokeWidth="1.2" />
      <ellipse cx="38" cy="44" rx="9" ry="5" fill="#d4c8b8" />
      {/* Head */}
      <ellipse cx="54" cy="34" rx="9" ry="8" fill="#9a9080" stroke="#5a5048" strokeWidth="1.2" />
      <path d="M58 34 Q62 36 60 38 Q56 39 55 37" fill="#d4c8b8" stroke="#5a5048" strokeWidth="0.6" />
      {/* Ears */}
      <path d="M49 28 Q48 20 51 22 Q53 24 51 28" fill="#9a9080" stroke="#5a5048" strokeWidth="0.8" />
      <path d="M55 26 Q55 18 58 20 Q59 22 57 26" fill="#9a9080" stroke="#5a5048" strokeWidth="0.8" />
      {/* Eye */}
      <circle cx="53" cy="32" r="1.5" fill="#1a1a0a" />
      <circle cx="53.4" cy="31.5" r="0.4" fill="#fff" />
      {/* Nose */}
      <circle cx="61" cy="35" r="1" fill="#2a2a2a" />
      {/* Legs */}
      <rect x="28" y="49" width="3" height="6" rx="1.5" fill="#7a7068" stroke="#5a5048" strokeWidth="0.6" />
      <rect x="42" y="49" width="3" height="6" rx="1.5" fill="#7a7068" stroke="#5a5048" strokeWidth="0.6" />
    </svg>
  );
}
