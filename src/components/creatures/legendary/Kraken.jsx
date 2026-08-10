import React from 'react';
const id='kraken-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes kraken-tentacle{0%{transform:translateX(40%) translateY(15%);opacity:0}15%{opacity:0.6}25%{transform:translateX(42%) translateY(0)}65%{transform:translateX(42%) translateY(0);opacity:0.6}85%{transform:translateX(43%) translateY(12%);opacity:0.3}100%{opacity:0}}
@keyframes kraken-curl{0%,100%{transform:rotate(0)}50%{transform:rotate(5deg)}}
`;document.head.appendChild(s);}
export default function Kraken({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 60 60" width="60" height="60" className={className}
      style={{willChange:'transform',animation:'kraken-tentacle 6s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Water */}
      <path d="M0 38 Q15 36 30 38 Q45 40 60 38" stroke="#6a9ab0" strokeWidth="0.5" fill="none" opacity="0.3"/>
      {/* Single thick tentacle */}
      <g style={{animation:'kraken-curl 3s ease-in-out infinite',transformOrigin:'30px 38px'}}>
        <path d="M30 38 Q28 28 26 20 Q24 14 28 10 Q32 8 34 12 Q36 16 34 22" stroke="#3a3a3a" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.6"/>
        {/* Suction cups suggestion */}
        <circle cx="28" cy="24" r="1" fill="#5a5a5a" opacity="0.3"/>
        <circle cx="27" cy="28" r="1.2" fill="#5a5a5a" opacity="0.25"/>
        <circle cx="28" cy="32" r="1.3" fill="#5a5a5a" opacity="0.2"/>
      </g>
      {/* Ripples */}
      <ellipse cx="30" cy="40" rx="8" ry="1.5" fill="#6a9ab0" opacity="0.15"/>
    </svg>
  );
}
