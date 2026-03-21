/**
 * DirectGazeWave — Memorial companion animation for bears.
 *
 * The most important animation in the entire system.
 * ~18 seconds: amble in → sit up → look at viewer → wave → drop → amble out.
 */
import React, { useState, useEffect } from 'react';

const id = 'comp-bear-gaze';
if (typeof document !== 'undefined' && !document.getElementById(id)) {
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `
@keyframes bear-amble-in{
  0%{transform:translateX(-10%);opacity:0}
  3%{opacity:1}
  100%{transform:translateX(58%)}
}
@keyframes bear-sit-up{
  0%{transform:translateX(58%) scaleY(1) translateY(0)}
  50%{transform:translateX(58%) scaleY(0.92) translateY(2%)}
  100%{transform:translateX(58%) scaleY(0.85) translateY(-8%)}
}
@keyframes bear-gaze-hold{
  0%,100%{transform:translateX(58%) scaleY(0.85) translateY(-8%)}
}
@keyframes bear-paw-raise{
  0%{transform:rotate(0) translateY(0)}
  30%{transform:rotate(-25deg) translateY(-6px)}
  50%{transform:rotate(-28deg) translateY(-7px)}
  70%{transform:rotate(-25deg) translateY(-6px)}
  100%{transform:rotate(0) translateY(0)}
}
@keyframes bear-sit-down{
  0%{transform:translateX(58%) scaleY(0.85) translateY(-8%)}
  100%{transform:translateX(58%) scaleY(1) translateY(0)}
}
@keyframes bear-amble-out{
  0%{transform:translateX(58%) scaleX(-1)}
  100%{transform:translateX(-10%) scaleX(-1);opacity:0}
}
@keyframes bear-breathe{
  0%,100%{transform:scaleY(1)}
  50%{transform:scaleY(1.015)}
}
@keyframes bear-weight-shift{
  0%{transform:translateX(0) rotate(0)}
  25%{transform:translateX(1px) rotate(0.5deg)}
  75%{transform:translateX(-1px) rotate(-0.5deg)}
  100%{transform:translateX(0) rotate(0)}
}
`;
  document.head.appendChild(s);
}

// Phase durations in ms
const AMBLE_IN    = 6000;
const SIT_UP      = 2000;
const GAZE_HOLD   = 3000;
const WAVE         = 4000; // raise 2s + hold 2s
const SIT_DOWN    = 2000;
const AMBLE_OUT   = 4000;

const PHASES = ['amble-in','sit-up','gaze','wave','sit-down','amble-out','done'];
const DURATIONS = [AMBLE_IN, SIT_UP, GAZE_HOLD, WAVE, SIT_DOWN, AMBLE_OUT, 0];

export default function DirectGazeWave({ direction = 'ltr', className = '', onComplete }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (phase >= PHASES.length - 1) {
      onComplete?.();
      return;
    }
    const t = setTimeout(() => setPhase(p => p + 1), DURATIONS[phase]);
    return () => clearTimeout(t);
  }, [phase, onComplete]);

  const phaseName = PHASES[phase];
  if (phaseName === 'done') return null;

  const flip = direction === 'rtl' ? 'scaleX(-1)' : '';

  // Build wrapper animation
  let wrapperAnim = 'none';
  if (phaseName === 'amble-in')  wrapperAnim = `bear-amble-in ${AMBLE_IN}ms ease-out forwards`;
  if (phaseName === 'sit-up')    wrapperAnim = `bear-sit-up ${SIT_UP}ms ease-in-out forwards`;
  if (phaseName === 'gaze')      wrapperAnim = `bear-gaze-hold ${GAZE_HOLD}ms linear forwards`;
  if (phaseName === 'wave')      wrapperAnim = `bear-gaze-hold ${WAVE}ms linear forwards`;
  if (phaseName === 'sit-down')  wrapperAnim = `bear-sit-down ${SIT_DOWN}ms ease-in-out forwards`;
  if (phaseName === 'amble-out') wrapperAnim = `bear-amble-out ${AMBLE_OUT}ms ease-in forwards`;

  const isStanding = ['sit-up','gaze','wave','sit-down'].includes(phaseName);
  const isWaving = phaseName === 'wave';
  const isWalking = phaseName === 'amble-in' || phaseName === 'amble-out';

  return (
    <div className={className} style={{
      position: 'absolute', bottom: '18%', left: 0, width: '100%', height: 'auto',
      pointerEvents: 'none', zIndex: 9,
    }}>
      <div style={{
        display: 'inline-block',
        animation: wrapperAnim,
        willChange: 'transform',
        transform: flip,
      }}>
        <div style={{
          animation: isWalking ? 'bear-weight-shift 0.8s ease-in-out infinite' : 'bear-breathe 3s ease-in-out infinite',
        }}>
          <svg viewBox="0 0 90 80" width="90" height="80" fill="none" xmlns="http://www.w3.org/2000/svg">
            {isStanding ? (
              /* ── Sitting / standing pose ── */
              <>
                {/* Body — seated, upright */}
                <ellipse cx="45" cy="58" rx="20" ry="14" fill="#5a4030" stroke="#3a2a1a" strokeWidth="1"/>
                <ellipse cx="45" cy="42" rx="16" ry="18" fill="#5a4030" stroke="#3a2a1a" strokeWidth="0.8"/>
                {/* Belly lighter */}
                <ellipse cx="45" cy="48" rx="10" ry="12" fill="#6a5040" opacity="0.6"/>
                {/* Head — facing FORWARD (at viewer) */}
                <circle cx="45" cy="22" r="12" fill="#5a4030" stroke="#3a2a1a" strokeWidth="0.8"/>
                {/* Ears */}
                <circle cx="36" cy="13" r="4" fill="#5a4030" stroke="#3a2a1a" strokeWidth="0.6"/>
                <circle cx="54" cy="13" r="4" fill="#5a4030" stroke="#3a2a1a" strokeWidth="0.6"/>
                <circle cx="36" cy="13" r="2.5" fill="#6a5040"/>
                <circle cx="54" cy="13" r="2.5" fill="#6a5040"/>
                {/* Muzzle */}
                <ellipse cx="45" cy="26" rx="5" ry="3.5" fill="#6a5040"/>
                <ellipse cx="45" cy="25" rx="2.5" ry="1.5" fill="#3a2a1a"/>
                {/* Eyes — warm, calm, LOOKING AT YOU */}
                <circle cx="40" cy="20" r="2.2" fill="#2a1a0a"/>
                <circle cx="50" cy="20" r="2.2" fill="#2a1a0a"/>
                {/* Eye highlights — life, warmth */}
                <circle cx="41" cy="19" r="0.7" fill="#f0e8d8" opacity="0.7"/>
                <circle cx="51" cy="19" r="0.7" fill="#f0e8d8" opacity="0.7"/>
                {/* Subtle smile line */}
                <path d="M42 28 Q45 30 48 28" stroke="#4a3020" strokeWidth="0.5" fill="none"/>
                {/* Left paw (wave arm) */}
                <g style={{
                  animation: isWaving ? `bear-paw-raise ${WAVE}ms ease-in-out forwards` : 'none',
                  transformOrigin: '32px 38px',
                }}>
                  <path d="M30 38 Q24 44 22 50" stroke="#5a4030" strokeWidth="5" strokeLinecap="round"/>
                  <ellipse cx="21" cy="51" rx="3" ry="2.5" fill="#5a4030" stroke="#3a2a1a" strokeWidth="0.5"/>
                  {/* Paw pads */}
                  <circle cx="20" cy="50" r="0.8" fill="#3a2a1a" opacity="0.4"/>
                  <circle cx="22" cy="50" r="0.8" fill="#3a2a1a" opacity="0.4"/>
                  <circle cx="21" cy="52" r="0.6" fill="#3a2a1a" opacity="0.4"/>
                </g>
                {/* Right paw (resting) */}
                <path d="M60 38 Q66 44 68 50" stroke="#5a4030" strokeWidth="5" strokeLinecap="round"/>
                <ellipse cx="69" cy="51" rx="3" ry="2.5" fill="#5a4030" stroke="#3a2a1a" strokeWidth="0.5"/>
                {/* Hind legs */}
                <ellipse cx="34" cy="68" rx="6" ry="4" fill="#5a4030" stroke="#3a2a1a" strokeWidth="0.5"/>
                <ellipse cx="56" cy="68" rx="6" ry="4" fill="#5a4030" stroke="#3a2a1a" strokeWidth="0.5"/>
              </>
            ) : (
              /* ── Walking pose (all fours) ── */
              <>
                {/* Body */}
                <ellipse cx="45" cy="40" rx="24" ry="14" fill="#5a4030" stroke="#3a2a1a" strokeWidth="1"/>
                {/* Shoulder hump */}
                <ellipse cx="55" cy="32" rx="10" ry="8" fill="#5a4030" stroke="#3a2a1a" strokeWidth="0.6"/>
                {/* Head */}
                <ellipse cx="72" cy="36" rx="10" ry="8" fill="#5a4030" stroke="#3a2a1a" strokeWidth="0.8"/>
                <ellipse cx="72" cy="36" rx="6" ry="5" fill="#6a5040" opacity="0.4"/>
                {/* Ears */}
                <circle cx="68" cy="29" r="3" fill="#5a4030" stroke="#3a2a1a" strokeWidth="0.5"/>
                <circle cx="76" cy="29" r="3" fill="#5a4030" stroke="#3a2a1a" strokeWidth="0.5"/>
                {/* Snout */}
                <ellipse cx="80" cy="38" rx="4" ry="3" fill="#6a5040"/>
                <ellipse cx="82" cy="37" rx="1.5" ry="1" fill="#3a2a1a"/>
                {/* Eye */}
                <circle cx="74" cy="34" r="1.5" fill="#2a1a0a"/>
                <circle cx="74.5" cy="33.5" r="0.5" fill="#f0e8d8" opacity="0.5"/>
                {/* Legs with weight-shift suggestion */}
                <rect x="30" y="50" width="5" height="16" rx="2.5" fill="#5a4030" stroke="#3a2a1a" strokeWidth="0.5"/>
                <rect x="38" y="51" width="5" height="15" rx="2.5" fill="#4a3525" stroke="#3a2a1a" strokeWidth="0.5"/>
                <rect x="52" y="50" width="5" height="16" rx="2.5" fill="#5a4030" stroke="#3a2a1a" strokeWidth="0.5"/>
                <rect x="60" y="51" width="5" height="15" rx="2.5" fill="#4a3525" stroke="#3a2a1a" strokeWidth="0.5"/>
                {/* Paws */}
                <ellipse cx="32" cy="67" rx="3.5" ry="2" fill="#5a4030"/>
                <ellipse cx="40" cy="67" rx="3.5" ry="2" fill="#4a3525"/>
                <ellipse cx="54" cy="67" rx="3.5" ry="2" fill="#5a4030"/>
                <ellipse cx="62" cy="67" rx="3.5" ry="2" fill="#4a3525"/>
                {/* Tail stub */}
                <ellipse cx="20" cy="38" rx="3" ry="2.5" fill="#5a4030"/>
              </>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
