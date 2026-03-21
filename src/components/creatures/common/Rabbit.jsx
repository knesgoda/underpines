import React from 'react';

const style = document.createElement('style');
style.textContent = `
@keyframes rabbit-hop {
  0%, 100% { transform: translateX(0) translateY(0); }
  10% { transform: translateX(12%) translateY(-18%); }
  20% { transform: translateX(24%) translateY(0); }
  35% { transform: translateX(40%) translateY(-16%); }
  45% { transform: translateX(56%) translateY(0); }
  60% { transform: translateX(72%) translateY(-14%); }
  70% { transform: translateX(88%) translateY(0); }
  85% { transform: translateX(100%) translateY(0); }
}
@keyframes rabbit-sit {
  0% { transform: translateX(0) scaleY(1); }
  20% { transform: translateX(30%) scaleY(1.08); }
  40%, 55% { transform: translateX(45%) scaleY(1.08); }
  50% { transform: translateX(45%) scaleY(1.08) rotateZ(-3deg); }
  53% { transform: translateX(45%) scaleY(1.08) rotateZ(3deg); }
  70% { transform: translateX(60%) translateY(-12%); }
  85% { transform: translateX(85%) translateY(0); }
  100% { transform: translateX(100%); }
}
@keyframes rabbit-nibble {
  0%, 15% { transform: translateX(0) rotateZ(0); }
  20% { transform: translateX(20%) rotateZ(8deg); }
  25% { transform: translateX(20%) rotateZ(5deg); }
  30% { transform: translateX(20%) rotateZ(8deg); }
  35% { transform: translateX(20%) rotateZ(5deg); }
  45% { transform: translateX(20%) rotateZ(0) scaleY(0.95); }
  55% { transform: translateX(20%) translateY(-10%); }
  70% { transform: translateX(60%) translateY(-6%); }
  85% { transform: translateX(100%) translateY(0); }
  100% { transform: translateX(110%); }
}
`;
if (typeof document !== 'undefined' && !document.getElementById('rabbit-anims')) {
  style.id = 'rabbit-anims';
  document.head.appendChild(style);
}

export default function Rabbit({ variant = 0, direction = 'ltr', className = '' }) {
  const anims = ['rabbit-hop 4s ease-in-out forwards', 'rabbit-sit 5s ease-in-out forwards', 'rabbit-nibble 5.5s ease-in-out forwards'];
  const flip = direction === 'rtl' ? 'scaleX(-1)' : '';

  return (
    <svg
      viewBox="0 0 80 60"
      width="80"
      height="60"
      className={className}
      style={{
        willChange: 'transform',
        animation: anims[variant % anims.length],
        transform: flip,
      }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shadow */}
      <ellipse cx="40" cy="54" rx="14" ry="3" fill="rgba(0,0,0,0.12)" />
      {/* Body */}
      <ellipse cx="40" cy="42" rx="16" ry="12" fill="#c4a882" stroke="#5a4a3a" strokeWidth="1.2" />
      {/* Head */}
      <circle cx="54" cy="34" r="9" fill="#d4b892" stroke="#5a4a3a" strokeWidth="1.2" />
      {/* Left ear */}
      <path d="M50 26 Q48 12 51 10 Q54 8 53 24" fill="#d4b892" stroke="#5a4a3a" strokeWidth="1" />
      <path d="M51 24 Q50 16 52 14" stroke="#c8907a" strokeWidth="0.8" fill="none" />
      {/* Right ear */}
      <path d="M56 24 Q55 8 58 6 Q61 5 59 22" fill="#d4b892" stroke="#5a4a3a" strokeWidth="1" />
      <path d="M57 22 Q56 14 58 10" stroke="#c8907a" strokeWidth="0.8" fill="none" />
      {/* Eye */}
      <circle cx="57" cy="32" r="1.8" fill="#2a1a0a" />
      <circle cx="57.6" cy="31.4" r="0.5" fill="#fff" />
      {/* Nose */}
      <ellipse cx="62" cy="34" rx="1.2" ry="0.8" fill="#b07060" />
      {/* Tail */}
      <circle cx="24" cy="38" r="4" fill="#e8ddd0" stroke="#5a4a3a" strokeWidth="0.8" />
      {/* Front leg */}
      <path d="M48 50 Q50 54 52 54" stroke="#5a4a3a" strokeWidth="1.2" fill="#c4a882" />
      {/* Back leg */}
      <path d="M30 46 Q28 54 32 54 Q34 52 34 48" stroke="#5a4a3a" strokeWidth="1.2" fill="#c4a882" />
    </svg>
  );
}
