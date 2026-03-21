import React from 'react';
const id='hhorseman-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes hh-gallop{0%{transform:translateX(-10%);opacity:0}5%{opacity:0.6}50%{transform:translateX(50%)}95%{opacity:0.5}100%{transform:translateX(110%);opacity:0}}
@keyframes hh-cape{0%,100%{transform:rotate(0)}50%{transform:rotate(-8deg)}}
@keyframes horse-gallop{0%,100%{transform:translateY(0)}50%{transform:translateY(-3%)}}
`;document.head.appendChild(s);}
export default function HeadlessHorseman({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 100 65" width="100" height="65" className={className}
      style={{willChange:'transform',animation:'hh-gallop 4s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <g style={{animation:'horse-gallop 0.4s ease-in-out infinite'}}>
        {/* Horse */}
        <ellipse cx="50" cy="40" rx="20" ry="10" fill="#2a2a2a" opacity="0.6"/>
        <path d="M66 34 Q72 26 74 20" stroke="#2a2a2a" strokeWidth="2" fill="none" opacity="0.5"/>
        <ellipse cx="74" cy="18" rx="5" ry="4" fill="#2a2a2a" opacity="0.5"/>
        <rect x="36" y="46" width="3" height="12" rx="1" fill="#2a2a2a" opacity="0.5" transform="rotate(-10 37 46)"/>
        <rect x="42" y="47" width="3" height="11" rx="1" fill="#2a2a2a" opacity="0.5" transform="rotate(5 43 47)"/>
        <rect x="56" y="46" width="3" height="12" rx="1" fill="#2a2a2a" opacity="0.5" transform="rotate(10 57 46)"/>
        <rect x="62" y="47" width="3" height="11" rx="1" fill="#2a2a2a" opacity="0.5" transform="rotate(-5 63 47)"/>
        {/* Rider — NO HEAD */}
        <rect x="46" y="24" width="8" height="16" rx="1" fill="#1a1a1a" opacity="0.6"/>
        {/* Cape flying */}
        <path d="M46 26 Q36 22 28 28 Q32 24 38 20 Q42 18 46 22" fill="#1a1a1a" opacity="0.5"
          style={{animation:'hh-cape 0.6s ease-in-out infinite',transformOrigin:'46px 26px'}}/>
        {/* Neck stump — just darkness */}
        <rect x="48" y="22" width="4" height="3" rx="1" fill="#1a1a1a" opacity="0.6"/>
      </g>
    </svg>
  );
}
