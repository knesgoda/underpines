import React from 'react';
const id='orca-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes orca-breach{0%{transform:translateX(40%) translateY(30%) rotateZ(0);opacity:0}15%{opacity:1}30%{transform:translateX(45%) translateY(-20%) rotateZ(-20deg)}50%{transform:translateX(50%) translateY(-35%) rotateZ(-10deg)}70%{transform:translateX(55%) translateY(-10%) rotateZ(15deg)}85%{transform:translateX(58%) translateY(25%) rotateZ(30deg);opacity:1}100%{transform:translateX(60%) translateY(35%) rotateZ(40deg);opacity:0}}
@keyframes orca-fin{0%{transform:translateX(-5%)}100%{transform:translateX(110%)}}
`;document.head.appendChild(s);}
export default function Orca({variant=0,direction='ltr',className=''}){
  const anims=['orca-breach 3s ease-in-out forwards','orca-fin 6s linear forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 80 60" width="80" height="60" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {variant===0?<>
        {/* Full breach */}
        <ellipse cx="40" cy="30" rx="18" ry="8" fill="#1a1a1a" stroke="#0a0a0a" strokeWidth="1"/>
        <ellipse cx="42" cy="32" rx="12" ry="4" fill="#f0ece4"/>
        {/* White eye patch */}
        <ellipse cx="54" cy="26" rx="3" ry="2" fill="#f0ece4" transform="rotate(-10 54 26)"/>
        <circle cx="56" cy="28" r="1" fill="#1a1a1a"/>
        {/* Dorsal fin */}
        <path d="M36 22 Q38 10 40 22" fill="#1a1a1a" stroke="#0a0a0a" strokeWidth="0.5"/>
        {/* Tail */}
        <path d="M22 30 L14 26 L14 34Z" fill="#1a1a1a" stroke="#0a0a0a" strokeWidth="0.5"/>
        {/* Splash */}
        <circle cx="44" cy="48" r="1.5" fill="#8ab8d0" opacity="0.4"/>
        <circle cx="36" cy="50" r="1" fill="#8ab8d0" opacity="0.3"/>
        <circle cx="50" cy="52" r="1.2" fill="#8ab8d0" opacity="0.35"/>
      </>:<>
        {/* Dorsal fin only */}
        <path d="M40 30 Q42 14 44 30" fill="#1a1a1a" stroke="#0a0a0a" strokeWidth="0.8"/>
        {/* Water line */}
        <path d="M0 30 Q20 28 40 30 Q60 32 80 30" stroke="#6a9ab0" strokeWidth="0.5" fill="none" opacity="0.4"/>
        <ellipse cx="40" cy="32" rx="8" ry="2" fill="#1a1a1a" opacity="0.3"/>
      </>}
    </svg>
  );
}
