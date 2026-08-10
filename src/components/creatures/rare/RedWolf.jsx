import React from 'react';
const id='redwolf-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes rwolf-cautious{0%{transform:translateX(-5%);opacity:0}5%{opacity:1}20%{transform:translateX(20%)}25%{transform:translateX(20%) scaleX(-1)}30%{transform:translateX(20%) scaleX(1)}50%{transform:translateX(50%)}55%{transform:translateX(50%) scaleX(-1)}58%{transform:translateX(50%) scaleX(1)}90%{transform:translateX(95%);opacity:1}100%{transform:translateX(110%);opacity:0}}
`;document.head.appendChild(s);}
export default function RedWolf({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 90 65" width="90" height="65" className={className}
      style={{willChange:'transform',animation:'rwolf-cautious 9s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="45" cy="62" rx="14" ry="2" fill="rgba(0,0,0,0.08)"/>
      <path d="M18 44 Q10 40 12 36 Q16 34 18 40" fill="#a06040" stroke="#5a3020" strokeWidth="0.7"/>
      <rect x="30" y="50" width="2.8" height="11" rx="1.3" fill="#a06040" stroke="#5a3020" strokeWidth="0.5"/>
      <rect x="50" y="50" width="2.8" height="11" rx="1.3" fill="#a06040" stroke="#5a3020" strokeWidth="0.5"/>
      <ellipse cx="40" cy="42" rx="16" ry="10" fill="#b07050" stroke="#5a3020" strokeWidth="1"/>
      <ellipse cx="42" cy="46" rx="10" ry="5" fill="#c89070"/>
      <path d="M52 36 Q58 28 62 22" stroke="#5a3020" strokeWidth="1" fill="#b07050"/>
      <ellipse cx="62" cy="20" rx="6.5" ry="5.5" fill="#c08060" stroke="#5a3020" strokeWidth="1"/>
      <ellipse cx="68" cy="22" rx="4" ry="2.2" fill="#d09070" stroke="#5a3020" strokeWidth="0.6"/>
      <path d="M58 14 Q56 8 60 10" fill="#c08060" stroke="#5a3020" strokeWidth="0.5"/>
      <path d="M64 12 Q64 6 68 8" fill="#c08060" stroke="#5a3020" strokeWidth="0.5"/>
      <circle cx="63" cy="18" r="1.5" fill="#d4a020"/><circle cx="63" cy="18" r="0.7" fill="#1a1a1a"/>
      <ellipse cx="71" cy="22" rx="1" ry="0.7" fill="#2a1a1a"/>
    </svg>
  );
}
