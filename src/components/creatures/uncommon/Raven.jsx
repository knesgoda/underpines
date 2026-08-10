import React from 'react';
const id='raven-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes raven-perch{0%{transform:translateX(45%)}20%{transform:translateX(45%) rotateZ(0)}40%{transform:translateX(45%) rotateZ(6deg)}60%{transform:translateX(45%) rotateZ(-4deg)}80%,100%{transform:translateX(45%) rotateZ(0)}}
@keyframes raven-hop{0%{transform:translateX(20%)}15%{transform:translateX(26%) translateY(-5%)}20%{transform:translateX(32%) translateY(0)}35%{transform:translateX(38%) translateY(-4%)}40%{transform:translateX(44%) translateY(0)}60%,100%{transform:translateX(50%)}}
@keyframes raven-land{0%{transform:translateX(80%) translateY(-30%)}30%{transform:translateX(50%) translateY(0)}40%{transform:translateX(50%) scaleY(0.92)}50%,80%{transform:translateX(50%) scaleY(1)}85%{transform:translateX(50%) scaleX(1.05)}90%,100%{transform:translateX(50%) scaleX(1)}}
`;document.head.appendChild(s);}
export default function Raven({variant=0,direction='ltr',className=''}){
  const anims=['raven-perch 8s ease-in-out forwards','raven-hop 6s ease-in-out forwards','raven-land 7s ease-in-out forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 50 40" width="50" height="40" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="25" cy="28" rx="9" ry="8" fill="#1a1a1a" stroke="#0a0a0a" strokeWidth="0.8"/>
      <circle cx="33" cy="22" r="5" fill="#2a2a2a" stroke="#0a0a0a" strokeWidth="0.8"/>
      <circle cx="35" cy="21" r="1.2" fill="#3a3a3a"/><circle cx="35" cy="21" r="0.5" fill="#fff"/>
      <path d="M37 22 L42 21 L37 23" fill="#3a3a2a" stroke="#1a1a0a" strokeWidth="0.3"/>
      <path d="M17 27 L12 30 L14 26Z" fill="#1a1a1a" stroke="#0a0a0a" strokeWidth="0.4"/>
      <path d="M20 26 Q16 22 18 24" fill="#1a1a1a" stroke="#0a0a0a" strokeWidth="0.5"/>
      <line x1="23" y1="35" x2="22" y2="38" stroke="#2a2a1a" strokeWidth="0.6"/>
      <line x1="27" y1="35" x2="28" y2="38" stroke="#2a2a1a" strokeWidth="0.6"/>
    </svg>
  );
}
