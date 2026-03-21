import React from 'react';
const id='jackalope-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes jlope-hop{0%{transform:translateX(0)}10%{transform:translateX(12%) translateY(-8%)}15%{transform:translateX(18%) translateY(0)}25%{transform:translateX(30%) translateY(-9%)}30%{transform:translateX(38%) translateY(0)}40%{transform:translateX(52%) translateY(-7%)}45%{transform:translateX(60%) translateY(0)}55%{transform:translateX(74%) translateY(-8%)}60%{transform:translateX(82%) translateY(0)}100%{transform:translateX(110%)}}
`;document.head.appendChild(s);}
export default function Jackalope({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 50 40" width="50" height="40" className={className}
      style={{willChange:'transform',animation:'jlope-hop 3s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body — rabbit shape */}
      <ellipse cx="22" cy="26" rx="9" ry="7" fill="#a08a6a" stroke="#5a4a3a" strokeWidth="0.8"/>
      <circle cx="30" cy="20" r="5" fill="#b09a7a" stroke="#5a4a3a" strokeWidth="0.8"/>
      {/* Ears */}
      <path d="M28 14 Q26 6 30 8 Q32 10 30 16" fill="#b09a7a" stroke="#5a4a3a" strokeWidth="0.5"/>
      <path d="M32 12 Q32 4 36 6 Q37 8 34 14" fill="#b09a7a" stroke="#5a4a3a" strokeWidth="0.5"/>
      {/* Antlers! */}
      <path d="M28 12 Q26 6 24 4 M26 8 Q24 6 22 6" stroke="#6a5030" strokeWidth="1" strokeLinecap="round" fill="none"/>
      <path d="M34 10 Q36 4 38 2 M36 6 Q38 4 40 4" stroke="#6a5030" strokeWidth="1" strokeLinecap="round" fill="none"/>
      {/* Eye */}
      <circle cx="32" cy="19" r="1.2" fill="#2a1a0a"/>
      {/* Tail */}
      <circle cx="13" cy="24" r="2.5" fill="#d4c8b0" stroke="#a09070" strokeWidth="0.4"/>
      {/* Legs */}
      <rect x="18" y="31" width="2" height="5" rx="1" fill="#9a8060" stroke="#5a4a3a" strokeWidth="0.4"/>
      <rect x="24" y="31" width="2" height="5" rx="1" fill="#9a8060" stroke="#5a4a3a" strokeWidth="0.4"/>
    </svg>
  );
}
