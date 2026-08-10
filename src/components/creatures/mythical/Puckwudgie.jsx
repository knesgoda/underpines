import React from 'react';
const id='puckwudgie-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes puck-dart{0%{transform:translateX(20%);opacity:0}8%{opacity:0.5}12%{transform:translateX(28%) translateY(-3%);opacity:0.6}18%{transform:translateX(35%);opacity:0}40%{opacity:0}45%{transform:translateX(55%);opacity:0.4}50%{transform:translateX(60%);opacity:0}100%{opacity:0}}
`;document.head.appendChild(s);}
export default function Puckwudgie({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 40 30" width="40" height="30" className={className}
      style={{willChange:'transform',animation:'puck-dart 3s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Small quick figure — barely visible */}
      <circle cx="20" cy="12" r="3" fill="#4a4a3a" opacity="0.5"/>
      <path d="M17 15 Q16 24 15 28 L25 28 Q24 24 23 15" fill="#4a4a3a" opacity="0.4"/>
      {/* Spiny hair */}
      <path d="M18 10 L17 6 M20 9 L20 5 M22 10 L23 6" stroke="#3a3a2a" strokeWidth="0.6" opacity="0.4"/>
      {/* Eyes — mischievous */}
      <circle cx="19" cy="11" r="0.8" fill="#a0c020" opacity="0.6"/>
      <circle cx="22" cy="11" r="0.8" fill="#a0c020" opacity="0.6"/>
    </svg>
  );
}
