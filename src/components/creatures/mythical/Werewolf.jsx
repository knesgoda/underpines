import React from 'react';
const id='werewolf-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes ww-dash{0%{transform:translateX(-5%);opacity:0}5%{opacity:0.6}25%{transform:translateX(30%)}50%{transform:translateX(60%);opacity:0.5}75%{transform:translateX(90%);opacity:0.2}100%{transform:translateX(110%);opacity:0}}
`;document.head.appendChild(s);}
export default function Werewolf({variant=0,direction='ltr',className='',moonPhase=0}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  const glowing=moonPhase>0.45;
  return(
    <svg viewBox="0 0 80 50" width="80" height="50" className={className}
      style={{willChange:'transform',animation:'ww-dash 2.5s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Dark powerful shape — low, fast */}
      <ellipse cx="40" cy="32" rx="18" ry="10" fill="#2a2a2a" opacity="0.6"/>
      <ellipse cx="56" cy="26" rx="8" ry="7" fill="#2a2a2a" opacity="0.6"/>
      {/* Pointed ears */}
      <path d="M54 20 Q52 14 56 16" fill="#2a2a2a" opacity="0.5"/>
      <path d="M60 18 Q60 12 64 14" fill="#2a2a2a" opacity="0.5"/>
      {/* Snout */}
      <path d="M62 26 L68 28 L62 30" fill="#2a2a2a" opacity="0.5"/>
      {/* Eyes — glow during full moon */}
      {glowing&&<>
        <circle cx="57" cy="24" r="1.2" fill="#d4c020" opacity="0.8"/>
        <circle cx="61" cy="23" r="1.2" fill="#d4c020" opacity="0.8"/>
      </>}
      {/* Legs in motion blur */}
      <rect x="28" y="38" width="3" height="8" rx="1" fill="#2a2a2a" opacity="0.4" transform="rotate(-15 29 38)"/>
      <rect x="44" y="38" width="3" height="8" rx="1" fill="#2a2a2a" opacity="0.4" transform="rotate(10 45 38)"/>
    </svg>
  );
}
