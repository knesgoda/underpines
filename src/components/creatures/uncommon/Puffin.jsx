import React from 'react';
const id='puffin-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes puffin-stand{0%,100%{transform:translateX(40%) rotateZ(0)}25%{transform:translateX(40%) rotateZ(5deg)}50%{transform:translateX(40%) rotateZ(-3deg)}75%{transform:translateX(40%) rotateZ(4deg)}}
@keyframes puffin-fly{0%{transform:translateX(30%) translateY(10%)}20%{transform:translateX(30%) translateY(-5%)}100%{transform:translateX(110%) translateY(-15%)}}
@keyframes puffin-wingflap{0%,100%{transform:rotateZ(0)}50%{transform:rotateZ(-20deg)}}
`;document.head.appendChild(s);}
export default function Puffin({variant=0,direction='ltr',className=''}){
  const anims=['puffin-stand 7s ease-in-out infinite','puffin-fly 4s ease-in-out forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 40 40" width="40" height="40" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <ellipse cx="20" cy="24" rx="7" ry="9" fill="#1a1a1a" stroke="#0a0a0a" strokeWidth="0.7"/>
      <ellipse cx="21" cy="28" rx="4" ry="6" fill="#f0ece4"/>
      {/* Head */}
      <circle cx="22" cy="14" r="5.5" fill="#1a1a1a" stroke="#0a0a0a" strokeWidth="0.7"/>
      <circle cx="22" cy="14" r="4" fill="#f0ece4"/>
      {/* Eye */}
      <circle cx="24" cy="13" r="1.2" fill="#1a1a1a"/><circle cx="22" cy="12" r="0.5" fill="#f0ece4"/>
      {/* Colorful beak */}
      <path d="M26 15 L34 14 L30 17 L26 17Z" fill="#e84020" stroke="#a03010" strokeWidth="0.4"/>
      <path d="M26 15 L30 14 L28 15" fill="#f0a020"/>
      <line x1="28" y1="14" x2="28" y2="17" stroke="#4a4a4a" strokeWidth="0.3"/>
      {/* Eye ring */}
      <path d="M23 11 Q25 10 26 12" stroke="#e84020" strokeWidth="0.6" fill="none"/>
      {/* Feet */}
      <path d="M18 33 L16 36 L20 36Z" fill="#e88040" stroke="#a06030" strokeWidth="0.3"/>
      <path d="M22 33 L20 36 L24 36Z" fill="#e88040" stroke="#a06030" strokeWidth="0.3"/>
      {/* Wing (variant 1 flapping) */}
      {variant===1&&<path d="M14 22 Q8 16 10 20" fill="#2a2a2a" stroke="#0a0a0a" strokeWidth="0.5"
        style={{animation:'puffin-wingflap 0.2s linear infinite',transformOrigin:'14px 22px'}}/>}
    </svg>
  );
}
