import React, { useId } from 'react';

interface MoonPhaseProps {
  /** Phase value 0–1: 0=new, 0.5=full */
  phase: number;
  size?: number;
}

/**
 * SVG moon that renders the correct illumination for a given phase.
 *
 * Approach: draw a full bright disc, then overlay a shadow shape.
 * The shadow is an ellipse whose x-radius shrinks from full (new moon)
 * to zero (quarter) and grows again (full→new). The side that is
 * shadowed flips at full moon.
 */
const MoonPhase = React.memo(({ phase, size = 24 }: MoonPhaseProps) => {
  const id = useId();
  const r = size / 2;
  const isNew = phase < 0.03 || phase > 0.97;
  const isFull = phase > 0.47 && phase < 0.53;

  // Illumination fraction: 0 at new, 1 at full, 0 at new again
  const illumination = 1 - Math.abs(2 * phase - 1);

  // The terminator (shadow edge) is an ellipse with varying rx.
  // cos maps: new(0)→rx=r, quarter(0.25)→rx=0, full(0.5)→rx=r
  const terminatorRx = Math.abs(Math.cos(phase * 2 * Math.PI)) * r;

  // Before full (waxing): right side lit, shadow comes from left.
  // After full (waning): left side lit, shadow comes from right.
  const isWaxing = phase <= 0.5;

  // For waxing: shadow fills left side. We draw a half-circle on left + terminator ellipse.
  // Simplest correct approach: use a path combining an arc and ellipse.
  
  // Shadow path: semicircle on the shadow side, then elliptical terminator back.
  const shadowPath = buildShadowPath(r, terminatorRx, isWaxing, phase);

  const moonColor = '#FEF3C7';
  const rimColor = '#94a3b8';

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Moon phase"
    >
      <defs>
        <clipPath id={`moon-clip-${id}`}>
          <circle cx={r} cy={r} r={r} />
        </clipPath>
        {isFull && (
          <filter id={`moon-glow-${id}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {/* Glow for full moon */}
      {isFull && (
        <circle
          cx={r}
          cy={r}
          r={r + 4}
          fill="none"
          stroke={moonColor}
          strokeWidth="0.5"
          opacity="0.3"
          filter={`url(#moon-glow-${id})`}
        />
      )}

      {/* Moon disc */}
      <circle
        cx={r}
        cy={r}
        r={r}
        fill={isNew ? '#1e293b' : moonColor}
        clipPath={`url(#moon-clip-${id})`}
      />

      {/* Shadow overlay */}
      {!isNew && !isFull && (
        <path
          d={shadowPath}
          fill="rgba(15, 23, 42, 0.92)"
          clipPath={`url(#moon-clip-${id})`}
        />
      )}

      {/* New moon rim */}
      {isNew && (
        <circle
          cx={r}
          cy={r}
          r={r - 0.5}
          fill="none"
          stroke={rimColor}
          strokeWidth="0.5"
          opacity="0.4"
        />
      )}
    </svg>
  );
});

MoonPhase.displayName = 'MoonPhase';

function buildShadowPath(r: number, terminatorRx: number, isWaxing: boolean, phase: number): string {
  const cx = r;
  const cy = r;

  // We need a path that covers the dark portion of the moon.
  // Waxing (0→0.5): right side is lit, left side is dark
  //   Shadow = left semicircle arc + elliptical terminator arc back
  // Waning (0.5→1): left side is lit, right side is dark
  //   Shadow = right semicircle arc + elliptical terminator arc back

  if (isWaxing) {
    // Shadow on the LEFT side
    // Start at top, arc left semicircle to bottom, then ellipse terminator back to top
    const sweepOuter = 1; // large arc going left (counterclockwise in SVG)
    // For phases 0–0.25: terminator bulges RIGHT (into lit area = shadow is larger)
    // For phases 0.25–0.5: terminator bulges LEFT (shadow shrinks)
    const terminatorSweep = phase < 0.25 ? 1 : 0;
    
    return [
      `M ${cx} ${cy - r}`, // top
      `A ${r} ${r} 0 0 0 ${cx} ${cy + r}`, // left semicircle to bottom
      `A ${terminatorRx} ${r} 0 0 ${terminatorSweep} ${cx} ${cy - r}`, // ellipse back to top
    ].join(' ');
  } else {
    // Shadow on the RIGHT side
    const terminatorSweep = phase > 0.75 ? 0 : 1;

    return [
      `M ${cx} ${cy - r}`, // top
      `A ${r} ${r} 0 0 1 ${cx} ${cy + r}`, // right semicircle to bottom
      `A ${terminatorRx} ${r} 0 0 ${terminatorSweep} ${cx} ${cy - r}`, // ellipse back to top
    ].join(' ');
  }
}

export default MoonPhase;
