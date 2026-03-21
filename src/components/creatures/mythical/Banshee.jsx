import React from 'react';
const id='banshee-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes banshee-rise{0%{transform:translateX(40%) translateY(20%) scaleY(0.5);opacity:0}20%{opacity:0.25;transform:translateX(40%) translateY(5%) scaleY(0.8)}40%{opacity:0.35;transform:translateX(40%) translateY(-5%) scaleY(1)}60%{opacity:0.3;transform:translateX(40%) translateY(-10%) scaleY(1.1)}80%{opacity:0.15}100%{opacity:0;transform:translateX(40%) translateY(-20%) scaleY(1.3)}}
@keyframes banshee-flow{0%,100%{transform:translateX(0)}50%{transform:translateX(3px)}}
`;document.head.appendChild(s);}
export default function Banshee({variant=0,direction='ltr',className=''}){
  return(
    <svg viewBox="0 0 50 70" width="50" height="70" className={className}
      style={{willChange:'transform',animation:'banshee-rise 4s ease-in-out forwards'}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <g style={{animation:'banshee-flow 2s ease-in-out infinite'}}>
        {/* Flowing figure */}
        <circle cx="25" cy="16" r="5" fill="#e0e0e0" opacity="0.2"/>
        <path d="M20 20 Q18 40 14 55 Q20 50 25 55 Q30 50 36 55 Q32 40 30 20" fill="#e0e0e0" opacity="0.15"/>
        {/* Flowing hair */}
        <path d="M20 14 Q14 20 12 30" stroke="#d0d0d0" strokeWidth="0.6" fill="none" opacity="0.15"/>
        <path d="M22 16 Q16 22 14 32" stroke="#d0d0d0" strokeWidth="0.4" fill="none" opacity="0.1"/>
        <path d="M30 14 Q36 20 38 30" stroke="#d0d0d0" strokeWidth="0.6" fill="none" opacity="0.15"/>
        {/* Mouth — wailing */}
        <ellipse cx="25" cy="20" rx="1.5" ry="2" fill="#c0c0c0" opacity="0.15"/>
      </g>
    </svg>
  );
}
