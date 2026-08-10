import React from 'react';
const id='troll-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes troll-shift{0%,40%{transform:translateX(35%);opacity:0.4}42%{transform:translateX(35%) translateY(-1%);opacity:0.5}46%{transform:translateX(35%) translateY(0);opacity:0.4}50%,100%{transform:translateX(35%);opacity:0.35}}
`;document.head.appendChild(s);}
export default function Troll({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 80 80" width="80" height="80" className={className}
      style={{willChange:'transform',animation:'troll-shift 16s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Massive mossy silhouette — looks like rocks */}
      <path d="M25 75 Q20 50 22 35 Q24 25 30 20 Q38 15 45 18 Q55 22 58 30 Q62 40 60 55 Q58 70 55 75Z" fill="#4a5a3a" opacity="0.5" stroke="#3a4a2a" strokeWidth="0.8"/>
      {/* Mossy texture */}
      <circle cx="35" cy="40" r="2" fill="#5a7a4a" opacity="0.3"/>
      <circle cx="45" cy="35" r="1.5" fill="#5a7a4a" opacity="0.25"/>
      <circle cx="40" cy="50" r="2.5" fill="#5a7a4a" opacity="0.2"/>
      {/* Barely visible face */}
      <circle cx="38" cy="26" r="0.8" fill="#2a2a1a" opacity="0.3"/>
      <circle cx="44" cy="26" r="0.8" fill="#2a2a1a" opacity="0.3"/>
      {/* Nose — rock-like */}
      <path d="M40 28 Q41 30 42 28" fill="#4a5a3a" opacity="0.3"/>
    </svg>
  );
}
