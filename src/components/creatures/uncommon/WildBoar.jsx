import React from 'react';
const id='wildboar-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes boar-crash{0%{transform:translateX(-5%)}10%{transform:translateX(5%) rotateZ(-2deg)}20%{transform:translateX(15%) rotateZ(2deg)}30%{transform:translateX(25%) rotateZ(-1deg)}50%{transform:translateX(50%)}100%{transform:translateX(100%)}}
@keyframes boar-trot{0%{transform:translateX(0) rotateZ(0)}20%{transform:translateX(18%) rotateZ(1deg)}40%{transform:translateX(38%) rotateZ(-1deg)}60%{transform:translateX(58%) rotateZ(1deg)}100%{transform:translateX(100%)}}
`;document.head.appendChild(s);}
export default function WildBoar({variant=0,direction='ltr',className=''}){
  const anims=['boar-crash 5s ease-in-out forwards','boar-trot 7s ease-in-out forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 80 55" width="80" height="55" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="52" rx="16" ry="2" fill="rgba(0,0,0,0.1)"/>
      <rect x="28" y="44" width="4" height="8" rx="2" fill="#4a3a2a" stroke="#2a1a0a" strokeWidth="0.6"/>
      <rect x="48" y="44" width="4" height="8" rx="2" fill="#4a3a2a" stroke="#2a1a0a" strokeWidth="0.6"/>
      <ellipse cx="38" cy="38" rx="18" ry="12" fill="#5a4a3a" stroke="#2a1a0a" strokeWidth="1.2"/>
      {/* Bristles */}
      <path d="M30 28 Q32 24 34 28 M36 26 Q38 22 40 26 M42 27 Q44 23 46 27" stroke="#3a2a1a" strokeWidth="1" fill="none"/>
      <ellipse cx="58" cy="36" rx="8" ry="7" fill="#6a5a4a" stroke="#2a1a0a" strokeWidth="1.2"/>
      <ellipse cx="65" cy="38" rx="5" ry="3" fill="#8a7a6a" stroke="#2a1a0a" strokeWidth="0.8"/>
      {/* Tusks */}
      <path d="M63 36 Q62 32 64 33" stroke="#e8e0d0" strokeWidth="1" fill="none" strokeLinecap="round"/>
      <path d="M67" y1="36" x2="68" y2="32" stroke="#e8e0d0" strokeWidth="1" strokeLinecap="round"/>
      <line x1="67" y1="36" x2="68" y2="32" stroke="#e8e0d0" strokeWidth="1" strokeLinecap="round"/>
      <circle cx="57" cy="34" r="1.4" fill="#1a1a0a"/><circle cx="57.4" cy="33.6" r="0.35" fill="#555"/>
      <ellipse cx="69" cy="38" rx="1.3" ry="0.9" fill="#3a2a1a"/>
      <circle cx="54" cy="30" r="2.5" fill="#6a5a4a" stroke="#2a1a0a" strokeWidth="0.5"/>
      <circle cx="60" cy="30" r="2.5" fill="#6a5a4a" stroke="#2a1a0a" strokeWidth="0.5"/>
    </svg>
  );
}
