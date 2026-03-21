import React from 'react';
const id='rhino-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes rhino-stand{0%{transform:translateX(35%);opacity:0}10%{opacity:0.5}20%,60%{transform:translateX(38%);opacity:0.5}70%{transform:translateX(38%) scaleX(-1);opacity:0.5}90%{transform:translateX(20%) scaleX(-1);opacity:0.3}100%{opacity:0}}
`;document.head.appendChild(s);}
export default function Rhino({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 100 55" width="100" height="55" className={className}
      style={{willChange:'transform',animation:'rhino-stand 14s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="52" rx="18" ry="2" fill="rgba(0,0,0,0.08)"/>
      {/* Massive legs */}
      <rect x="32" y="42" width="5" height="10" rx="2.5" fill="#6a6a5a" stroke="#3a3a2a" strokeWidth="0.6"/>
      <rect x="60" y="42" width="5" height="10" rx="2.5" fill="#6a6a5a" stroke="#3a3a2a" strokeWidth="0.6"/>
      {/* Body */}
      <ellipse cx="48" cy="36" rx="22" ry="13" fill="#7a7a6a" stroke="#3a3a2a" strokeWidth="1"/>
      {/* Head */}
      <ellipse cx="72" cy="32" rx="10" ry="8" fill="#8a8a7a" stroke="#3a3a2a" strokeWidth="1"/>
      {/* Horn */}
      <path d="M80 28 Q82 18 84 14" stroke="#8a8a6a" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M78 30 Q80 24 82 22" stroke="#8a8a6a" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Ear */}
      <path d="M68 24 Q66 18 70 20" fill="#8a8a7a" stroke="#3a3a2a" strokeWidth="0.5"/>
      {/* Eye */}
      <circle cx="74" cy="30" r="1.2" fill="#2a1a0a"/>
      {/* Tail */}
      <path d="M26 34 Q22 30 24 28" stroke="#5a5a4a" strokeWidth="1" fill="none"/>
    </svg>
  );
}
