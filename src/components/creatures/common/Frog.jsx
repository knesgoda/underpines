import React from 'react';

const id = 'frog-anims';
if (typeof document !== 'undefined' && !document.getElementById(id)) {
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `
@keyframes frog-sit {
  0%, 30% { transform: translateX(30%) scaleY(1); }
  35% { transform: translateX(30%) scaleY(0.92); }
  40% { transform: translateX(30%) scaleY(1.04); }
  45% { transform: translateX(30%) scaleY(0.94); }
  50% { transform: translateX(30%) scaleY(1.02); }
  55%, 100% { transform: translateX(30%) scaleY(1); }
}
@keyframes frog-hop {
  0%, 40% { transform: translateX(30%); }
  50% { transform: translateX(38%) translateY(-14%); }
  60% { transform: translateX(46%) translateY(0); }
  70%, 100% { transform: translateX(46%); }
}
  `;
  document.head.appendChild(s);
}

export default function Frog({ variant = 0, direction = 'ltr', className = '' }) {
  const anims = ['frog-sit 6s ease-in-out infinite', 'frog-hop 5s ease-in-out forwards'];
  const flip = direction === 'rtl' ? 'scaleX(-1)' : '';

  return (
    <svg viewBox="0 0 40 30" width="40" height="30" className={className}
      style={{ willChange: 'transform', animation: anims[variant % anims.length], transform: flip }}
      fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <ellipse cx="20" cy="20" rx="8" ry="6" fill="#4a8a3a" stroke="#2a5a1a" strokeWidth="0.8" />
      {/* Head */}
      <ellipse cx="26" cy="16" rx="6" ry="5" fill="#5a9a4a" stroke="#2a5a1a" strokeWidth="0.8" />
      {/* Eyes — big and bulgy */}
      <circle cx="24" cy="12" r="2.5" fill="#5a9a4a" stroke="#2a5a1a" strokeWidth="0.6" />
      <circle cx="29" cy="12" r="2.5" fill="#5a9a4a" stroke="#2a5a1a" strokeWidth="0.6" />
      <circle cx="24" cy="12" r="1.4" fill="#d4c43a" />
      <circle cx="24" cy="12" r="0.6" fill="#1a1a1a" />
      <circle cx="29" cy="12" r="1.4" fill="#d4c43a" />
      <circle cx="29" cy="12" r="0.6" fill="#1a1a1a" />
      {/* Throat */}
      <ellipse cx="27" cy="19" rx="3" ry="2" fill="#7aba6a" opacity="0.6" />
      {/* Front legs */}
      <path d="M22 24 L20 27 L22 27" stroke="#2a5a1a" strokeWidth="0.7" fill="#4a8a3a" />
      {/* Back leg */}
      <path d="M14 20 Q10 24 12 26 Q14 27 16 24" fill="#4a8a3a" stroke="#2a5a1a" strokeWidth="0.7" />
    </svg>
  );
}
