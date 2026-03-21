import React from 'react';
const id='vulture-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes vulture-circle{0%{transform:translateX(30%) translateY(5%) rotateZ(0) scale(0.8)}25%{transform:translateX(55%) translateY(3%) rotateZ(8deg) scale(0.85)}50%{transform:translateX(50%) translateY(8%) rotateZ(0) scale(0.9)}75%{transform:translateX(35%) translateY(4%) rotateZ(-8deg) scale(0.85)}100%{transform:translateX(40%) translateY(5%) rotateZ(0) scale(0.8)}}
@keyframes vulture-perch{0%{transform:translateX(40%);opacity:0}10%{opacity:1}80%{opacity:1}100%{opacity:0}}
`;document.head.appendChild(s);}
export default function Vulture({variant=0,direction='ltr',className=''}){
  const anims=['vulture-circle 16s ease-in-out infinite','vulture-perch 14s ease-in-out forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 80 50" width="80" height="50" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {variant===0?<>
        {/* Circling flight */}
        <path d="M40 20 Q22 10 6 16" fill="#3a3a3a" stroke="#2a2a2a" strokeWidth="0.7"/>
        <path d="M40 20 Q58 10 74 16" fill="#3a3a3a" stroke="#2a2a2a" strokeWidth="0.7"/>
        {/* Fingered wing tips */}
        <path d="M6 16 L4 14 M8 15 L6 12 M10 14 L9 11" stroke="#2a2a2a" strokeWidth="0.6" strokeLinecap="round"/>
        <path d="M74 16 L76 14 M72 15 L74 12 M70 14 L71 11" stroke="#2a2a2a" strokeWidth="0.6" strokeLinecap="round"/>
        <ellipse cx="40" cy="20" rx="6" ry="4" fill="#3a3a3a" stroke="#2a2a2a" strokeWidth="0.7"/>
        <circle cx="46" cy="18" r="2.5" fill="#5a2a2a" stroke="#2a2a2a" strokeWidth="0.5"/>
        <path d="M48 18 L51 19 L48 20" fill="#4a4a3a" strokeWidth="0.2" stroke="#2a2a1a"/>
        <circle cx="47" cy="17.5" r="0.5" fill="#1a1a1a"/>
      </>:<>
        {/* Perched, wings half-spread */}
        <ellipse cx="40" cy="30" rx="8" ry="10" fill="#3a3a3a" stroke="#2a2a2a" strokeWidth="0.8"/>
        <path d="M32 26 Q22 20 16 24" fill="#3a3a3a" stroke="#2a2a2a" strokeWidth="0.6"/>
        <path d="M48 26 Q58 20 64 24" fill="#3a3a3a" stroke="#2a2a2a" strokeWidth="0.6"/>
        <path d="M38 22 Q40 16 44 18" stroke="#2a2a2a" strokeWidth="0.8" fill="#4a3a3a"/>
        <circle cx="42" cy="18" r="3" fill="#5a2a2a" stroke="#2a2a2a" strokeWidth="0.5"/>
        <circle cx="43" cy="17" r="0.6" fill="#1a1a1a"/>
        <path d="M44 18 L48 19 L44 20" fill="#4a4a3a"/>
        <line x1="38" y1="40" x2="37" y2="46" stroke="#4a4a3a" strokeWidth="0.8"/>
        <line x1="42" y1="40" x2="43" y2="46" stroke="#4a4a3a" strokeWidth="0.8"/>
      </>}
    </svg>
  );
}
