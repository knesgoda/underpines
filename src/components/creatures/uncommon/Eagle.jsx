import React from 'react';
const id='eagle-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes eagle-soar{0%{transform:translateX(-10%) translateY(10%)}100%{transform:translateX(110%) translateY(5%)}}
@keyframes eagle-circle{0%{transform:translateX(30%) translateY(8%) rotateZ(0)}25%{transform:translateX(55%) translateY(3%) rotateZ(5deg)}50%{transform:translateX(60%) translateY(10%) rotateZ(0)}75%{transform:translateX(45%) translateY(6%) rotateZ(-5deg)}100%{transform:translateX(110%) translateY(8%)}}
@keyframes eagle-wingbeat{0%,100%{transform:rotateX(0)}50%{transform:rotateX(8deg)}}
`;document.head.appendChild(s);}
export default function Eagle({variant=0,direction='ltr',className=''}){
  const anims=['eagle-soar 8s linear forwards','eagle-circle 12s ease-in-out forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 80 30" width="80" height="30" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Wings */}
      <path d="M40 15 Q25 5 8 8 Q12 12 20 12 Q14 10 10 12" fill="#3a2a1a" stroke="#2a1a0a" strokeWidth="0.8"
        style={{animation:'eagle-wingbeat 3s ease-in-out infinite',transformOrigin:'40px 15px'}}/>
      <path d="M40 15 Q55 5 72 8 Q68 12 60 12 Q66 10 70 12" fill="#3a2a1a" stroke="#2a1a0a" strokeWidth="0.8"
        style={{animation:'eagle-wingbeat 3s ease-in-out infinite reverse',transformOrigin:'40px 15px'}}/>
      {/* Body */}
      <ellipse cx="40" cy="15" rx="8" ry="5" fill="#3a2a1a" stroke="#2a1a0a" strokeWidth="0.8"/>
      {/* Head — white (bald eagle) */}
      <circle cx="48" cy="13" r="3.5" fill="#f0ece4" stroke="#2a1a0a" strokeWidth="0.6"/>
      <circle cx="50" cy="12" r="0.8" fill="#d4a020"/>
      <circle cx="50" cy="12" r="0.4" fill="#1a1a1a"/>
      {/* Beak */}
      <path d="M51 13 L55 14 L51 15" fill="#d4a020" stroke="#8a6a10" strokeWidth="0.3"/>
      {/* Tail */}
      <path d="M32 16 L26 18 L28 14Z" fill="#f0ece4" stroke="#2a1a0a" strokeWidth="0.4"/>
    </svg>
  );
}
