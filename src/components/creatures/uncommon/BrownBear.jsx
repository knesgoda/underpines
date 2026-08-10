import React from 'react';
const id='brownbear-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes bear-amble{0%{transform:translateX(0) rotateZ(0)}15%{transform:translateX(14%) rotateZ(-1deg)}30%{transform:translateX(28%) rotateZ(1deg)}40%,55%{transform:translateX(40%)}45%{transform:translateX(40%) rotateZ(-2deg)}65%{transform:translateX(60%) rotateZ(0)}100%{transform:translateX(100%)}}
@keyframes bear-standup{0%{transform:translateX(0) scaleY(1)}30%{transform:translateX(28%) scaleY(1)}40%,60%{transform:translateX(32%) scaleY(1.15) translateY(-8%)}70%{transform:translateX(35%) scaleY(1) translateY(0)}100%{transform:translateX(100%)}}
`;document.head.appendChild(s);}
export default function BrownBear({variant=0,direction='ltr',className=''}){
  const anims=['bear-amble 10s ease-in-out forwards','bear-standup 11s ease-in-out forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 110 80" width="110" height="80" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="55" cy="76" rx="20" ry="3" fill="rgba(0,0,0,0.12)"/>
      <rect x="36" y="62" width="5" height="14" rx="2.5" fill="#6a4a2a" stroke="#3a2a1a" strokeWidth="0.8"/>
      <rect x="42" y="63" width="5" height="13" rx="2.5" fill="#684828" stroke="#3a2a1a" strokeWidth="0.8"/>
      <rect x="62" y="62" width="5" height="14" rx="2.5" fill="#6a4a2a" stroke="#3a2a1a" strokeWidth="0.8"/>
      <rect x="68" y="63" width="5" height="13" rx="2.5" fill="#684828" stroke="#3a2a1a" strokeWidth="0.8"/>
      {/* Body — powerful */}
      <ellipse cx="54" cy="50" rx="24" ry="16" fill="#7a5a32" stroke="#3a2a1a" strokeWidth="1.3"/>
      {/* Shoulder hump */}
      <ellipse cx="46" cy="40" rx="10" ry="8" fill="#7a5a32"/>
      {/* Head */}
      <ellipse cx="76" cy="42" rx="10" ry="9" fill="#8a6a42" stroke="#3a2a1a" strokeWidth="1.3"/>
      <ellipse cx="84" cy="44" rx="5" ry="3.5" fill="#9a7a52" stroke="#3a2a1a" strokeWidth="0.8"/>
      <circle cx="74" cy="34" r="3" fill="#8a6a42" stroke="#3a2a1a" strokeWidth="0.6"/>
      <circle cx="80" cy="34" r="3" fill="#8a6a42" stroke="#3a2a1a" strokeWidth="0.6"/>
      <circle cx="78" cy="40" r="2" fill="#2a1a0a"/><circle cx="78.5" cy="39.5" r="0.5" fill="#fff"/>
      <ellipse cx="87" cy="44" rx="1.5" ry="1" fill="#2a1a1a"/>
    </svg>
  );
}
