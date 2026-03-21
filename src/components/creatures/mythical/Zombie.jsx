import React from 'react';
const id='zombie-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes zombie-shamble{0%{transform:translateX(0) rotateZ(0);opacity:0}5%{opacity:0.3}15%{transform:translateX(6%) rotateZ(2deg)}30%{transform:translateX(14%) rotateZ(-1deg)}45%{transform:translateX(22%) rotateZ(2deg)}60%{transform:translateX(30%) rotateZ(-1deg)}80%{transform:translateX(40%);opacity:0.25}100%{transform:translateX(50%);opacity:0}}
`;document.head.appendChild(s);}
export default function Zombie({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 35 60" width="35" height="60" className={className}
      style={{willChange:'transform',animation:'zombie-shamble 14s linear forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Distant silhouette — slightly wrong proportions */}
      <circle cx="17" cy="10" r="4.5" fill="#3a3a3a" opacity="0.25"/>
      <path d="M13 14 Q12 35 11 50 L23 50 Q22 35 21 14" fill="#3a3a3a" opacity="0.2"/>
      {/* Arms — one extended */}
      <path d="M13 22 Q8 20 6 18" stroke="#3a3a3a" strokeWidth="1" opacity="0.2" strokeLinecap="round"/>
      <path d="M21 24 Q24 22 26 24" stroke="#3a3a3a" strokeWidth="1" opacity="0.15" strokeLinecap="round"/>
    </svg>
  );
}
