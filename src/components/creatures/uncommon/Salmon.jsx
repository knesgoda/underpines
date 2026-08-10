import React from 'react';
const id='salmon-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes salmon-leap{0%{transform:translateX(40%) translateY(20%) rotateZ(0);opacity:0}10%{opacity:1}20%{transform:translateX(45%) translateY(-30%) rotateZ(-30deg)}40%{transform:translateX(50%) translateY(-45%) rotateZ(-20deg)}60%{transform:translateX(55%) translateY(-30%) rotateZ(10deg)}80%{transform:translateX(58%) translateY(15%) rotateZ(30deg)}90%{opacity:1}100%{transform:translateX(60%) translateY(25%) rotateZ(40deg);opacity:0}}
`;document.head.appendChild(s);}
export default function Salmon({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 60 50" width="60" height="50" className={className}
      style={{willChange:'transform',animation:'salmon-leap 1.5s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="30" cy="25" rx="12" ry="5" fill="#c0887a" stroke="#6a4040" strokeWidth="0.8"/>
      <path d="M18 25 L12 21 L12 29Z" fill="#b07868" stroke="#6a4040" strokeWidth="0.5"/>
      <circle cx="40" cy="24" r="1" fill="#1a1a1a"/>
      <path d="M42 25 L45 24.5 L42 25.5" fill="#6a4040"/>
      <ellipse cx="30" cy="26" rx="8" ry="2.5" fill="#d4a898" opacity="0.6"/>
      {/* Dorsal fin */}
      <path d="M28 20 Q30 16 32 20" fill="#b07868" stroke="#6a4040" strokeWidth="0.4"/>
      {/* Splash dots */}
      <circle cx="34" cy="38" r="1" fill="#8ab8d0" opacity="0.5"/>
      <circle cx="28" cy="40" r="0.7" fill="#8ab8d0" opacity="0.4"/>
      <circle cx="38" cy="42" r="0.8" fill="#8ab8d0" opacity="0.3"/>
    </svg>
  );
}
