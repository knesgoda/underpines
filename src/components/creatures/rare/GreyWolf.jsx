import React from 'react';
const id='greywolf-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes gwolf-cross{0%{transform:translateX(-5%)}100%{transform:translateX(110%)}}
@keyframes gwolf-pack{0%{transform:translateX(30%);opacity:0}10%{opacity:1}80%{opacity:1}100%{transform:translateX(30%);opacity:0}}
`;document.head.appendChild(s);}
export default function GreyWolf({variant=0,direction='ltr',className=''}){
  const anims=['gwolf-cross 8s ease-in-out forwards','gwolf-pack 14s ease-in-out forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 140 70" width="140" height="70" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Main wolf */}
      <g>
        <path d="M26 48 Q18 44 16 48 Q18 52 24 52" fill="#6a6a6a" stroke="#3a3a3a" strokeWidth="0.7"/>
        <rect x="36" y="54" width="3" height="11" rx="1.5" fill="#6a6a6a" stroke="#3a3a3a" strokeWidth="0.5"/>
        <rect x="52" y="54" width="3" height="11" rx="1.5" fill="#6a6a6a" stroke="#3a3a3a" strokeWidth="0.5"/>
        <ellipse cx="44" cy="46" rx="16" ry="10" fill="#7a7a7a" stroke="#3a3a3a" strokeWidth="1"/>
        <ellipse cx="62" cy="36" rx="7" ry="5.5" fill="#8a8a8a" stroke="#3a3a3a" strokeWidth="1"/>
        <ellipse cx="68" cy="38" rx="4" ry="2.5" fill="#9a9a9a" stroke="#3a3a3a" strokeWidth="0.6"/>
        <path d="M58 30 Q56 24 60 26" fill="#8a8a8a" stroke="#3a3a3a" strokeWidth="0.5"/>
        <path d="M64 28 Q64 22 68 24" fill="#8a8a8a" stroke="#3a3a3a" strokeWidth="0.5"/>
        <circle cx="63" cy="34" r="1.5" fill="#c4a020"/><circle cx="63" cy="34" r="0.7" fill="#1a1a1a"/>
        <ellipse cx="71" cy="38" rx="1" ry="0.7" fill="#2a2a2a"/>
      </g>
      {/* Pack silhouettes (variant 1) */}
      {variant===1&&<>
        <g opacity="0.25" transform="translate(75,10) scale(0.55)">
          <ellipse cx="44" cy="46" rx="14" ry="9" fill="#4a4a4a"/>
          <ellipse cx="60" cy="38" rx="6" ry="5" fill="#4a4a4a"/>
          <path d="M56 32 Q54 26 58 28" fill="#4a4a4a"/>
          <path d="M62 30 Q62 24 66 26" fill="#4a4a4a"/>
        </g>
        <g opacity="0.18" transform="translate(90,14) scale(0.45)">
          <ellipse cx="44" cy="46" rx="14" ry="9" fill="#3a3a3a"/>
          <ellipse cx="60" cy="38" rx="6" ry="5" fill="#3a3a3a"/>
        </g>
        <g opacity="0.15" transform="translate(65,16) scale(0.4)">
          <ellipse cx="44" cy="46" rx="14" ry="9" fill="#3a3a3a"/>
          <ellipse cx="60" cy="38" rx="6" ry="5" fill="#3a3a3a"/>
        </g>
      </>}
    </svg>
  );
}
