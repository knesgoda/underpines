import React from 'react';
const id='wolverine-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes wolv-trot{0%{transform:translateX(0) rotateZ(0)}12%{transform:translateX(12%) rotateZ(-2deg)}24%{transform:translateX(24%) rotateZ(2deg)}36%{transform:translateX(36%) rotateZ(-2deg)}100%{transform:translateX(100%)}}
@keyframes wolv-stand{0%{transform:translateX(30%)}30%{transform:translateX(38%)}35%,50%{transform:translateX(40%) scaleY(1.2) translateY(-8%)}55%{transform:translateX(40%) scaleY(1)}100%{transform:translateX(100%)}}
`;document.head.appendChild(s);}
export default function Wolverine({variant=0,direction='ltr',className=''}){
  const anims=['wolv-trot 5s ease-in-out forwards','wolv-stand 7s ease-in-out forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 70 45" width="70" height="45" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="35" cy="42" rx="12" ry="2" fill="rgba(0,0,0,0.1)"/>
      <rect x="22" y="34" width="3.5" height="8" rx="1.5" fill="#3a2a1a" stroke="#1a1a0a" strokeWidth="0.6"/>
      <rect x="42" y="34" width="3.5" height="8" rx="1.5" fill="#3a2a1a" stroke="#1a1a0a" strokeWidth="0.6"/>
      {/* Stocky body */}
      <ellipse cx="34" cy="28" rx="16" ry="9" fill="#3a2a1a" stroke="#1a1a0a" strokeWidth="1"/>
      {/* Tan side stripe */}
      <path d="M20 24 Q34 20 48 24" stroke="#8a7040" strokeWidth="2" fill="none"/>
      <ellipse cx="50" cy="22" rx="6" ry="5" fill="#4a3a2a" stroke="#1a1a0a" strokeWidth="1"/>
      <ellipse cx="55" cy="24" rx="3" ry="2" fill="#5a4a3a" stroke="#1a1a0a" strokeWidth="0.5"/>
      <path d="M46 16 Q44 12 48 14" fill="#4a3a2a" stroke="#1a1a0a" strokeWidth="0.5"/>
      <path d="M52 14 Q52 10 56 12" fill="#4a3a2a" stroke="#1a1a0a" strokeWidth="0.5"/>
      <circle cx="51" cy="20" r="1.3" fill="#1a1a0a"/><circle cx="51.3" cy="19.7" r="0.3" fill="#555"/>
      <ellipse cx="57" cy="24" rx="0.8" ry="0.5" fill="#1a1a0a"/>
      {/* Bushy tail */}
      <path d="M18 26 Q12 22 14 18 Q18 18 20 24" fill="#3a2a1a" stroke="#1a1a0a" strokeWidth="0.6"/>
    </svg>
  );
}
