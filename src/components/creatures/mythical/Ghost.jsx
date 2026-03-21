import React from 'react';
const id='ghost-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes ghost-walk{0%{transform:translateX(10%);opacity:0}10%{opacity:0.25}50%{transform:translateX(50%);opacity:0.3}80%{transform:translateX(75%);opacity:0.15}100%{transform:translateX(85%);opacity:0}}
@keyframes ghost-sway{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
`;document.head.appendChild(s);}
export default function Ghost({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 40 60" width="40" height="60" className={className}
      style={{willChange:'transform',animation:'ghost-walk 10s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <g style={{animation:'ghost-sway 3s ease-in-out infinite'}}>
        {/* Translucent figure */}
        <circle cx="20" cy="14" r="6" fill="#d0d0d0" opacity="0.2"/>
        <path d="M14 18 Q14 45 12 50 Q16 48 18 50 Q20 48 22 50 Q24 48 28 50 Q26 45 26 18" fill="#d0d0d0" opacity="0.15"/>
        {/* Faint face suggestion */}
        <circle cx="18" cy="13" r="1" fill="#aaa" opacity="0.15"/>
        <circle cx="22" cy="13" r="1" fill="#aaa" opacity="0.15"/>
      </g>
    </svg>
  );
}
