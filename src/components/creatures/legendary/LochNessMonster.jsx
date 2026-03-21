import React from 'react';
const id='nessie-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes nessie-rise{0%{transform:translateX(30%) translateY(15%);opacity:0}15%{opacity:0.5}25%{transform:translateX(32%) translateY(0);opacity:0.6}70%{transform:translateX(35%) translateY(0);opacity:0.6}90%{transform:translateX(36%) translateY(12%);opacity:0.3}100%{opacity:0}}
`;document.head.appendChild(s);}
export default function LochNessMonster({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 120 50" width="120" height="50" className={className}
      style={{willChange:'transform',animation:'nessie-rise 8s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Water line */}
      <path d="M0 32 Q30 30 60 32 Q90 34 120 32" stroke="#6a9ab0" strokeWidth="0.5" fill="none" opacity="0.3"/>
      {/* Neck — long, curved */}
      <path d="M40 32 Q38 20 36 12 Q35 8 38 6" stroke="#4a5a4a" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5"/>
      {/* Head — small */}
      <ellipse cx="39" cy="5" rx="3" ry="2" fill="#4a5a4a" opacity="0.5"/>
      {/* Humps */}
      <path d="M55 30 Q58 24 62 30" fill="#4a5a4a" opacity="0.4" stroke="#3a4a3a" strokeWidth="0.6"/>
      <path d="M70 30 Q73 25 76 30" fill="#4a5a4a" opacity="0.35" stroke="#3a4a3a" strokeWidth="0.6"/>
      <path d="M84 31 Q86 27 89 31" fill="#4a5a4a" opacity="0.3" stroke="#3a4a3a" strokeWidth="0.5"/>
      {/* Ripples */}
      <ellipse cx="40" cy="34" rx="6" ry="1" fill="#6a9ab0" opacity="0.15"/>
      <ellipse cx="60" cy="33" rx="4" ry="0.8" fill="#6a9ab0" opacity="0.1"/>
    </svg>
  );
}
