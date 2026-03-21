import React from 'react';
const id='huldra-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes huldra-glimpse{0%{opacity:0}15%{opacity:0.35}40%{opacity:0.4}60%{opacity:0.3}80%{opacity:0.1}100%{opacity:0}}
`;document.head.appendChild(s);}
export default function Huldra({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 40 70" width="40" height="70" className={className}
      style={{willChange:'transform',animation:'huldra-glimpse 8s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Backlit figure between birch trunks */}
      <rect x="4" y="0" width="4" height="70" fill="#d4ccc0" opacity="0.3"/>
      <rect x="32" y="0" width="4" height="70" fill="#d4ccc0" opacity="0.3"/>
      {/* Figure — almost human */}
      <circle cx="20" cy="16" r="4" fill="#c0b0a0" opacity="0.25"/>
      <path d="M16 20 Q15 40 14 55 L26 55 Q25 40 24 20" fill="#c0b0a0" opacity="0.2"/>
      {/* Long hair */}
      <path d="M16 14 Q12 24 10 38" stroke="#8a7a5a" strokeWidth="0.8" fill="none" opacity="0.2"/>
      <path d="M18 16 Q14 26 12 40" stroke="#8a7a5a" strokeWidth="0.6" fill="none" opacity="0.15"/>
      <path d="M24 14 Q28 24 30 38" stroke="#8a7a5a" strokeWidth="0.8" fill="none" opacity="0.2"/>
    </svg>
  );
}
