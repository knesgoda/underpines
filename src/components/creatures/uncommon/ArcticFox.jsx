import React from 'react';
const id='arcticfox-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes afox-trot{0%{transform:translateX(0)}100%{transform:translateX(100%)}}
@keyframes afox-pounce{0%{transform:translateX(20%)}40%{transform:translateX(40%)}50%{transform:translateX(42%) translateY(-20%) rotateZ(-10deg)}65%{transform:translateX(45%) translateY(5%) rotateZ(5deg)}75%{transform:translateX(45%) translateY(0) rotateZ(0)}100%{transform:translateX(100%)}}
`;document.head.appendChild(s);}
export default function ArcticFox({variant=0,direction='ltr',className='',season=''}){
  const anims=['afox-trot 4.5s ease-in-out forwards','afox-pounce 6s ease-in-out forwards'];
  const flip=direction==='rtl'?'scaleX(-1)':'';
  const isWinter=['yule','imbolc'].includes(season);
  const bodyColor=isWinter?'#e8e4e0':'#8a7a6a';
  const darkColor=isWinter?'#c8c4c0':'#5a4a3a';
  return(
    <svg viewBox="0 0 70 50" width="70" height="50" className={className}
      style={{willChange:'transform',animation:anims[variant%anims.length],transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="35" cy="47" rx="12" ry="2" fill="rgba(0,0,0,0.08)"/>
      <path d="M12 36 Q6 32 8 28 Q12 26 14 30 Q16 34 18 38" fill={bodyColor} stroke={darkColor} strokeWidth="0.8"/>
      <ellipse cx="32" cy="36" rx="14" ry="9" fill={bodyColor} stroke={darkColor} strokeWidth="1"/>
      <ellipse cx="34" cy="38" rx="8" ry="5" fill={isWinter?'#f0ece8':'#b0a090'}/>
      <ellipse cx="48" cy="30" rx="7" ry="6" fill={bodyColor} stroke={darkColor} strokeWidth="1"/>
      <ellipse cx="54" cy="32" rx="3.5" ry="2" fill={isWinter?'#f0ece8':'#b0a090'} stroke={darkColor} strokeWidth="0.5"/>
      <path d="M44 24 Q42 16 46 18 Q48 20 46 26" fill={bodyColor} stroke={darkColor} strokeWidth="0.6"/>
      <path d="M50 22 Q49 14 53 16 Q55 18 52 24" fill={bodyColor} stroke={darkColor} strokeWidth="0.6"/>
      <circle cx="49" cy="28" r="1.2" fill="#1a1a0a"/><circle cx="49.3" cy="27.6" r="0.3" fill="#fff"/>
      <circle cx="56" cy="32" r="0.8" fill="#1a1a1a"/>
      <rect x="26" y="42" width="2.5" height="5" rx="1" fill={darkColor} strokeWidth="0.5"/>
      <rect x="36" y="42" width="2.5" height="5" rx="1" fill={darkColor} strokeWidth="0.5"/>
    </svg>
  );
}
