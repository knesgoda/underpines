import React from 'react';

const id = 'beaver-anims';
if (typeof document !== 'undefined' && !document.getElementById(id)) {
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `
@keyframes beaver-waddle {
  0% { transform: translateX(0) rotateZ(0); }
  12% { transform: translateX(10%) rotateZ(-2deg); }
  25% { transform: translateX(22%) rotateZ(2deg); }
  50% { transform: translateX(50%) rotateZ(-1deg); }
  75% { transform: translateX(75%) rotateZ(1deg); }
  100% { transform: translateX(100%) rotateZ(0); }
}
@keyframes beaver-chew {
  0% { transform: translateX(30%); }
  20%, 70% { transform: translateX(35%) scaleY(1); }
  30% { transform: translateX(35%) scaleY(0.96); }
  40% { transform: translateX(35%) scaleY(1.02); }
  50% { transform: translateX(35%) scaleY(0.97); }
  60% { transform: translateX(35%) scaleY(1.01); }
  85% { transform: translateX(35%); }
  100% { transform: translateX(100%); }
}
  `;
  document.head.appendChild(s);
}

export default function Beaver({ variant = 0, direction = 'ltr', className = '' }) {
  const anims = ['beaver-waddle 6s ease-in-out forwards', 'beaver-chew 7s ease-in-out forwards'];
  const flip = direction === 'rtl' ? 'scaleX(-1)' : '';

  return (
    <svg viewBox="0 0 80 60" width="80" height="60" className={className}
      style={{ willChange: 'transform', animation: anims[variant % anims.length], transform: flip }}
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="56" rx="14" ry="2.5" fill="rgba(0,0,0,0.1)" />
      {/* Flat tail */}
      <ellipse cx="16" cy="46" rx="8" ry="4" fill="#5a4030" stroke="#3a2a1a" strokeWidth="1" transform="rotate(-15 16 46)" />
      <path d="M16 42 L16 50" stroke="#4a3020" strokeWidth="0.6" />
      <path d="M12 44 L20 48" stroke="#4a3020" strokeWidth="0.6" />
      {/* Body */}
      <ellipse cx="36" cy="42" rx="16" ry="12" fill="#7a5a3a" stroke="#4a3020" strokeWidth="1.2" />
      {/* Head */}
      <circle cx="52" cy="36" r="9" fill="#8a6a4a" stroke="#4a3020" strokeWidth="1.2" />
      {/* Ears */}
      <circle cx="48" cy="29" r="2.5" fill="#7a5a3a" stroke="#4a3020" strokeWidth="0.6" />
      <circle cx="55" cy="28" r="2.5" fill="#7a5a3a" stroke="#4a3020" strokeWidth="0.6" />
      {/* Eye */}
      <circle cx="54" cy="34" r="1.6" fill="#1a1a0a" />
      <circle cx="54.4" cy="33.5" r="0.4" fill="#fff" />
      {/* Nose */}
      <ellipse cx="60" cy="36" rx="1.5" ry="1" fill="#2a1a0a" />
      {/* Teeth */}
      <rect x="57" y="38" width="2" height="3" rx="0.5" fill="#e8e0d0" stroke="#8a7a6a" strokeWidth="0.4" />
      <rect x="59.5" y="38" width="2" height="3" rx="0.5" fill="#e8e0d0" stroke="#8a7a6a" strokeWidth="0.4" />
      {/* Stick in mouth (variant 0) */}
      {variant === 0 && <line x1="56" y1="39" x2="74" y2="36" stroke="#8a6a3a" strokeWidth="1.5" strokeLinecap="round" />}
      {/* Legs */}
      <rect x="30" y="50" width="4" height="6" rx="2" fill="#6a4a2a" stroke="#4a3020" strokeWidth="0.6" />
      <rect x="42" y="50" width="4" height="6" rx="2" fill="#6a4a2a" stroke="#4a3020" strokeWidth="0.6" />
    </svg>
  );
}
