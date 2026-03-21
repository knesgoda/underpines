import React from 'react';
const id='fairy-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes fairy-zip{0%{transform:translate(10%,60%);opacity:0}5%{opacity:1}15%{transform:translate(30%,20%)}25%{transform:translate(50%,50%)}35%{transform:translate(40%,15%)}45%{transform:translate(70%,40%)}55%{transform:translate(60%,10%)}65%{transform:translate(85%,35%)}75%{transform:translate(75%,5%);opacity:0.8}85%{transform:translate(95%,25%);opacity:0.4}100%{transform:translate(100%,15%);opacity:0}}
@keyframes fairy-glow{0%,100%{opacity:0.4;r:2}50%{opacity:1;r:3}}
@keyframes fairy-wing{0%,100%{opacity:0.15}50%{opacity:0.35}}
`;document.head.appendChild(s);}
export default function Fairy({variant=0,direction='ltr',className=''}){
  return(
    <svg viewBox="0 0 60 40" width="60" height="40" className={className}
      style={{willChange:'transform',animation:'fairy-zip 2.5s ease-in-out forwards'}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Faint wing suggestion */}
      <ellipse cx="30" cy="20" rx="3" ry="4" fill="#c4f4c4" opacity="0.15"
        style={{animation:'fairy-wing 0.4s ease-in-out infinite'}} transform="rotate(-20 30 20)"/>
      <ellipse cx="34" cy="20" rx="3" ry="4" fill="#c4f4c4" opacity="0.15"
        style={{animation:'fairy-wing 0.4s ease-in-out infinite 0.1s'}} transform="rotate(20 34 20)"/>
      {/* Core glow */}
      <circle cx="32" cy="20" r="2" fill="#c4f4c4" style={{animation:'fairy-glow 0.6s ease-in-out infinite'}}/>
      {/* Trail dots */}
      <circle cx="28" cy="22" r="0.8" fill="#c4f4c4" opacity="0.2"/>
      <circle cx="24" cy="25" r="0.6" fill="#c4f4c4" opacity="0.12"/>
      <circle cx="20" cy="23" r="0.4" fill="#c4f4c4" opacity="0.06"/>
    </svg>
  );
}
