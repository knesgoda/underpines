import React from 'react';
const id='stork-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes stork-fly{0%{transform:translateX(-10%) translateY(15%)}100%{transform:translateX(110%) translateY(10%)}}
@keyframes stork-stand{0%,100%{transform:translateX(40%)}50%{transform:translateX(40%) translateY(-1%)}}
`;document.head.appendChild(s);}
export default function Stork({variant=0,direction='ltr',className=''}){
  const anims=['stork-fly 10s linear forwards','stork-stand 8s ease-in-out infinite'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 70 60" width="70" height="60" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {variant===0?<>
        {/* Flying */}
        <path d="M35 25 Q20 15 5 20" fill="#f0ece4" stroke="#3a3a3a" strokeWidth="0.7"/>
        <path d="M35 25 Q50 15 65 20" fill="#f0ece4" stroke="#3a3a3a" strokeWidth="0.7"/>
        <path d="M30 24 Q26 16 5 20" fill="#1a1a1a" opacity="0.7"/>
        <path d="M40 24 Q44 16 65 20" fill="#1a1a1a" opacity="0.7"/>
        <ellipse cx="35" cy="25" rx="6" ry="4" fill="#f0ece4" stroke="#3a3a3a" strokeWidth="0.7"/>
        <path d="M40 24 Q46 22 50 24" fill="#f0ece4" stroke="#3a3a3a" strokeWidth="0.5"/>
        <circle cx="48" cy="23" r="2" fill="#f0ece4" stroke="#3a3a3a" strokeWidth="0.4"/>
        <path d="M50 23 L56 22" stroke="#c83030" strokeWidth="1" strokeLinecap="round"/>
        <circle cx="49" cy="22.5" r="0.5" fill="#1a1a1a"/>
        <path d="M30 26 L24 32" stroke="#c83030" strokeWidth="0.8"/><path d="M32 27 L28 34" stroke="#c83030" strokeWidth="0.8"/>
      </>:<>
        {/* Standing on one leg */}
        <ellipse cx="35" cy="30" rx="8" ry="10" fill="#f0ece4" stroke="#3a3a3a" strokeWidth="0.8"/>
        <path d="M30 28 Q26 24 28 26" fill="#1a1a1a"/>
        <path d="M38 20 Q40 14 42 12" stroke="#3a3a3a" strokeWidth="0.8" fill="#f0ece4"/>
        <circle cx="42" cy="11" r="3" fill="#f0ece4" stroke="#3a3a3a" strokeWidth="0.6"/>
        <path d="M44 11 L50 10" stroke="#c83030" strokeWidth="1.2" strokeLinecap="round"/>
        <circle cx="43" cy="10" r="0.6" fill="#1a1a1a"/>
        <line x1="35" y1="40" x2="35" y2="56" stroke="#c83030" strokeWidth="1.2"/>
      </>}
    </svg>
  );
}
