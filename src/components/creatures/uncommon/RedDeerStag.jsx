import React from 'react';
const id='redstag-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes stag-silhouette{0%,20%{transform:translateX(40%) scaleX(1)}30%{transform:translateX(40%) scaleX(1) rotateZ(0)}50%{transform:translateX(40%) rotateZ(-3deg)}70%{transform:translateX(40%) rotateZ(0)}100%{transform:translateX(100%)}}
@keyframes stag-walk{0%{transform:translateX(0) rotateZ(0)}15%{transform:translateX(12%) rotateZ(-0.5deg)}30%{transform:translateX(26%) rotateZ(0.5deg)}50%{transform:translateX(50%)}75%{transform:translateX(75%) rotateZ(-0.5deg)}100%{transform:translateX(100%)}}
`;document.head.appendChild(s);}
export default function RedDeerStag({variant=0,direction='ltr',className=''}){
  const anims=['stag-silhouette 10s ease-in-out forwards','stag-walk 11s ease-in-out forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 100 80" width="100" height="80" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="76" rx="18" ry="2.5" fill="rgba(0,0,0,0.1)"/>
      {/* Legs */}
      <rect x="36" y="58" width="3.5" height="16" rx="1.5" fill="#8a6040" stroke="#4a3020" strokeWidth="0.7"/>
      <rect x="40" y="59" width="3.5" height="15" rx="1.5" fill="#846040" stroke="#4a3020" strokeWidth="0.7"/>
      <rect x="58" y="58" width="3.5" height="16" rx="1.5" fill="#8a6040" stroke="#4a3020" strokeWidth="0.7"/>
      <rect x="62" y="59" width="3.5" height="15" rx="1.5" fill="#846040" stroke="#4a3020" strokeWidth="0.7"/>
      {/* Body */}
      <ellipse cx="50" cy="48" rx="20" ry="14" fill="#9a7050" stroke="#4a3020" strokeWidth="1.2"/>
      {/* Neck */}
      <path d="M65 42 Q70 32 72 22" stroke="#4a3020" strokeWidth="1.2" fill="#9a7050"/>
      <path d="M68 40 Q74 30 74 20" stroke="#4a3020" strokeWidth="1.2" fill="#9a7050"/>
      {/* Head */}
      <ellipse cx="74" cy="18" rx="7" ry="6" fill="#a07a58" stroke="#4a3020" strokeWidth="1.2"/>
      <ellipse cx="80" cy="20" rx="4" ry="2.5" fill="#b08a68" stroke="#4a3020" strokeWidth="0.8"/>
      {/* Antlers */}
      <path d="M70 12 Q68 4 64 2 M68 6 Q66 2 62 4 M70 8 Q66 6 64 8" stroke="#6a5030" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
      <path d="M76 10 Q78 2 82 0 M78 4 Q80 0 84 2 M76 6 Q80 4 82 6" stroke="#6a5030" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
      {/* Eye */}
      <circle cx="76" cy="16" r="1.6" fill="#2a1a0a"/><circle cx="76.4" cy="15.5" r="0.4" fill="#fff"/>
      {/* Nose */}
      <ellipse cx="83" cy="20" rx="1.2" ry="0.8" fill="#2a1a1a"/>
      {/* Ears */}
      <path d="M70 12 Q68 8 72 10" fill="#a07a58" stroke="#4a3020" strokeWidth="0.6"/>
      <path d="M77 10 Q78 6 80 9" fill="#a07a58" stroke="#4a3020" strokeWidth="0.6"/>
    </svg>
  );
}
