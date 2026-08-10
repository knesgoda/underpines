import React from 'react';
const id='shark-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes shark-cut{0%{transform:translateX(-5%)}100%{transform:translateX(110%)}}
@keyframes shark-circle{0%{transform:translateX(40%) translateY(0)}25%{transform:translateX(50%) translateY(-3%)}50%{transform:translateX(45%) translateY(0)}75%{transform:translateX(35%) translateY(3%)}100%{transform:translateX(40%) translateY(0)}}
`;document.head.appendChild(s);}
export default function Shark({variant=0,direction='ltr',className=''}){
  const anims=['shark-cut 4s linear forwards','shark-circle 8s ease-in-out infinite'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 60 30" width="60" height="30" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Dorsal fin */}
      <path d="M30 18 Q32 4 34 18" fill="#5a6a7a" stroke="#3a4a5a" strokeWidth="0.8"/>
      {/* Water line */}
      <path d="M0 18 Q15 16 30 18 Q45 20 60 18" stroke="#6a9ab0" strokeWidth="0.4" fill="none" opacity="0.4"/>
      {/* Subtle body shadow */}
      <ellipse cx="30" cy="20" rx="10" ry="3" fill="#5a6a7a" opacity="0.2"/>
    </svg>
  );
}
