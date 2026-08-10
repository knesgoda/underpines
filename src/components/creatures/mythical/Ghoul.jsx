import React from 'react';
const id='ghoul-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes ghoul-lurk{0%{opacity:0}20%{opacity:0}25%{opacity:0.3}35%{opacity:0.35}45%{opacity:0.25}55%{opacity:0}100%{opacity:0}}
`;document.head.appendChild(s);}
export default function Ghoul({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 40 40" width="40" height="40" className={className}
      style={{willChange:'transform',animation:'ghoul-lurk 8s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Crouching figure in shadow */}
      <ellipse cx="20" cy="28" rx="10" ry="6" fill="#2a2a2a" opacity="0.3"/>
      <circle cx="22" cy="22" r="4" fill="#2a2a2a" opacity="0.3"/>
      {/* Eyes barely visible */}
      <circle cx="21" cy="21" r="0.7" fill="#4a6a4a" opacity="0.4"/>
      <circle cx="24" cy="21" r="0.7" fill="#4a6a4a" opacity="0.4"/>
    </svg>
  );
}
