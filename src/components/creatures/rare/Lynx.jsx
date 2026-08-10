import React from 'react';
const id='lynx-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes lynx-pad{0%{transform:translateX(-5%);opacity:0}8%{opacity:1}40%{transform:translateX(40%)}45%,55%{transform:translateX(42%)}60%{transform:translateX(50%);opacity:1}90%{opacity:0}100%{opacity:0}}
@keyframes lynx-crouch{0%{transform:translateX(35%) scaleY(1);opacity:0}10%{opacity:1}20%{transform:translateX(38%) scaleY(0.7)}80%{transform:translateX(38%) scaleY(0.7)}90%{opacity:0.3}100%{opacity:0}}
`;document.head.appendChild(s);}
export default function Lynx({variant=0,direction='ltr',className=''}){
  const anims=['lynx-pad 9s ease-in-out forwards','lynx-crouch 12s ease-in-out forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 80 55" width="80" height="55" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="52" rx="14" ry="2" fill="rgba(0,0,0,0.08)"/>
      {/* Stubby tail */}
      <ellipse cx="18" cy="36" rx="3" ry="2" fill="#9a8060" stroke="#5a4030" strokeWidth="0.6"/>
      <rect x="28" y="42" width="2.8" height="10" rx="1.3" fill="#9a8060" stroke="#5a4030" strokeWidth="0.5"/>
      <rect x="48" y="42" width="2.8" height="10" rx="1.3" fill="#9a8060" stroke="#5a4030" strokeWidth="0.5"/>
      <ellipse cx="38" cy="36" rx="16" ry="10" fill="#aa9070" stroke="#5a4030" strokeWidth="1"/>
      <ellipse cx="40" cy="40" rx="10" ry="5" fill="#c4b090"/>
      {/* Ruffs */}
      <path d="M50 28 Q54 24 56 28 Q54 32 50 30" fill="#c4b090" stroke="#5a4030" strokeWidth="0.5"/>
      <circle cx="56" cy="28" r="5.5" fill="#b09a78" stroke="#5a4030" strokeWidth="1"/>
      <ellipse cx="61" cy="30" rx="3" ry="2" fill="#c4b090" stroke="#5a4030" strokeWidth="0.5"/>
      {/* Ear tufts — prominent */}
      <path d="M52 22 Q50 12 54 14 Q56 16 54 22" fill="#b09a78" stroke="#5a4030" strokeWidth="0.6"/>
      <line x1="52" y1="12" x2="50" y2="8" stroke="#2a2a2a" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M58 20 Q58 10 62 12 Q63 14 60 20" fill="#b09a78" stroke="#5a4030" strokeWidth="0.6"/>
      <line x1="60" y1="10" x2="62" y2="6" stroke="#2a2a2a" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Eyes — intense */}
      <circle cx="57" cy="26" r="1.8" fill="#8ab040"/><circle cx="57" cy="26" r="0.8" fill="#1a1a1a"/>
      <ellipse cx="63" cy="30" rx="0.8" ry="0.5" fill="#3a2a1a"/>
    </svg>
  );
}
