import React from 'react';
const id='wendigo-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes wendigo-stand{0%{opacity:0}10%{opacity:0.5}60%{opacity:0.5}75%{opacity:0.3}85%{opacity:0.1}100%{opacity:0}}
`;document.head.appendChild(s);}
export default function Wendigo({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 60 120" width="60" height="120" className={className}
      style={{willChange:'transform',animation:'wendigo-stand 4s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* TOO TALL — antlered silhouette */}
      {/* Antlers */}
      <path d="M24 14 Q18 4 12 0 M20 8 Q14 4 10 6 M22 10 Q16 8 12 10" stroke="#3a3a2a" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.5"/>
      <path d="M36 14 Q42 4 48 0 M40 8 Q46 4 50 6 M38 10 Q44 8 48 10" stroke="#3a3a2a" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.5"/>
      {/* Head — small, wrong */}
      <ellipse cx="30" cy="18" rx="5" ry="6" fill="#2a2a2a" opacity="0.5"/>
      {/* Eyes */}
      <circle cx="28" cy="17" r="0.8" fill="#c0c080" opacity="0.4"/>
      <circle cx="33" cy="17" r="0.8" fill="#c0c080" opacity="0.4"/>
      {/* Body — too thin */}
      <path d="M26 24 Q24 60 22 100 L38 100 Q36 60 34 24" fill="#2a2a2a" opacity="0.45"/>
      {/* Arms — TOO LONG */}
      <path d="M24 30 Q14 50 8 75" stroke="#2a2a2a" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
      <path d="M36 30 Q46 50 52 75" stroke="#2a2a2a" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
      {/* Fingers — elongated */}
      <path d="M8 75 L4 80 M8 75 L6 82 M8 75 L10 81" stroke="#2a2a2a" strokeWidth="0.8" opacity="0.35"/>
      <path d="M52 75 L56 80 M52 75 L54 82 M52 75 L50 81" stroke="#2a2a2a" strokeWidth="0.8" opacity="0.35"/>
      {/* Legs */}
      <rect x="24" y="95" width="5" height="20" rx="2" fill="#2a2a2a" opacity="0.4"/>
      <rect x="32" y="95" width="5" height="20" rx="2" fill="#2a2a2a" opacity="0.4"/>
    </svg>
  );
}
