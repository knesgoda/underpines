import React from 'react';

const id = 'finch-anims';
if (typeof document !== 'undefined' && !document.getElementById(id)) {
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `
@keyframes finch-flit {
  0%, 20% { transform: translate(0, 0); }
  25% { transform: translate(30%, -20%); }
  30%, 50% { transform: translate(60%, 0); }
  55% { transform: translate(40%, -15%); }
  60%, 80% { transform: translate(20%, 5%); }
  85% { transform: translate(60%, -10%); }
  100% { transform: translate(100%, 0); }
}
@keyframes finch-hop {
  0% { transform: translateX(0); }
  15% { transform: translateX(12%) translateY(-8%); }
  20% { transform: translateX(20%) translateY(0); }
  35% { transform: translateX(36%) translateY(-6%); }
  40% { transform: translateX(44%) translateY(0); }
  55% { transform: translateX(60%) translateY(-8%); }
  60% { transform: translateX(68%) translateY(0); }
  100% { transform: translateX(100%); }
}
  `;
  document.head.appendChild(s);
}

export default function Finch({ variant = 0, direction = 'ltr', className = '' }) {
  const anims = ['finch-flit 4s ease-in-out forwards', 'finch-hop 3.5s ease-in-out forwards'];
  const flip = direction === 'rtl' ? 'scaleX(-1)' : '';

  return (
    <svg viewBox="0 0 20 15" width="20" height="15" className={className}
      style={{ willChange: 'transform', animation: anims[variant % anims.length], transform: flip }}
      fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <ellipse cx="10" cy="9" rx="5" ry="3.5" fill="#c8a050" stroke="#6a5030" strokeWidth="0.5" />
      {/* Head */}
      <circle cx="14" cy="7" r="2.5" fill="#d4aa58" stroke="#6a5030" strokeWidth="0.5" />
      {/* Wing */}
      <path d="M7 8 Q5 6 8 7 Q10 8 9 9" fill="#9a7a40" stroke="#6a5030" strokeWidth="0.4" />
      {/* Beak */}
      <path d="M16 7 L18 6.5 L16 7.5Z" fill="#e8a020" stroke="#8a6010" strokeWidth="0.3" />
      {/* Eye */}
      <circle cx="14.5" cy="6.5" r="0.6" fill="#1a1a1a" />
      {/* Tail */}
      <path d="M5 9 L2 8 L3 10Z" fill="#9a7a40" stroke="#6a5030" strokeWidth="0.3" />
      {/* Legs */}
      <line x1="9" y1="12" x2="9" y2="14" stroke="#7a6040" strokeWidth="0.4" />
      <line x1="11" y1="12" x2="11" y2="14" stroke="#7a6040" strokeWidth="0.4" />
    </svg>
  );
}
