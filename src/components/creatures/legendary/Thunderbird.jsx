import React from 'react';
const id='thunderbird-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes tbird-flash{0%{opacity:0}48%{opacity:0}49%{opacity:0.8}52%{opacity:0.7}53%{opacity:0}100%{opacity:0}}
`;document.head.appendChild(s);}
export default function Thunderbird({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 140 40" width="140" height="40" className={className}
      style={{willChange:'transform',animation:'tbird-flash 4s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Massive — visible only in lightning flash */}
      <path d="M70 20 Q45 6 10 12 Q18 16 28 15 Q20 12 14 16" fill="#e8e4d0" stroke="#c0b890" strokeWidth="0.6" opacity="0.8"/>
      <path d="M70 20 Q95 6 130 12 Q122 16 112 15 Q120 12 126 16" fill="#e8e4d0" stroke="#c0b890" strokeWidth="0.6" opacity="0.8"/>
      {/* Fingered wing tips */}
      <path d="M10 12 L6 10 M14 11 L10 8 M18 10 L16 6" stroke="#c0b890" strokeWidth="0.8" strokeLinecap="round" opacity="0.7"/>
      <path d="M130 12 L134 10 M126 11 L130 8 M122 10 L124 6" stroke="#c0b890" strokeWidth="0.8" strokeLinecap="round" opacity="0.7"/>
      {/* Body */}
      <ellipse cx="70" cy="20" rx="12" ry="6" fill="#d4d0b8" stroke="#a0986a" strokeWidth="0.6" opacity="0.8"/>
      {/* Head */}
      <ellipse cx="82" cy="17" rx="5" ry="3.5" fill="#e0dcca" stroke="#a0986a" strokeWidth="0.5" opacity="0.8"/>
      <path d="M86 17 L92 18 L86 19" fill="#d4a020" opacity="0.7"/>
      <circle cx="84" cy="16" r="1" fill="#d4a020" opacity="0.7"/>
      {/* Tail */}
      <path d="M58 22 L50 26 L54 20Z" fill="#d4d0b8" opacity="0.6"/>
    </svg>
  );
}
