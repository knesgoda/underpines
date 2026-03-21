import React from 'react';
const id='owl-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes owl-perch{0%{transform:translateX(40%) scaleX(1)}20%{transform:translateX(40%) scaleX(1)}40%{transform:translateX(40%) scaleX(-1)}60%{transform:translateX(40%) scaleX(-1)}80%{transform:translateX(40%) scaleX(1)}100%{transform:translateX(40%) scaleX(1)}}
@keyframes owl-fly{0%{transform:translateX(-5%) translateY(20%)}100%{transform:translateX(105%) translateY(15%)}}
@keyframes owl-wingbeat{0%,100%{transform:scaleY(1)}50%{transform:scaleY(0.92)}}
`;document.head.appendChild(s);}
export default function Owl({variant=0,direction='ltr',className=''}){
  const anims=['owl-perch 10s ease-in-out forwards','owl-fly 12s linear forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 50 50" width="50" height="50" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {variant===0?<>
        {/* Perched owl */}
        <ellipse cx="25" cy="30" rx="10" ry="12" fill="#8a7a5a" stroke="#4a3a2a" strokeWidth="1"/>
        <ellipse cx="25" cy="34" rx="7" ry="6" fill="#c8b898"/>
        <circle cx="25" cy="20" r="8" fill="#9a8a6a" stroke="#4a3a2a" strokeWidth="1"/>
        {/* Facial disc */}
        <circle cx="21" cy="19" r="4" fill="#c8b898" stroke="#8a7a5a" strokeWidth="0.5"/>
        <circle cx="29" cy="19" r="4" fill="#c8b898" stroke="#8a7a5a" strokeWidth="0.5"/>
        <circle cx="21" cy="19" r="2.5" fill="#d4a020"/>
        <circle cx="21" cy="19" r="1.2" fill="#1a1a1a"/>
        <circle cx="29" cy="19" r="2.5" fill="#d4a020"/>
        <circle cx="29" cy="19" r="1.2" fill="#1a1a1a"/>
        <path d="M24 22 L25 24 L26 22" fill="#5a4a3a"/>
        {/* Ear tufts */}
        <path d="M19 14 Q18 8 21 12" fill="#8a7a5a" stroke="#4a3a2a" strokeWidth="0.5"/>
        <path d="M31 14 Q32 8 29 12" fill="#8a7a5a" stroke="#4a3a2a" strokeWidth="0.5"/>
        {/* Feet */}
        <path d="M22 42 L20 44 M22 42 L22 44 M22 42 L24 44" stroke="#6a5a3a" strokeWidth="0.7"/>
        <path d="M28 42 L26 44 M28 42 L28 44 M28 42 L30 44" stroke="#6a5a3a" strokeWidth="0.7"/>
      </>:<>
        {/* Flying owl */}
        <g style={{animation:'owl-wingbeat 2s ease-in-out infinite'}}>
          <path d="M25 25 Q12 15 4 18" fill="#8a7a5a" stroke="#4a3a2a" strokeWidth="0.7"/>
          <path d="M25 25 Q38 15 46 18" fill="#8a7a5a" stroke="#4a3a2a" strokeWidth="0.7"/>
        </g>
        <ellipse cx="25" cy="25" rx="7" ry="5" fill="#8a7a5a" stroke="#4a3a2a" strokeWidth="0.8"/>
        <circle cx="30" cy="23" r="3.5" fill="#9a8a6a" stroke="#4a3a2a" strokeWidth="0.6"/>
        <circle cx="29" cy="22" r="1.5" fill="#d4a020"/><circle cx="29" cy="22" r="0.6" fill="#1a1a1a"/>
        <circle cx="32" cy="22" r="1.5" fill="#d4a020"/><circle cx="32" cy="22" r="0.6" fill="#1a1a1a"/>
      </>}
    </svg>
  );
}
