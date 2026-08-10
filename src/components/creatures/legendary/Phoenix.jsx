import React from 'react';
const id='phoenix-anims';
if(typeof document!=='undefined'&&!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=`
@keyframes phoenix-cross{0%{transform:translateX(-10%) translateY(15%);opacity:0}8%{opacity:0.8}50%{transform:translateX(50%) translateY(5%)}92%{opacity:0.7}100%{transform:translateX(110%) translateY(0%);opacity:0}}
@keyframes phoenix-wing{0%,100%{transform:rotateX(0)}50%{transform:rotateX(8deg)}}
@keyframes ember-trail{0%{opacity:0.7;transform:scale(1)}100%{opacity:0;transform:scale(0.3) translateX(-20px)}}
`;document.head.appendChild(s);}
export default function Phoenix({variant=0,direction='ltr',className=''}){
  const flip=direction==='rtl'?'scaleX(-1)':'';
  return(
    <svg viewBox="0 0 100 40" width="100" height="40" className={className}
      style={{willChange:'transform',animation:'phoenix-cross 3s ease-in-out forwards',transform:flip}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Wings — golden fire */}
      <path d="M50 20 Q35 10 18 14" fill="#d48020" stroke="#a06010" strokeWidth="0.5" opacity="0.7"
        style={{animation:'phoenix-wing 0.8s ease-in-out infinite',transformOrigin:'50px 20px'}}/>
      <path d="M50 20 Q65 10 82 14" fill="#d48020" stroke="#a06010" strokeWidth="0.5" opacity="0.7"
        style={{animation:'phoenix-wing 0.8s ease-in-out infinite reverse',transformOrigin:'50px 20px'}}/>
      {/* Inner wing glow */}
      <path d="M50 20 Q38 14 24 16" fill="#e8a030" opacity="0.4"/>
      <path d="M50 20 Q62 14 76 16" fill="#e8a030" opacity="0.4"/>
      {/* Body */}
      <ellipse cx="50" cy="20" rx="6" ry="4" fill="#e8a030" stroke="#a06010" strokeWidth="0.5"/>
      {/* Head */}
      <circle cx="56" cy="18" r="2.5" fill="#f0b840" stroke="#a06010" strokeWidth="0.4"/>
      <circle cx="57" cy="17" r="0.6" fill="#1a1a0a"/>
      <path d="M58 18 L61 17.5 L58 19" fill="#d44020"/>
      {/* Fire trail — embers behind */}
      {[0,1,2,3,4,5].map(i=>(
        <circle key={i} cx={44-i*5} cy={22+i*0.5} r={1.5-i*0.15} fill={i<2?'#e8a030':'#d46020'} opacity={0.5-i*0.08}
          style={{animation:`ember-trail ${1+i*0.3}s ease-out infinite ${i*0.15}s`}}/>
      ))}
      {/* Tail plume */}
      <path d="M44 22 Q36 26 30 24 Q26 22 22 24" stroke="#d46020" strokeWidth="1.2" fill="none" opacity="0.5"/>
      <path d="M44 22 Q38 28 32 28 Q28 26 24 28" stroke="#e88030" strokeWidth="0.8" fill="none" opacity="0.3"/>
    </svg>
  );
}
