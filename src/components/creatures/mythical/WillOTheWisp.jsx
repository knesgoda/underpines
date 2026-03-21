import React from 'react';
const id='wisp-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes wisp-drift{0%{transform:translate(15%,70%);opacity:0}10%{opacity:0.7}20%{transform:translate(25%,65%)}30%{transform:translate(20%,55%)}40%{transform:translate(35%,60%)}50%{transform:translate(30%,50%)}60%{transform:translate(45%,55%)}70%{transform:translate(40%,45%)}80%{transform:translate(55%,50%);opacity:0.5}90%{transform:translate(60%,40%);opacity:0.2}100%{transform:translate(65%,35%);opacity:0}}
@keyframes wisp-pulse{0%,100%{opacity:0.4;transform:scale(1)}50%{opacity:0.9;transform:scale(1.3)}}
`;document.head.appendChild(s);}
export default function WillOTheWisp({variant=0,direction='ltr',className=''}){
  return(
    <svg viewBox="0 0 80 50" width="80" height="50" className={className}
      style={{willChange:'transform',animation:'wisp-drift 8s ease-in-out forwards'}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer glow */}
      <circle cx="40" cy="25" r="6" fill="#a0d0a0" opacity="0.1" style={{animation:'wisp-pulse 2s ease-in-out infinite'}}/>
      <circle cx="40" cy="25" r="3.5" fill="#a0d0a0" opacity="0.2" style={{animation:'wisp-pulse 1.5s ease-in-out infinite 0.3s'}}/>
      {/* Core */}
      <circle cx="40" cy="25" r="2" fill="#a0d0a0" style={{animation:'wisp-pulse 1s ease-in-out infinite'}}/>
      {/* Trailing wisps */}
      <circle cx="36" cy="28" r="1.2" fill="#a0d0a0" opacity="0.15"/>
      <circle cx="33" cy="30" r="0.8" fill="#a0d0a0" opacity="0.08"/>
    </svg>
  );
}
