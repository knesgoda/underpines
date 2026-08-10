import React from 'react';
const id='direwolf-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes dw-stalk{0%{transform:translateX(-5%);opacity:0}8%{opacity:0.5}50%{transform:translateX(50%)}95%{opacity:0.4}100%{transform:translateX(105%);opacity:0}}
`;document.head.appendChild(s);}
export default function DireWolf({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 160 90" width="160" height="90" className={className}
      style={{willChange:'transform',animation:'dw-stalk 12s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* WRONG size — too big */}
      <path d="M30 60 Q16 54 10 58 Q14 64 26 66" fill="#2a2a2a" opacity="0.5"/>
      <rect x="50" y="66" width="5" height="18" rx="2" fill="#2a2a2a" opacity="0.45"/>
      <rect x="58" y="67" width="5" height="17" rx="2" fill="#2a2a2a" opacity="0.45"/>
      <rect x="90" y="66" width="5" height="18" rx="2" fill="#2a2a2a" opacity="0.45"/>
      <rect x="98" y="67" width="5" height="17" rx="2" fill="#2a2a2a" opacity="0.45"/>
      <ellipse cx="75" cy="54" rx="32" ry="18" fill="#2a2a2a" opacity="0.5"/>
      <ellipse cx="77" cy="60" rx="20" ry="8" fill="#3a3a3a" opacity="0.3"/>
      {/* Massive head */}
      <ellipse cx="115" cy="44" rx="14" ry="11" fill="#2a2a2a" opacity="0.5"/>
      <ellipse cx="128" cy="48" rx="8" ry="5" fill="#2a2a2a" opacity="0.45"/>
      <path d="M108" y1="36" x2="106" y2="28" />
      <path d="M106 36 Q104 26 108 28" fill="#2a2a2a" opacity="0.4"/>
      <path d="M118 34 Q118 24 122 26" fill="#2a2a2a" opacity="0.4"/>
      {/* Eyes — ancient */}
      <circle cx="116" cy="42" r="2" fill="#8a8a2a" opacity="0.4"/>
      <circle cx="116" cy="42" r="1" fill="#1a1a1a" opacity="0.3"/>
    </svg>
  );
}
