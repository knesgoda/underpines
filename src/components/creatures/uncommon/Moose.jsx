import React from 'react';
const id='moose-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes moose-stand{0%{transform:translateX(30%);opacity:0}8%{opacity:1}15%,65%{transform:translateX(35%);opacity:1}80%{transform:translateX(100%);opacity:1}95%{opacity:0}100%{opacity:0}}
@keyframes moose-wade{0%{transform:translateX(0) translateY(0)}50%{transform:translateX(50%) translateY(4%)}100%{transform:translateX(100%) translateY(0)}}
`;document.head.appendChild(s);}
export default function Moose({variant=0,direction='ltr',className=''}){
  const anims=['moose-stand 12s ease-in-out forwards','moose-wade 14s ease-in-out forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 120 90" width="120" height="90" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="86" rx="22" ry="3" fill="rgba(0,0,0,0.1)"/>
      <rect x="42" y="64" width="5" height="20" rx="2" fill="#4a3a2a" stroke="#2a1a0a" strokeWidth="0.8"/>
      <rect x="48" y="65" width="5" height="19" rx="2" fill="#483a28" stroke="#2a1a0a" strokeWidth="0.8"/>
      <rect x="68" y="64" width="5" height="20" rx="2" fill="#4a3a2a" stroke="#2a1a0a" strokeWidth="0.8"/>
      <rect x="74" y="65" width="5" height="19" rx="2" fill="#483a28" stroke="#2a1a0a" strokeWidth="0.8"/>
      {/* Massive body */}
      <ellipse cx="60" cy="52" rx="26" ry="18" fill="#5a4a3a" stroke="#2a1a0a" strokeWidth="1.4"/>
      {/* Shoulder hump */}
      <ellipse cx="52" cy="40" rx="10" ry="8" fill="#5a4a3a"/>
      {/* Neck */}
      <path d="M74 44 Q80 34 84 24" stroke="#2a1a0a" strokeWidth="1.4" fill="#5a4a3a"/>
      <path d="M78 42 Q84 32 86 22" stroke="#2a1a0a" strokeWidth="1.4" fill="#5a4a3a"/>
      {/* Head */}
      <ellipse cx="86" cy="20" rx="8" ry="7" fill="#6a5a4a" stroke="#2a1a0a" strokeWidth="1.4"/>
      <ellipse cx="94" cy="24" rx="6" ry="3.5" fill="#7a6a5a" stroke="#2a1a0a" strokeWidth="0.8"/>
      {/* Palmate antlers */}
      <path d="M80 12 Q74 0 68 -2 Q66 -4 70 -6 Q76 -4 78 0 Q76 -2 72 -4" stroke="#5a4a30" strokeWidth="2" fill="#6a5a3a" opacity="0.8"/>
      <path d="M90 10 Q96 -2 102 -4 Q104 -6 100 -8 Q94 -6 92 -2 Q94 -4 98 -6" stroke="#5a4a30" strokeWidth="2" fill="#6a5a3a" opacity="0.8"/>
      {/* Bell (dewlap) */}
      <path d="M84 26 Q82 32 84 34" stroke="#4a3a2a" strokeWidth="1.5" fill="#5a4a3a"/>
      <circle cx="88" cy="18" r="1.8" fill="#2a1a0a"/><circle cx="88.5" cy="17.5" r="0.5" fill="#fff"/>
      <ellipse cx="98" cy="24" rx="1.5" ry="1" fill="#2a1a1a"/>
    </svg>
  );
}
