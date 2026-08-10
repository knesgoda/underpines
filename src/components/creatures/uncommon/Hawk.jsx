import React from 'react';
const id='hawk-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes hawk-flight{0%{transform:translateX(-10%) translateY(15%)}100%{transform:translateX(110%) translateY(10%)}}
@keyframes hawk-dive{0%{transform:translateX(20%) translateY(5%)}40%,50%{transform:translateX(50%) translateY(5%)}70%{transform:translateX(55%) translateY(40%)}85%{transform:translateX(70%) translateY(20%)}100%{transform:translateX(110%) translateY(10%)}}
`;document.head.appendChild(s);}
export default function Hawk({variant=0,direction='ltr',className=''}){
  const anims=['hawk-flight 5s linear forwards','hawk-dive 7s ease-in-out forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 60 24" width="60" height="24" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 12 Q20 5 6 7" fill="#6a4a30" stroke="#3a2a1a" strokeWidth="0.7"/>
      <path d="M30 12 Q40 5 54 7" fill="#6a4a30" stroke="#3a2a1a" strokeWidth="0.7"/>
      <ellipse cx="30" cy="12" rx="6" ry="4" fill="#7a5a3a" stroke="#3a2a1a" strokeWidth="0.7"/>
      <circle cx="36" cy="10" r="2.5" fill="#8a6a4a" stroke="#3a2a1a" strokeWidth="0.5"/>
      <circle cx="37" cy="9.5" r="0.7" fill="#d4a020"/><circle cx="37" cy="9.5" r="0.35" fill="#1a1a1a"/>
      <path d="M38 10 L41 10.5 L38 11" fill="#4a4a3a" strokeWidth="0.2" stroke="#2a2a1a"/>
      <path d="M24 13 L20 15 L22 12Z" fill="#6a4a30" stroke="#3a2a1a" strokeWidth="0.3"/>
    </svg>
  );
}
