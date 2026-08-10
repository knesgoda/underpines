import React from 'react';
const id='coyote-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes coyote-trot{0%{transform:translateX(0) rotateZ(0)}15%{transform:translateX(14%) rotateZ(-1deg)}30%{transform:translateX(28%) rotateZ(1deg)}50%{transform:translateX(50%) rotateZ(-0.5deg)}75%{transform:translateX(75%) rotateZ(0.5deg)}100%{transform:translateX(100%)}}
@keyframes coyote-listen{0%{transform:translateX(0)}35%{transform:translateX(32%)}40%,60%{transform:translateX(35%) translateY(-2%)}55%{transform:translateX(35%) translateY(-2%) rotateZ(-3deg)}70%{transform:translateX(50%)}100%{transform:translateX(100%)}}
`;document.head.appendChild(s);}
export default function Coyote({variant=0,direction='ltr',className=''}){
  const anims=['coyote-trot 6s ease-in-out forwards','coyote-listen 8s ease-in-out forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 90 65" width="90" height="65" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="45" cy="62" rx="14" ry="2" fill="rgba(0,0,0,0.1)"/>
      {/* Tail — low */}
      <path d="M16 48 Q8 46 6 50 Q8 54 14 52" fill="#a89070" stroke="#5a4a3a" strokeWidth="0.8"/>
      <rect x="32" y="50" width="3" height="12" rx="1.5" fill="#9a8060" stroke="#5a4030" strokeWidth="0.6"/>
      <rect x="36" y="51" width="3" height="11" rx="1.5" fill="#988060" stroke="#5a4030" strokeWidth="0.6"/>
      <rect x="52" y="50" width="3" height="12" rx="1.5" fill="#9a8060" stroke="#5a4030" strokeWidth="0.6"/>
      <rect x="56" y="51" width="3" height="11" rx="1.5" fill="#988060" stroke="#5a4030" strokeWidth="0.6"/>
      <ellipse cx="42" cy="42" rx="16" ry="10" fill="#a89070" stroke="#5a4030" strokeWidth="1.2"/>
      <ellipse cx="44" cy="46" rx="10" ry="5" fill="#c8b8a0"/>
      {/* Neck + Head — lean */}
      <path d="M54 38 Q60 30 64 24" stroke="#5a4030" strokeWidth="1.2" fill="#a89070"/>
      <ellipse cx="66" cy="22" rx="7" ry="5.5" fill="#b8a080" stroke="#5a4030" strokeWidth="1.2"/>
      <ellipse cx="73" cy="24" rx="4" ry="2.5" fill="#c8b090" stroke="#5a4030" strokeWidth="0.6"/>
      <path d="M62 16 Q60 10 64 12" fill="#b8a080" stroke="#5a4030" strokeWidth="0.6"/>
      <path d="M68 14 Q68 8 72 10" fill="#b8a080" stroke="#5a4030" strokeWidth="0.6"/>
      <circle cx="67" cy="20" r="1.5" fill="#3a3a1a"/><circle cx="67" cy="20" r="0.7" fill="#1a1a0a"/>
      <ellipse cx="76" cy="24" rx="1" ry="0.7" fill="#2a1a1a"/>
    </svg>
  );
}
