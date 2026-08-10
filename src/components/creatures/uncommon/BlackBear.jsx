import React from 'react';
const id='blackbear-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes bbear-walk{0%{transform:translateX(0) rotateZ(0)}25%{transform:translateX(22%) rotateZ(1deg)}50%{transform:translateX(48%) rotateZ(-1deg)}100%{transform:translateX(100%)}}
@keyframes bbear-climb{0%{transform:translateX(40%) translateY(0)}30%{transform:translateX(42%) translateY(0)}50%{transform:translateX(42%) translateY(-20%) rotateZ(-10deg)}80%{transform:translateX(42%) translateY(-25%) rotateZ(-15deg)}100%{transform:translateX(42%) translateY(-25%) rotateZ(-15deg) scale(0.9)}}
`;document.head.appendChild(s);}
export default function BlackBear({variant=0,direction='ltr',className=''}){
  const anims=['bbear-walk 9s ease-in-out forwards','bbear-climb 8s ease-in-out forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 90 70" width="90" height="70" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="45" cy="66" rx="16" ry="2.5" fill="rgba(0,0,0,0.1)"/>
      <rect x="30" y="54" width="4.5" height="12" rx="2" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="0.7"/>
      <rect x="36" y="55" width="4.5" height="11" rx="2" fill="#282828" stroke="#1a1a1a" strokeWidth="0.7"/>
      <rect x="52" y="54" width="4.5" height="12" rx="2" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="0.7"/>
      <rect x="58" y="55" width="4.5" height="11" rx="2" fill="#282828" stroke="#1a1a1a" strokeWidth="0.7"/>
      <ellipse cx="45" cy="44" rx="20" ry="14" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1.2"/>
      <ellipse cx="64" cy="38" rx="8" ry="7" fill="#3a3a3a" stroke="#1a1a1a" strokeWidth="1.2"/>
      <ellipse cx="70" cy="40" rx="4" ry="2.5" fill="#5a4a3a" stroke="#1a1a1a" strokeWidth="0.6"/>
      <circle cx="60" cy="32" r="2.5" fill="#3a3a3a" stroke="#1a1a1a" strokeWidth="0.5"/>
      <circle cx="66" cy="32" r="2.5" fill="#3a3a3a" stroke="#1a1a1a" strokeWidth="0.5"/>
      <circle cx="64" cy="36" r="1.5" fill="#1a1a0a"/><circle cx="64.4" cy="35.5" r="0.4" fill="#444"/>
      <ellipse cx="73" cy="40" rx="1.2" ry="0.8" fill="#4a3a2a"/>
    </svg>
  );
}
