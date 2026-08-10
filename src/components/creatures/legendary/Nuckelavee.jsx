import React from 'react';
const id='nuckelavee-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes nuck-rise{0%{transform:translateX(35%) translateY(20%);opacity:0}20%{opacity:0.4}35%{transform:translateX(38%) translateY(0);opacity:0.5}55%{transform:translateX(38%) translateY(0);opacity:0.45}75%{transform:translateX(40%) translateY(15%);opacity:0.2}100%{opacity:0}}
@keyframes nuck-pulse{0%,100%{opacity:0.3}50%{opacity:0.5}}
`;document.head.appendChild(s);}
export default function Nuckelavee({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 80 60" width="80" height="60" className={className}
      style={{willChange:'transform',animation:'nuck-rise 6s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Water */}
      <path d="M0 40 Q20 38 40 40 Q60 42 80 40" stroke="#6a9ab0" strokeWidth="0.5" fill="none" opacity="0.3"/>
      {/* Horse-like shape — but wrong */}
      <g style={{animation:'nuck-pulse 2s ease-in-out infinite'}}>
        <ellipse cx="40" cy="34" rx="16" ry="8" fill="#4a3a3a" opacity="0.35"/>
        <path d="M52 28 Q56 18 58 12" stroke="#4a3a3a" strokeWidth="2.5" fill="none" opacity="0.35" strokeLinecap="round"/>
        <ellipse cx="58" cy="10" rx="4" ry="3" fill="#4a3a3a" opacity="0.35"/>
        {/* Skin membrane — translucent, wrong */}
        <path d="M28 30 Q22 24 26 18 Q30 22 32 28" fill="#6a4a4a" opacity="0.15"/>
        <path d="M50 26 Q54 20 52 14" stroke="#5a3a3a" strokeWidth="1" fill="none" opacity="0.2"/>
        {/* Something on top — rider fused */}
        <path d="M38 26 Q36 18 38 14 Q40 10 42 14 Q44 18 42 26" fill="#4a2a2a" opacity="0.25"/>
        {/* Eye — singular, wrong */}
        <circle cx="60" cy="9" r="1" fill="#a03030" opacity="0.4"/>
      </g>
    </svg>
  );
}
