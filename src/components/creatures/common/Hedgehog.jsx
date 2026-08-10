import React from 'react';

const id = 'hedgehog-anims';
if (typeof document !== 'undefined' && !document.getElementById(id)) {
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `
@keyframes hedgehog-trundle {
  0% { transform: translateX(0); }
  100% { transform: translateX(100%); }
}
@keyframes hedgehog-curl {
  0% { transform: translateX(0) scaleX(1); }
  25% { transform: translateX(25%) scaleX(1); }
  30%, 60% { transform: translateX(28%) scaleX(0.85) scaleY(0.85); }
  65% { transform: translateX(30%) scaleX(1) scaleY(1); }
  100% { transform: translateX(100%); }
}
  `;
  document.head.appendChild(s);
}

export default function Hedgehog({ variant = 0, direction = 'ltr', className = '' }) {
  const anims = ['hedgehog-trundle 7s linear forwards', 'hedgehog-curl 8s ease-in-out forwards'];
  const flip = direction === 'rtl' ? 'scaleX(-1)' : '';

  return (
    <svg viewBox="0 0 60 45" width="60" height="45" className={className}
      style={{ willChange: 'transform', animation: anims[variant % anims.length], transform: flip }}
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="30" cy="42" rx="12" ry="2" fill="rgba(0,0,0,0.1)" />
      {/* Body spines */}
      <ellipse cx="28" cy="32" rx="16" ry="10" fill="#8a6a4a" stroke="#5a3a2a" strokeWidth="1" />
      {/* Spines */}
      {[0,1,2,3,4,5,6,7,8].map(i => {
        const angle = -140 + i * 20;
        const rad = angle * Math.PI / 180;
        const x1 = 28 + Math.cos(rad) * 12;
        const y1 = 30 + Math.sin(rad) * 8;
        const x2 = 28 + Math.cos(rad) * 18;
        const y2 = 30 + Math.sin(rad) * 13;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#6a4a2a" strokeWidth="1.2" strokeLinecap="round" />;
      })}
      {/* Face */}
      <ellipse cx="42" cy="34" rx="7" ry="6" fill="#d4b892" stroke="#5a3a2a" strokeWidth="1" />
      {/* Eye */}
      <circle cx="44" cy="32" r="1.2" fill="#1a1a0a" />
      <circle cx="44.4" cy="31.6" r="0.4" fill="#fff" />
      {/* Nose */}
      <circle cx="48" cy="34" r="1.2" fill="#2a2a2a" />
      {/* Tiny legs */}
      <rect x="24" y="38" width="3" height="4" rx="1.5" fill="#c4a882" stroke="#5a3a2a" strokeWidth="0.6" />
      <rect x="36" y="38" width="3" height="4" rx="1.5" fill="#c4a882" stroke="#5a3a2a" strokeWidth="0.6" />
    </svg>
  );
}
