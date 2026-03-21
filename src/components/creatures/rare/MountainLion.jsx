import React from 'react';
const id='mlion-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes mlion-watch{0%{transform:translateX(35%);opacity:0}10%{opacity:1}20%,70%{transform:translateX(40%)}80%{transform:translateX(40%);opacity:1}100%{transform:translateX(40%);opacity:0}}
@keyframes mlion-leap{0%{transform:translateX(20%) translateY(0)}30%{transform:translateX(35%) translateY(0)}40%{transform:translateX(45%) translateY(-25%)}50%{transform:translateX(55%) translateY(0)}60%{transform:translateX(65%) translateY(0)}70%{transform:translateX(75%) translateY(-20%)}80%{transform:translateX(85%) translateY(0)}100%{transform:translateX(110%)}}
`;document.head.appendChild(s);}
export default function MountainLion({variant=0,direction='ltr',className=''}){
  const anims=['mlion-watch 12s ease-in-out forwards','mlion-leap 8s ease-in-out forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 110 60" width="110" height="60" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="55" cy="57" rx="18" ry="2" fill="rgba(0,0,0,0.08)"/>
      {/* Long tail */}
      <path d="M14 38 Q4 30 8 24 Q12 22 14 28 Q16 34 22 40" fill="#b09060" stroke="#6a5030" strokeWidth="0.8"/>
      <rect x="36" y="46" width="3" height="11" rx="1.5" fill="#b09060" stroke="#6a5030" strokeWidth="0.5"/>
      <rect x="62" y="46" width="3" height="11" rx="1.5" fill="#b09060" stroke="#6a5030" strokeWidth="0.5"/>
      {/* Sleek body */}
      <ellipse cx="48" cy="40" rx="22" ry="10" fill="#c0a070" stroke="#6a5030" strokeWidth="1"/>
      <ellipse cx="50" cy="44" rx="14" ry="5" fill="#d4b888"/>
      {/* Head — small, round */}
      <circle cx="72" cy="34" r="6" fill="#c8a878" stroke="#6a5030" strokeWidth="1"/>
      <ellipse cx="77" cy="36" rx="3" ry="2" fill="#d4b888" stroke="#6a5030" strokeWidth="0.5"/>
      <path d="M68 28 Q66 24 70 26" fill="#c8a878" stroke="#6a5030" strokeWidth="0.5"/>
      <path d="M74 28 Q74 24 78 26" fill="#c8a878" stroke="#6a5030" strokeWidth="0.5"/>
      <circle cx="73" cy="32" r="1.5" fill="#6a8a2a"/><circle cx="73" cy="32" r="0.7" fill="#1a1a1a"/>
      <ellipse cx="79" cy="36" rx="1" ry="0.6" fill="#3a2a1a"/>
    </svg>
  );
}
