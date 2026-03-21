import React from 'react';
const id='elk-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes elk-graze{0%,20%{transform:translateX(30%)}25%{transform:translateX(32%) rotateZ(5deg)}30%,50%{transform:translateX(32%) rotateZ(5deg)}55%{transform:translateX(32%) rotateZ(0)}100%{transform:translateX(32%)}}
@keyframes elk-walk{0%{transform:translateX(0)}100%{transform:translateX(100%)}}
`;document.head.appendChild(s);}
export default function Elk({variant=0,direction='ltr',className=''}){
  const anims=['elk-graze 10s ease-in-out forwards','elk-walk 12s ease-in-out forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 110 85" width="110" height="85" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="55" cy="82" rx="20" ry="2.5" fill="rgba(0,0,0,0.1)"/>
      <rect x="40" y="62" width="4" height="18" rx="2" fill="#7a5a3a" stroke="#3a2a1a" strokeWidth="0.7"/>
      <rect x="45" y="63" width="4" height="17" rx="2" fill="#7a5838" stroke="#3a2a1a" strokeWidth="0.7"/>
      <rect x="64" y="62" width="4" height="18" rx="2" fill="#7a5a3a" stroke="#3a2a1a" strokeWidth="0.7"/>
      <rect x="69" y="63" width="4" height="17" rx="2" fill="#7a5838" stroke="#3a2a1a" strokeWidth="0.7"/>
      <ellipse cx="55" cy="52" rx="24" ry="16" fill="#8a6a42" stroke="#3a2a1a" strokeWidth="1.3"/>
      <path d="M72 44 Q78 34 80 22" stroke="#3a2a1a" strokeWidth="1.3" fill="#8a6a42"/>
      <path d="M76 42 Q82 32 82 20" stroke="#3a2a1a" strokeWidth="1.3" fill="#8a6a42"/>
      <ellipse cx="82" cy="18" rx="8" ry="7" fill="#9a7a52" stroke="#3a2a1a" strokeWidth="1.3"/>
      <ellipse cx="89" cy="20" rx="4.5" ry="3" fill="#aa8a62" stroke="#3a2a1a" strokeWidth="0.8"/>
      {/* Massive antlers */}
      <path d="M76 10 Q72 -2 66 -4 M74 2 Q70 -4 64 -2 M76 6 Q70 2 66 4 M72 -2 Q68 -6 66 -2" stroke="#6a5030" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
      <path d="M86 8 Q90 -4 96 -6 M88 0 Q92 -6 98 -4 M86 4 Q92 0 96 2 M90 -4 Q94 -8 96 -4" stroke="#6a5030" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
      <circle cx="84" cy="16" r="1.8" fill="#2a1a0a"/><circle cx="84.5" cy="15.5" r="0.5" fill="#fff"/>
      <ellipse cx="92" cy="20" rx="1.4" ry="1" fill="#2a1a1a"/>
      <path d="M78 12 Q76 6 80 9" fill="#9a7a52" stroke="#3a2a1a" strokeWidth="0.6"/>
      <path d="M85 10 Q86 4 88 8" fill="#9a7a52" stroke="#3a2a1a" strokeWidth="0.6"/>
      {/* Mane */}
      <path d="M74 36 Q76 28 80 22" stroke="#6a4a2a" strokeWidth="2.5" fill="none"/>
    </svg>
  );
}
