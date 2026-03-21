import React from 'react';
const id='kelpie-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes kelpie-shift{0%{opacity:0;transform:translateX(30%)}15%{opacity:0.4}40%{opacity:0.5;transform:translateX(40%)}60%{opacity:0.3;transform:translateX(45%) scaleX(0.9)}80%{opacity:0.1}100%{opacity:0}}
@keyframes kelpie-warp{0%,100%{transform:scaleX(1) scaleY(1)}50%{transform:scaleX(1.05) scaleY(0.95)}}
`;document.head.appendChild(s);}
export default function Kelpie({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 80 50" width="80" height="50" className={className}
      style={{willChange:'transform',animation:'kelpie-shift 8s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <g style={{animation:'kelpie-warp 3s ease-in-out infinite'}}>
        {/* Horse shape — dissolving */}
        <path d="M50 22 Q54 14 56 10" stroke="#4a6a6a" strokeWidth="1.5" fill="none" opacity="0.3"/>
        <ellipse cx="56" cy="8" rx="4" ry="3.5" fill="#4a6a6a" opacity="0.25"/>
        <ellipse cx="40" cy="26" rx="14" ry="8" fill="#4a6a6a" opacity="0.2"/>
        <path d="M54 8 Q52 4 54 2" fill="#4a6a6a" opacity="0.2"/>
        <path d="M58 6 Q58 2 60 0" fill="#4a6a6a" opacity="0.2"/>
        {/* Legs dissolving into water */}
        <rect x="32" y="32" width="2" height="8" fill="#4a6a6a" opacity="0.15"/>
        <rect x="46" y="32" width="2" height="8" fill="#4a6a6a" opacity="0.15"/>
        {/* Water distortion */}
        <path d="M20 36 Q30 34 40 36 Q50 38 60 36" stroke="#6a9ab0" strokeWidth="0.4" fill="none" opacity="0.3"/>
      </g>
    </svg>
  );
}
