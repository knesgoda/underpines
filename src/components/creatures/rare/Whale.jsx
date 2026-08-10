import React from 'react';
const id='whale-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes whale-spout{0%{transform:translateX(40%);opacity:0}10%{opacity:1}30%,70%{transform:translateX(45%);opacity:1}100%{transform:translateX(45%);opacity:0}}
@keyframes whale-fluke{0%{transform:translateX(40%) translateY(10%);opacity:0}15%{opacity:1}30%{transform:translateX(42%) translateY(-5%)}50%{transform:translateX(44%) translateY(-15%)}70%{transform:translateX(46%) translateY(-5%)}85%{transform:translateX(46%) translateY(10%);opacity:1}100%{opacity:0}}
@keyframes spout-rise{0%{transform:scaleY(0);opacity:0}30%{transform:scaleY(1);opacity:0.7}60%{transform:scaleY(1.5);opacity:0.4}100%{transform:scaleY(2);opacity:0}}
`;document.head.appendChild(s);}
export default function Whale({variant=0,direction='ltr',className=''}){
  const anims=['whale-spout 10s ease-in-out forwards','whale-fluke 8s ease-in-out forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 80 50" width="80" height="50" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {variant===0?<>
        {/* Distant spout */}
        <ellipse cx="40" cy="38" rx="6" ry="2" fill="#3a4a5a" opacity="0.3"/>
        <line x1="40" y1="36" x2="40" y2="18" stroke="#fff" strokeWidth="1.5" opacity="0.6"
          style={{animation:'spout-rise 3s ease-out infinite',transformOrigin:'40px 36px'}}/>
        <path d="M37 20 Q40 16 43 20" stroke="#fff" strokeWidth="0.8" opacity="0.4" fill="none"/>
      </>:<>
        {/* Tail fluke */}
        <path d="M40 30 L30 20 Q40 24 40 30 Q40 24 50 20 L40 30" fill="#3a4a5a" stroke="#2a3a4a" strokeWidth="0.8"/>
        <path d="M0 32 Q20 30 40 32 Q60 34 80 32" stroke="#6a9ab0" strokeWidth="0.5" fill="none" opacity="0.3"/>
        <circle cx="38" cy="36" r="1" fill="#8ab8d0" opacity="0.3"/>
        <circle cx="44" cy="38" r="0.8" fill="#8ab8d0" opacity="0.25"/>
      </>}
    </svg>
  );
}
