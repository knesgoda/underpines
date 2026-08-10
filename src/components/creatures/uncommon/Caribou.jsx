import React from 'react';
const id='caribou-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes caribou-graze{0%,100%{transform:translateX(30%) rotateZ(0)}30%{transform:translateX(32%) rotateZ(4deg)}60%{transform:translateX(30%) rotateZ(0)}}
@keyframes caribou-herd{0%{transform:translateX(0)}100%{transform:translateX(100%)}}
`;document.head.appendChild(s);}
export default function Caribou({variant=0,direction='ltr',className=''}){
  const anims=['caribou-graze 8s ease-in-out infinite','caribou-herd 12s linear forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 120 80" width="120" height="80" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Main caribou */}
      <g>
        <rect x="38" y="56" width="3.5" height="16" rx="1.5" fill="#8a7a6a" stroke="#4a3a2a" strokeWidth="0.7"/>
        <rect x="56" y="56" width="3.5" height="16" rx="1.5" fill="#8a7a6a" stroke="#4a3a2a" strokeWidth="0.7"/>
        <ellipse cx="48" cy="48" rx="16" ry="12" fill="#9a8a7a" stroke="#4a3a2a" strokeWidth="1.2"/>
        <path d="M60 42 Q64 34 66 24" stroke="#4a3a2a" strokeWidth="1.2" fill="#9a8a7a"/>
        <ellipse cx="66" cy="22" rx="6" ry="5.5" fill="#a09080" stroke="#4a3a2a" strokeWidth="1.2"/>
        <path d="M62 16 Q58 4 54 2 M60 8 Q56 4 52 6" stroke="#7a6a5a" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
        <path d="M70 14 Q74 2 78 0 M72 6 Q76 2 80 4" stroke="#7a6a5a" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
        <circle cx="68" cy="20" r="1.4" fill="#2a1a0a"/>
        <ellipse cx="72" cy="22" rx="1" ry="0.7" fill="#2a1a1a"/>
      </g>
      {/* Herd silhouettes (variant 1) */}
      {variant === 1 && <>
        <g opacity="0.4" transform="translate(20, 8) scale(0.7)">
          <ellipse cx="48" cy="48" rx="14" ry="10" fill="#6a5a4a"/>
          <ellipse cx="60" cy="40" rx="5" ry="4" fill="#6a5a4a"/>
          <path d="M56 34 Q54 24 50 22" stroke="#5a4a3a" strokeWidth="1.2" fill="none"/>
        </g>
        <g opacity="0.3" transform="translate(65, 12) scale(0.6)">
          <ellipse cx="48" cy="48" rx="14" ry="10" fill="#5a4a3a"/>
          <ellipse cx="60" cy="40" rx="5" ry="4" fill="#5a4a3a"/>
        </g>
      </>}
    </svg>
  );
}
