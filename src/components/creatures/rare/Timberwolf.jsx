import React from 'react';
const id='timberwolf-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes twolf-stare{0%{transform:translateX(-5%);opacity:0}8%{opacity:1}30%{transform:translateX(35%)}35%,55%{transform:translateX(40%)}60%{transform:translateX(45%)}100%{transform:translateX(110%);opacity:1}}
@keyframes twolf-howl{0%{transform:translateX(35%);opacity:0}10%{opacity:1}20%,40%{transform:translateX(40%)}25%{transform:translateX(40%) rotateZ(-15deg)}35%{transform:translateX(40%) rotateZ(-15deg)}45%{transform:translateX(40%) rotateZ(0)}100%{transform:translateX(40%);opacity:0}}
`;document.head.appendChild(s);}
export default function Timberwolf({variant=0,direction='ltr',className=''}){
  const anims=['twolf-stare 10s ease-in-out forwards','twolf-howl 12s ease-in-out forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 100 70" width="100" height="70" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="66" rx="16" ry="2.5" fill="rgba(0,0,0,0.1)"/>
      {/* Tail */}
      <path d="M20 46 Q12 42 10 46 Q12 50 18 50" fill="#7a7a7a" stroke="#4a4a4a" strokeWidth="0.8"/>
      {/* Legs */}
      <rect x="32" y="54" width="3" height="12" rx="1.5" fill="#7a7a7a" stroke="#4a4a4a" strokeWidth="0.6"/>
      <rect x="36" y="55" width="3" height="11" rx="1.5" fill="#787878" stroke="#4a4a4a" strokeWidth="0.6"/>
      <rect x="54" y="54" width="3" height="12" rx="1.5" fill="#7a7a7a" stroke="#4a4a4a" strokeWidth="0.6"/>
      <rect x="58" y="55" width="3" height="11" rx="1.5" fill="#787878" stroke="#4a4a4a" strokeWidth="0.6"/>
      {/* Body */}
      <ellipse cx="45" cy="46" rx="20" ry="12" fill="#8a8a8a" stroke="#4a4a4a" strokeWidth="1.2"/>
      <ellipse cx="47" cy="50" rx="12" ry="6" fill="#a0a09a"/>
      {/* Neck */}
      <path d="M60 40 Q66 32 70 24" stroke="#4a4a4a" strokeWidth="1.2" fill="#8a8a8a"/>
      <path d="M64 38 Q70 30 72 22" stroke="#4a4a4a" strokeWidth="1.2" fill="#8a8a8a"/>
      {/* Head */}
      <ellipse cx="72" cy="20" rx="8" ry="6.5" fill="#9a9a9a" stroke="#4a4a4a" strokeWidth="1.2"/>
      <ellipse cx="80" cy="22" rx="5" ry="3" fill="#aaa" stroke="#4a4a4a" strokeWidth="0.8"/>
      {/* Ears */}
      <path d="M68 14 Q66 8 70 10 Q72 12 70 16" fill="#9a9a9a" stroke="#4a4a4a" strokeWidth="0.6"/>
      <path d="M74 12 Q74 6 78 8 Q79 10 76 14" fill="#9a9a9a" stroke="#4a4a4a" strokeWidth="0.6"/>
      {/* Eyes — piercing */}
      <circle cx="73" cy="18" r="2" fill="#d4a020"/>
      <circle cx="73" cy="18" r="1" fill="#1a1a1a"/>
      <circle cx="73.3" cy="17.5" r="0.3" fill="#fff"/>
      {/* Nose */}
      <ellipse cx="84" cy="22" rx="1.5" ry="1" fill="#2a2a2a"/>
    </svg>
  );
}
