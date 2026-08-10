import React from 'react';

const id = 'hummingbird-anims';
if (typeof document !== 'undefined' && !document.getElementById(id)) {
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `
@keyframes hbird-hover-dart {
  0%, 25% { transform: translate(20%, -20%); }
  30% { transform: translate(60%, -25%); }
  35%, 60% { transform: translate(65%, -15%); }
  65% { transform: translate(90%, -20%); }
  70%, 100% { transform: translate(100%, -10%); }
}
@keyframes hbird-hover-place {
  0%, 100% { transform: translate(40%, -20%) translateY(0); }
  25% { transform: translate(40%, -20%) translateY(-3%); }
  50% { transform: translate(40%, -20%) translateY(2%); }
  75% { transform: translate(40%, -20%) translateY(-2%); }
}
@keyframes hbird-wing-blur {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}
@keyframes hbird-perch {
  0% { transform: translate(20%, -30%); }
  30%, 80% { transform: translate(50%, 0) rotateZ(15deg); }
  100% { transform: translate(100%, -20%); }
}
  `;
  document.head.appendChild(s);
}

export default function Hummingbird({ variant = 0, direction = 'ltr', className = '' }) {
  const anims = ['hbird-hover-dart 5s ease-in-out forwards', 'hbird-hover-place 3s ease-in-out infinite', 'hbird-perch 6s ease-in-out forwards'];
  const flip = direction === 'rtl' ? 'scaleX(-1)' : '';

  return (
    <svg viewBox="0 0 30 22" width="30" height="22" className={className}
      style={{ willChange: 'transform', animation: anims[variant % anims.length], transform: flip }}
      fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <ellipse cx="15" cy="12" rx="6" ry="3.5" fill="#2a8a4a" stroke="#1a4a2a" strokeWidth="0.5" />
      {/* Iridescent shimmer */}
      <ellipse cx="14" cy="11" rx="4" ry="2" fill="#4ac86a" opacity="0.5" />
      {/* Head */}
      <circle cx="20" cy="10" r="3" fill="#2a7a3a" stroke="#1a4a2a" strokeWidth="0.5" />
      {/* Throat gorget */}
      <ellipse cx="21" cy="11" rx="2" ry="1.5" fill="#c42040" opacity="0.8" />
      {/* Beak */}
      <line x1="23" y1="9.5" x2="29" y2="8.5" stroke="#3a3a3a" strokeWidth="0.6" strokeLinecap="round" />
      {/* Eye */}
      <circle cx="21" cy="9.5" r="0.7" fill="#1a1a1a" />
      {/* Wings */}
      <path d="M12 10 Q8 4 10 6 Q12 8 14 10" fill="#3aaa5a" opacity="0.6"
        style={{ animation: 'hbird-wing-blur 0.15s linear infinite' }} />
      <path d="M13 12 Q9 8 11 9 Q13 10 14 12" fill="#3aaa5a" opacity="0.5"
        style={{ animation: 'hbird-wing-blur 0.12s linear infinite' }} />
      {/* Tail */}
      <path d="M9 12 L5 14 L6 11Z" fill="#1a6a2a" stroke="#1a4a2a" strokeWidth="0.3" />
    </svg>
  );
}
