import React from 'react';
const id='witch-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes witch-appear{0%{opacity:0}15%{opacity:0.6}70%{opacity:0.6}85%{opacity:0.2}100%{opacity:0}}
`;document.head.appendChild(s);}
export default function Witch({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 40 60" width="40" height="60" className={className}
      style={{willChange:'transform',animation:'witch-appear 8s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Distant silhouette — iconic pointed hat */}
      <path d="M20 4 L16 18 L24 18Z" fill="#2a2a2a" opacity="0.7"/>
      <rect x="14" y="18" width="12" height="2" rx="0.5" fill="#2a2a2a" opacity="0.7"/>
      {/* Body/cloak */}
      <path d="M16 20 Q14 40 10 52 L30 52 Q26 40 24 20" fill="#2a2a2a" opacity="0.6"/>
      {/* Staff */}
      <line x1="28" y1="22" x2="32" y2="52" stroke="#3a3a2a" strokeWidth="0.8" opacity="0.5"/>
    </svg>
  );
}
