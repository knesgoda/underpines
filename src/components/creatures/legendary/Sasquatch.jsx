import React from 'react';
const id='sasquatch-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes squatch-walk{0%{transform:translateX(-5%)}100%{transform:translateX(105%)}}
@keyframes squatch-arm{0%,100%{transform:rotate(0)}25%{transform:rotate(15deg)}75%{transform:rotate(-15deg)}}
`;document.head.appendChild(s);}
export default function Sasquatch({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 60 90" width="60" height="90" className={className}
      style={{willChange:'transform',animation:'squatch-walk 5s linear forwards',transform:flip,filter:'blur(0.5px)'}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <ellipse cx="30" cy="12" rx="5" ry="6" fill="#2a2a2a" opacity="0.7"/>
      {/* Body */}
      <path d="M24 18 Q22 45 20 70 L40 70 Q38 45 36 18" fill="#2a2a2a" opacity="0.65"/>
      {/* Shoulders */}
      <ellipse cx="30" cy="24" rx="12" ry="5" fill="#2a2a2a" opacity="0.65"/>
      {/* Left arm — swinging */}
      <path d="M18 24 Q12 40 10 52" stroke="#2a2a2a" strokeWidth="3.5" strokeLinecap="round" opacity="0.6"
        style={{animation:'squatch-arm 1s ease-in-out infinite',transformOrigin:'18px 24px'}}/>
      {/* Right arm — opposite swing */}
      <path d="M42 24 Q48 40 50 52" stroke="#2a2a2a" strokeWidth="3.5" strokeLinecap="round" opacity="0.6"
        style={{animation:'squatch-arm 1s ease-in-out infinite 0.5s',transformOrigin:'42px 24px'}}/>
      {/* Legs */}
      <rect x="22" y="65" width="6" height="18" rx="3" fill="#2a2a2a" opacity="0.6"/>
      <rect x="32" y="65" width="6" height="18" rx="3" fill="#2a2a2a" opacity="0.6"/>
    </svg>
  );
}
