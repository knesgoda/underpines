import React from 'react';
const id='hippo-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes hippo-peek{0%{transform:translateX(40%) translateY(5%);opacity:0}15%{opacity:1}25%{transform:translateX(40%) translateY(0)}60%{transform:translateX(40%) translateY(0)}80%{transform:translateX(40%) translateY(5%);opacity:1}100%{transform:translateX(40%) translateY(8%);opacity:0}}
@keyframes hippo-yawn{0%{transform:translateX(40%) translateY(3%);opacity:0}10%{opacity:1}20%{transform:translateX(40%) translateY(0)}35%,55%{transform:translateX(40%) translateY(0) scaleY(1.15)}60%{transform:translateX(40%) translateY(0) scaleY(1)}80%{transform:translateX(40%) translateY(5%);opacity:1}100%{opacity:0}}
`;document.head.appendChild(s);}
export default function Hippo({variant=0,direction='ltr',className=''}){
  const anims=['hippo-peek 10s ease-in-out forwards','hippo-yawn 12s ease-in-out forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 70 40" width="70" height="40" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Water line */}
      <path d="M0 24 Q17 22 35 24 Q52 26 70 24" stroke="#6a9ab0" strokeWidth="0.5" fill="none" opacity="0.4"/>
      {/* Head — just eyes and ears above water */}
      <ellipse cx="35" cy="24" rx="14" ry="6" fill="#7a6a5a" stroke="#4a3a2a" strokeWidth="0.8"/>
      {/* Eyes — protruding */}
      <circle cx="28" cy="20" r="2.5" fill="#7a6a5a" stroke="#4a3a2a" strokeWidth="0.6"/>
      <circle cx="42" cy="20" r="2.5" fill="#7a6a5a" stroke="#4a3a2a" strokeWidth="0.6"/>
      <circle cx="28" cy="20" r="1.2" fill="#3a2a1a"/><circle cx="28.3" cy="19.6" r="0.3" fill="#fff"/>
      <circle cx="42" cy="20" r="1.2" fill="#3a2a1a"/><circle cx="42.3" cy="19.6" r="0.3" fill="#fff"/>
      {/* Nostrils */}
      <circle cx="32" cy="22" r="1" fill="#5a4a3a"/>
      <circle cx="38" cy="22" r="1" fill="#5a4a3a"/>
      {/* Small ears */}
      <ellipse cx="25" cy="18" rx="1.5" ry="2" fill="#7a6a5a" stroke="#4a3a2a" strokeWidth="0.4"/>
      <ellipse cx="45" cy="18" rx="1.5" ry="2" fill="#7a6a5a" stroke="#4a3a2a" strokeWidth="0.4"/>
      {/* Jaw for yawn variant */}
      {variant===1&&<ellipse cx="35" cy="30" rx="10" ry="5" fill="#8a6a5a" stroke="#4a3a2a" strokeWidth="0.6"/>}
    </svg>
  );
}
