import React from 'react';
const id='dragon-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes dragon-rest{0%{opacity:0}10%{opacity:0.7}80%{opacity:0.7}100%{opacity:0}}
@keyframes dragon-breathe{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.03)}}
@keyframes dragon-fly{0%{transform:translateX(-10%) translateY(10%)}100%{transform:translateX(110%) translateY(5%)}}
@keyframes dragon-wing{0%,100%{transform:rotateX(0)}50%{transform:rotateX(6deg)}}
`;document.head.appendChild(s);}
export default function Dragon({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return variant===0?(
    <svg viewBox="0 0 60 45" width="60" height="45" className={className}
      style={{willChange:'transform',animation:'dragon-rest 14s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Small dragon curled on rock — cat-like */}
      <ellipse cx="30" cy="38" rx="14" ry="4" fill="#7a7a6a" stroke="#4a4a3a" strokeWidth="0.6"/>
      <g style={{animation:'dragon-breathe 3s ease-in-out infinite'}}>
        {/* Curled body */}
        <path d="M22 30 Q18 26 20 22 Q24 18 30 20 Q36 18 40 22 Q42 26 38 30 Q34 34 26 34 Q22 34 22 30" fill="#4a6a4a" stroke="#2a3a2a" strokeWidth="0.8"/>
        {/* Wings folded */}
        <path d="M26 22 Q22 16 28 14 Q30 16 28 20" fill="#5a7a5a" opacity="0.5" stroke="#2a3a2a" strokeWidth="0.4"/>
        {/* Tail curled */}
        <path d="M38 30 Q44 32 46 28 Q48 24 44 22" stroke="#4a6a4a" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        {/* Head */}
        <ellipse cx="22" cy="24" rx="4" ry="3" fill="#5a7a5a" stroke="#2a3a2a" strokeWidth="0.6"/>
        <circle cx="20" cy="23" r="0.8" fill="#d4a020"/><circle cx="20" cy="23" r="0.4" fill="#1a1a1a"/>
        {/* Tiny horns */}
        <line x1="21" y1="21" x2="20" y2="18" stroke="#4a5a3a" strokeWidth="0.6" strokeLinecap="round"/>
        <line x1="24" y1="21" x2="25" y2="18" stroke="#4a5a3a" strokeWidth="0.6" strokeLinecap="round"/>
      </g>
    </svg>
  ):(
    <svg viewBox="0 0 120 40" width="120" height="40" className={className}
      style={{willChange:'transform',animation:'dragon-fly 10s linear forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Distant silhouette in sky */}
      <g opacity="0.4">
        <path d="M60 20 Q40 8 20 14 Q28 16 36 16" fill="#3a3a3a" stroke="#2a2a2a" strokeWidth="0.5"
          style={{animation:'dragon-wing 2s ease-in-out infinite',transformOrigin:'60px 20px'}}/>
        <path d="M60 20 Q80 8 100 14 Q92 16 84 16" fill="#3a3a3a" stroke="#2a2a2a" strokeWidth="0.5"
          style={{animation:'dragon-wing 2s ease-in-out infinite reverse',transformOrigin:'60px 20px'}}/>
        <ellipse cx="60" cy="20" rx="10" ry="5" fill="#3a3a3a"/>
        {/* Long neck + head */}
        <path d="M68 18 Q74 14 78 12" stroke="#3a3a3a" strokeWidth="2" fill="none"/>
        <ellipse cx="80" cy="11" rx="3" ry="2" fill="#3a3a3a"/>
        {/* Long tail */}
        <path d="M50 22 Q40 26 34 24 Q30 22 28 24" stroke="#3a3a3a" strokeWidth="1.5" fill="none"/>
      </g>
    </svg>
  );
}
