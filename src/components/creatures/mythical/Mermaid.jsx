import React from 'react';
const id='mermaid-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes mermaid-tail{0%{transform:translateX(40%) translateY(10%) rotateZ(0);opacity:0}15%{opacity:0.8}30%{transform:translateX(45%) translateY(-15%) rotateZ(-25deg)}50%{transform:translateX(48%) translateY(-5%) rotateZ(-40deg);opacity:0.6}70%{transform:translateX(50%) translateY(10%) rotateZ(-50deg);opacity:0.3}100%{opacity:0}}
`;document.head.appendChild(s);}
export default function Mermaid({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 60 40" width="60" height="40" className={className}
      style={{willChange:'transform',animation:'mermaid-tail 2s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Tail crescent */}
      <path d="M30 22 Q34 14 38 12 Q36 10 32 14 Q28 18 26 24" fill="#4a8a7a" stroke="#2a5a4a" strokeWidth="0.8"/>
      {/* Scales suggestion */}
      <path d="M30 20 Q32 18 34 16" stroke="#6ac0b0" strokeWidth="0.4" fill="none" opacity="0.5"/>
      <path d="M29 22 Q31 20 33 18" stroke="#8ad4c4" strokeWidth="0.3" fill="none" opacity="0.3"/>
      {/* Tail fin */}
      <path d="M36 12 Q42 8 40 14 Q38 10 36 12" fill="#4a8a7a" opacity="0.7"/>
      {/* Splash */}
      <circle cx="28" cy="28" r="1" fill="#8ab8d0" opacity="0.4"/>
      <circle cx="34" cy="30" r="0.7" fill="#8ab8d0" opacity="0.3"/>
      {/* Iridescent shimmer */}
      <ellipse cx="32" cy="18" rx="2" ry="1" fill="#c4d4f4" opacity="0.2"/>
    </svg>
  );
}
