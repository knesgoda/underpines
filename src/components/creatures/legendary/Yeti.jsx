import React from 'react';
const id='yeti-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes yeti-appear{0%{opacity:0}15%{opacity:0.2}30%{opacity:0.25}50%{opacity:0.15}70%{opacity:0.2}85%{opacity:0.1}100%{opacity:0}}
@keyframes yeti-drift{0%{transform:translateX(30%)}100%{transform:translateX(40%)}}
`;document.head.appendChild(s);}
export default function Yeti({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 80 100" width="80" height="100" className={className}
      style={{willChange:'transform',animation:'yeti-appear 10s ease-in-out forwards, yeti-drift 10s linear forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Enormous white figure — barely visible in snow */}
      <ellipse cx="40" cy="18" rx="8" ry="10" fill="#e0e0e0" opacity="0.3"/>
      <path d="M30 28 Q28 55 26 85 L54 85 Q52 55 50 28" fill="#e0e0e0" opacity="0.25"/>
      <ellipse cx="40" cy="32" rx="16" ry="6" fill="#e0e0e0" opacity="0.25"/>
      {/* Arms */}
      <path d="M26 34 Q16 48 12 60" stroke="#e0e0e0" strokeWidth="5" strokeLinecap="round" opacity="0.2"/>
      <path d="M54 34 Q64 48 68 60" stroke="#e0e0e0" strokeWidth="5" strokeLinecap="round" opacity="0.2"/>
      {/* Legs */}
      <rect x="30" y="78" width="8" height="16" rx="4" fill="#e0e0e0" opacity="0.2"/>
      <rect x="42" y="78" width="8" height="16" rx="4" fill="#e0e0e0" opacity="0.2"/>
    </svg>
  );
}
