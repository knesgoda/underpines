import React from 'react';

const id = 'fireflies-anims';
if (typeof document !== 'undefined' && !document.getElementById(id)) {
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `
@keyframes firefly-pulse-1 { 0%,100%{opacity:0.3}50%{opacity:0.9} }
@keyframes firefly-pulse-2 { 0%,100%{opacity:0.4}60%{opacity:0.85} }
@keyframes firefly-pulse-3 { 0%,100%{opacity:0.25}45%{opacity:0.8} }
@keyframes firefly-drift {
  0%{transform:translate(0,0)}
  25%{transform:translate(3px,-4px)}
  50%{transform:translate(-2px,-2px)}
  75%{transform:translate(4px,2px)}
  100%{transform:translate(0,0)}
}
  `;
  document.head.appendChild(s);
}

const dots = [
  { cx: 12, cy: 15, dur: '2.8s', driftDur: '6s' },
  { cx: 28, cy: 8, dur: '3.2s', driftDur: '7s' },
  { cx: 45, cy: 20, dur: '2.5s', driftDur: '5.5s' },
  { cx: 60, cy: 12, dur: '3.8s', driftDur: '8s' },
  { cx: 72, cy: 22, dur: '2.9s', driftDur: '6.5s' },
  { cx: 20, cy: 28, dur: '3.4s', driftDur: '7.5s' },
  { cx: 50, cy: 6, dur: '3.0s', driftDur: '5s' },
  { cx: 35, cy: 30, dur: '2.6s', driftDur: '6.2s' },
  { cx: 65, cy: 32, dur: '3.6s', driftDur: '7.8s' },
  { cx: 8, cy: 5, dur: '3.1s', driftDur: '6.8s' },
  { cx: 55, cy: 28, dur: '2.7s', driftDur: '5.8s' },
  { cx: 78, cy: 10, dur: '3.3s', driftDur: '7.2s' },
];

export default function Fireflies({ className = '' }) {
  return (
    <svg viewBox="0 0 80 40" width="80" height="40" className={className}
      style={{ willChange: 'transform' }}
      fill="none" xmlns="http://www.w3.org/2000/svg">
      {dots.map((d, i) => {
        const pulseAnim = `firefly-pulse-${(i % 3) + 1} ${d.dur} ease-in-out infinite`;
        const driftAnim = `firefly-drift ${d.driftDur} ease-in-out infinite`;
        return (
          <g key={i} style={{ animation: driftAnim }}>
            {/* Glow */}
            <circle cx={d.cx} cy={d.cy} r="3" fill="#c4d43a" opacity="0.15"
              style={{ animation: pulseAnim }} />
            {/* Core */}
            <circle cx={d.cx} cy={d.cy} r="1.2" fill="#c4d43a"
              style={{ animation: pulseAnim }} />
          </g>
        );
      })}
    </svg>
  );
}
