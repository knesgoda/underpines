import React from 'react';

const id = 'wtdeer-anims';
if (typeof document !== 'undefined' && !document.getElementById(id)) {
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `
@keyframes deer-watch {
  0% { transform: translateX(-5%) opacity(0); opacity: 0; }
  8% { transform: translateX(0%); opacity: 1; }
  15%, 55% { transform: translateX(5%); }
  60% { transform: translateX(5%) scaleX(-1); }
  75% { transform: translateX(-5%) scaleX(-1); opacity: 1; }
  85% { transform: translateX(-8%) scaleX(-1); opacity: 0; }
  100% { opacity: 0; }
}
@keyframes deer-walk {
  0% { transform: translateX(0); }
  100% { transform: translateX(100%); }
}
@keyframes deer-tail-flash {
  0%,70%,100% { opacity: 0; }
  75%,90% { opacity: 1; }
}
  `;
  document.head.appendChild(s);
}

export default function WhiteTailedDeer({ variant = 0, direction = 'ltr', className = '' }) {
  const anims = ['deer-watch 8s ease-in-out forwards', 'deer-walk 9s ease-in-out forwards'];
  const flip = direction === 'rtl' ? 'scaleX(-1)' : '';
  return (
    <svg viewBox="0 0 90 70" width="90" height="70" className={className}
      style={{ willChange: 'transform', animation: anims[variant % anims.length], transform: flip }}
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="45" cy="66" rx="16" ry="2.5" fill="rgba(0,0,0,0.1)" />
      {/* Legs */}
      <rect x="32" y="52" width="3" height="14" rx="1.5" fill="#a0845a" stroke="#5a4030" strokeWidth="0.7" />
      <rect x="36" y="53" width="3" height="13" rx="1.5" fill="#9a7e56" stroke="#5a4030" strokeWidth="0.7" />
      <rect x="52" y="52" width="3" height="14" rx="1.5" fill="#a0845a" stroke="#5a4030" strokeWidth="0.7" />
      <rect x="56" y="53" width="3" height="13" rx="1.5" fill="#9a7e56" stroke="#5a4030" strokeWidth="0.7" />
      {/* Body */}
      <ellipse cx="45" cy="44" rx="18" ry="12" fill="#b8946a" stroke="#5a4030" strokeWidth="1.2" />
      <ellipse cx="47" cy="48" rx="12" ry="6" fill="#d4b88a" />
      {/* Neck */}
      <path d="M58 40 Q62 32 64 26" stroke="#5a4030" strokeWidth="1.2" fill="#b8946a" />
      <path d="M62 38 Q66 30 66 24" stroke="#5a4030" strokeWidth="1.2" fill="#b8946a" />
      {/* Head */}
      <ellipse cx="66" cy="22" rx="7" ry="6" fill="#c4a070" stroke="#5a4030" strokeWidth="1.2" />
      <ellipse cx="72" cy="24" rx="4" ry="2.5" fill="#d4b88a" stroke="#5a4030" strokeWidth="0.8" />
      {/* Ears */}
      <path d="M62 16 Q60 10 64 12 Q66 14 64 18" fill="#c4a070" stroke="#5a4030" strokeWidth="0.7" />
      <path d="M68 14 Q68 8 71 10 Q72 12 70 16" fill="#c4a070" stroke="#5a4030" strokeWidth="0.7" />
      {/* Eye */}
      <circle cx="68" cy="20" r="1.8" fill="#2a1a0a" />
      <circle cx="68.5" cy="19.5" r="0.5" fill="#fff" />
      {/* Nose */}
      <ellipse cx="75" cy="24" rx="1.2" ry="0.8" fill="#2a1a1a" />
      {/* White tail */}
      <ellipse cx="27" cy="40" rx="5" ry="4" fill="#fff" stroke="#ccc" strokeWidth="0.5"
        style={{ animation: variant === 0 ? 'deer-tail-flash 8s ease-in-out forwards' : 'none' }} />
    </svg>
  );
}
