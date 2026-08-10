import React from 'react';
const id='vampire-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes vamp-crouch{0%{opacity:0}10%{opacity:0.7}60%{opacity:0.7}80%{opacity:0.3}100%{opacity:0}}
@keyframes vamp-eyes{0%{opacity:0}20%{opacity:0}30%{opacity:0.9}50%{opacity:0.9}55%{opacity:0}60%{opacity:0.8}70%{opacity:0}100%{opacity:0}}
`;document.head.appendChild(s);}
export default function Vampire({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 50 50" width="50" height="50" className={className}
      style={{willChange:'transform',animation:variant===0?'vamp-crouch 10s ease-in-out forwards':'none',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {variant===0?<>
        {/* Crouched silhouette on branch */}
        <rect x="5" y="30" width="40" height="2" rx="1" fill="#2a2a2a" opacity="0.5"/>
        <path d="M22 18 Q20 28 18 30 L32 30 Q30 28 28 18" fill="#1a1a1a" opacity="0.7"/>
        <circle cx="25" cy="16" r="3.5" fill="#1a1a1a" opacity="0.7"/>
        {/* Cape drape */}
        <path d="M18 30 Q14 36 12 40 L38 40 Q36 36 32 30" fill="#1a1a1a" opacity="0.5"/>
        {/* Eyes */}
        <circle cx="24" cy="15" r="0.8" fill="#c02020" opacity="0.6"/>
        <circle cx="27" cy="15" r="0.8" fill="#c02020" opacity="0.6"/>
      </>:<>
        {/* Just eyes between trees */}
        <circle cx="22" cy="25" r="1" fill="#c02020" style={{animation:'vamp-eyes 6s ease-in-out forwards'}}/>
        <circle cx="28" cy="25" r="1" fill="#c02020" style={{animation:'vamp-eyes 6s ease-in-out 0.1s forwards'}}/>
      </>}
    </svg>
  );
}
