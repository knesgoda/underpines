import React from 'react';
const id='fennec-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes fennec-dash{0%{transform:translateX(-5%)}100%{transform:translateX(110%)}}
@keyframes fennec-sit{0%{transform:translateX(35%)}20%,80%{transform:translateX(40%)}100%{transform:translateX(40%)}}
@keyframes fennec-ear-l{0%,100%{transform:rotateZ(0)}30%{transform:rotateZ(-8deg)}60%{transform:rotateZ(5deg)}}
@keyframes fennec-ear-r{0%,100%{transform:rotateZ(0)}40%{transform:rotateZ(10deg)}70%{transform:rotateZ(-6deg)}}
`;document.head.appendChild(s);}
export default function FennecFox({variant=0,direction='ltr',className=''}){
  const anims=['fennec-dash 2.5s ease-in-out forwards','fennec-sit 8s ease-in-out forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 50 40" width="50" height="40" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="25" cy="38" rx="8" ry="1.5" fill="rgba(0,0,0,0.08)"/>
      <path d="M10 30 Q6 28 8 26 Q10 24 12 28" fill="#e8d0a0" stroke="#8a7050" strokeWidth="0.6"/>
      <ellipse cx="22" cy="28" rx="10" ry="7" fill="#e8d0a0" stroke="#8a7050" strokeWidth="0.8"/>
      <ellipse cx="24" cy="30" rx="6" ry="4" fill="#f0e0c0"/>
      <circle cx="32" cy="24" r="5" fill="#ecd8a8" stroke="#8a7050" strokeWidth="0.8"/>
      <ellipse cx="36" cy="26" rx="2.5" ry="1.5" fill="#f0e0c0" stroke="#8a7050" strokeWidth="0.4"/>
      {/* ENORMOUS ears */}
      <path d="M28 18 Q26 4 30 6 Q33 8 31 20" fill="#ecd8a8" stroke="#8a7050" strokeWidth="0.6"
        style={{animation: variant===1?'fennec-ear-l 2s ease-in-out infinite':'none',transformOrigin:'30px 18px'}}/>
      <path d="M28 16 Q27 8 30 10" fill="#e8a888" stroke="none"/>
      <path d="M34 16 Q34 2 37 4 Q39 6 36 18" fill="#ecd8a8" stroke="#8a7050" strokeWidth="0.6"
        style={{animation: variant===1?'fennec-ear-r 2.3s ease-in-out infinite':'none',transformOrigin:'36px 16px'}}/>
      <path d="M35 14 Q35 6 37 8" fill="#e8a888" stroke="none"/>
      <circle cx="33" cy="22" r="1.2" fill="#2a1a0a"/><circle cx="33.3" cy="21.7" r="0.3" fill="#fff"/>
      <circle cx="37" cy="26" r="0.6" fill="#2a1a1a"/>
      <rect x="18" y="33" width="2" height="4" rx="1" fill="#c4a878" stroke="#8a7050" strokeWidth="0.4"/>
      <rect x="26" y="33" width="2" height="4" rx="1" fill="#c4a878" stroke="#8a7050" strokeWidth="0.4"/>
    </svg>
  );
}
