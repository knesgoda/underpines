import React from 'react';
const id='selkie-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes selkie-rest{0%{opacity:0}10%{opacity:1}70%{opacity:1}80%{opacity:0.5}85%{opacity:0}100%{opacity:0}}
`;document.head.appendChild(s);}
export default function Selkie({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  const isHuman=variant===2;
  return(
    <svg viewBox="0 0 60 35" width="60" height="35" className={className}
      style={{willChange:'transform',animation:'selkie-rest 12s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {!isHuman?<>
        {/* Seal form */}
        <ellipse cx="30" cy="24" rx="14" ry="7" fill="#5a5a5a" stroke="#3a3a3a" strokeWidth="0.8"/>
        <ellipse cx="42" cy="20" rx="6" ry="5" fill="#6a6a6a" stroke="#3a3a3a" strokeWidth="0.8"/>
        <circle cx="44" cy="18" r="1.2" fill="#2a2a2a"/><circle cx="44.3" cy="17.7" r="0.3" fill="#555"/>
        <ellipse cx="46" cy="20" rx="1" ry="0.6" fill="#2a2a2a"/>
        <path d="M16 24 Q12 20 14 18 Q16 18 18 22" fill="#5a5a5a" stroke="#3a3a3a" strokeWidth="0.5"/>
      </>:<>
        {/* Human silhouette — very rare */}
        <ellipse cx="30" cy="28" rx="8" ry="3" fill="#5a5a5a" opacity="0.3"/>
        <rect x="28" y="14" width="4" height="14" rx="1" fill="#3a3a3a" opacity="0.25"/>
        <circle cx="30" cy="12" r="3" fill="#3a3a3a" opacity="0.25"/>
        <path d="M26 22 Q24 20 22 22" stroke="#3a3a3a" strokeWidth="0.5" fill="none" opacity="0.2"/>
      </>}
    </svg>
  );
}
