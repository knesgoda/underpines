import React from 'react';
const id='leprechaun-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes lep-peek{0%{transform:translateX(-2%);opacity:0}8%{opacity:0.7}15%,35%{transform:translateX(2%);opacity:0.7}45%{opacity:0}100%{opacity:0}}
@keyframes lep-gold{0%,20%{opacity:0}30%{opacity:0.6}40%{opacity:0.8}50%{opacity:0}100%{opacity:0}}
`;document.head.appendChild(s);}
export default function Leprechaun({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 30 40" width="30" height="40" className={className}
      style={{willChange:'transform',animation:'lep-peek 4s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Mostly hidden — just hat brim and gold glint */}
      {/* Hat */}
      <rect x="4" y="10" width="12" height="8" rx="1" fill="#2a6a2a" stroke="#1a3a1a" strokeWidth="0.6"/>
      <rect x="2" y="18" width="16" height="2" rx="0.5" fill="#2a5a2a" stroke="#1a3a1a" strokeWidth="0.5"/>
      <rect x="8" y="12" width="4" height="4" rx="0.5" fill="#1a4a1a"/>
      {/* Gold glint */}
      <circle cx="10" cy="32" r="1.5" fill="#d4a020" style={{animation:'lep-gold 4s ease-in-out forwards'}}/>
      <circle cx="8" cy="33" r="1" fill="#e4b830" opacity="0.5" style={{animation:'lep-gold 4s ease-in-out 0.2s forwards'}}/>
    </svg>
  );
}
