/**
 * MountainWest.jsx — Mountain West biome.
 * Rocky peaks, aspens with quake animation, Engelmann spruce, cairn.
 */

export function MountainWestBackground() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 500"
      preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
      <defs>
        <linearGradient id="mw-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0f4f8" />
          <stop offset="100%" stopColor="#7a7a8a" />
        </linearGradient>
      </defs>

      {/* Dramatic rocky peaks — even more sky than Nordic */}
      <path
        d="M0,300 L50,250 L90,200 L120,150 L145,180
           L180,110 L210,170 L250,130 L285,180 L320,100
           L360,160 L400,120 L440,175 L490,90
           L530,150 L570,125 L610,80 L650,140 L690,105
           L730,160 L770,130 L810,170 L850,110 L890,155
           L930,135 L970,175 L1000,200
           L1000,350 L0,350 Z"
        fill="#7a7a8a"
      />
      {/* Snow caps */}
      <path d="M115,155 L120,150 L130,165 L138,172 L125,170 Z" fill="url(#mw-snow)" opacity="0.75" />
      <path d="M175,115 L180,110 L190,135 L195,148 L182,142 Z" fill="url(#mw-snow)" opacity="0.7" />
      <path d="M315,105 L320,100 L330,128 L338,142 L322,138 Z" fill="url(#mw-snow)" opacity="0.75" />
      <path d="M485,95 L490,90 L500,118 L508,135 L492,130 Z" fill="url(#mw-snow)" opacity="0.7" />
      <path d="M605,85 L610,80 L620,110 L628,128 L612,122 Z" fill="url(#mw-snow)" opacity="0.75" />
      <path d="M845,115 L850,110 L860,138 L865,150 L852,145 Z" fill="url(#mw-snow)" opacity="0.7" />

      {/* Rocky talus slope */}
      <path
        d="M0,350 C100,340 250,348 400,335 C550,325 700,345 850,332 C930,328 1000,340 1000,340
           L1000,500 L0,500 Z"
        fill="#5a5a4a" opacity="0.7"
      />
    </svg>
  );
}

/* Aspen leaves have their own quake micro-animation */
const aspenQuakeStyle = `
@keyframes aspen-quake {
  0%, 100% { transform: rotate(-2deg) scale(1); }
  25% { transform: rotate(2deg) scale(0.97); }
  50% { transform: rotate(-1.5deg) scale(1.01); }
  75% { transform: rotate(1.8deg) scale(0.98); }
}
`;

function AspenTree({ x, baseY, height, delay }) {
  const trunkH = height;
  const canopyTop = baseY - trunkH;
  const barkMarks = [0.2, 0.35, 0.5, 0.65, 0.8];
  return (
    <g className="tree-sway"
      style={{ transformOrigin: `${x}% ${baseY}%`, animationDelay: `${delay}ms` }}>
      {/* White trunk */}
      <rect x={x - 0.4 + '%'} y={canopyTop + '%'}
        width="0.8%" height={trunkH + '%'}
        rx="0.15%" fill="#e8e0d0" opacity="0.9" />
      {barkMarks.map((f, i) => (
        <ellipse key={`ab-${i}`}
          cx={x + '%'} cy={canopyTop + trunkH * f + '%'}
          rx="0.3%" ry="0.15%"
          fill="#2a2a2a" opacity="0.25" />
      ))}
      {/* Trembling leaf clusters — each gets quake animation */}
      {[
        { dx: -1.5, dy: 2.5, r: 2 },
        { dx: 1.2, dy: 1.5, r: 1.8 },
        { dx: 0, dy: 3.5, r: 2.2 },
        { dx: -0.5, dy: 0.5, r: 1.5 },
      ].map((c, i) => (
        <ellipse key={`al-${i}`}
          cx={x + c.dx + '%'} cy={canopyTop + c.dy + '%'}
          rx={c.r + '%'} ry={c.r * 0.8 + '%'}
          fill="var(--biome-canopy, #2a5a3a)" opacity={0.65 + i * 0.05}
          style={{
            animation: `aspen-quake ${0.4 + i * 0.1}s ease-in-out infinite`,
            transformOrigin: `${x + c.dx}% ${canopyTop + c.dy}%`,
            animationDelay: `${i * 80}ms`,
          }}
        />
      ))}
    </g>
  );
}

function EngelmannSpruce({ x, baseY, height, delay }) {
  const trunkH = height;
  const canopyTop = baseY - trunkH;
  return (
    <g className="tree-sway"
      style={{ transformOrigin: `${x}% ${baseY}%`, animationDelay: `${delay}ms` }}>
      <rect x={x - 0.5 + '%'} y={canopyTop + trunkH * 0.35 + '%'}
        width="1%" height={trunkH * 0.65 + '%'}
        rx="0.2%" fill="var(--biome-trunk, #5a4030)" opacity="0.8" />
      <path
        d={`M${x} ${canopyTop}
            L${x - 3} ${canopyTop + trunkH * 0.35}
            L${x - 1} ${canopyTop + trunkH * 0.3}
            L${x - 3.5} ${canopyTop + trunkH * 0.5}
            L${x - 1.2} ${canopyTop + trunkH * 0.45}
            L${x - 3} ${canopyTop + trunkH * 0.6}
            L${x + 3} ${canopyTop + trunkH * 0.6}
            L${x + 1.2} ${canopyTop + trunkH * 0.45}
            L${x + 3.5} ${canopyTop + trunkH * 0.5}
            L${x + 1} ${canopyTop + trunkH * 0.3}
            L${x + 3} ${canopyTop + trunkH * 0.35}
            Z`}
        fill="#1a3a1a" opacity="0.82" />
    </g>
  );
}

export function MountainWestMidground() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100"
      preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
      <style>{aspenQuakeStyle}</style>

      {/* Rocky terrain */}
      {[15, 35, 60, 80].map((rx, i) => (
        <ellipse key={`rk-${i}`}
          cx={rx + '%'} cy={84 + (i % 2) * 0.5 + '%'}
          rx={2 + (i % 2) + '%'} ry="1%"
          fill="#6a6a5a" opacity="0.5" />
      ))}

      {/* Summer wildflower patches */}
      <g style={{ opacity: 'var(--seasonal-spring-detail-opacity, 0.3)' }}>
        {[22, 38, 55, 72].map((fx, i) => {
          const colors = ['#8a4aaa', '#d4843a', '#4a8ad4', '#d44a6a'];
          return (
            <circle key={`wf-${i}`}
              cx={fx + '%'} cy={83.5 + (i % 2) * 0.5 + '%'}
              r="0.35%" fill={colors[i]} opacity="0.6" />
          );
        })}
      </g>

      {/* Aspen trees */}
      <AspenTree x={10} baseY={83} height={35} delay={0} />
      <AspenTree x={30} baseY={82} height={38} delay={120} />
      <AspenTree x={50} baseY={83} height={33} delay={60} />
      <AspenTree x={72} baseY={82} height={36} delay={200} />

      {/* Engelmann spruce */}
      <EngelmannSpruce x={22} baseY={83} height={40} delay={90} />
      <EngelmannSpruce x={62} baseY={82} height={38} delay={170} />
    </svg>
  );
}

export function MountainWestForeground() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100"
      preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
      {/* Rocky ground */}
      <path
        d="M0,90 C8,89 16,90 24,89.2 C32,89.8 40,89 48,89.5
           C56,89.2 64,90 72,89 C80,89.5 88,89 96,89.5
           L100,89.5 L100,100 L0,100 Z"
        fill="var(--biome-fg-ground, #4a6a3a)" />

      {/* Sparse grass tufts */}
      {[8, 22, 40, 58, 75].map((gx, i) => (
        <path key={`gt-${i}`}
          d={`M${gx} ${90 + (i % 2) * 0.3} L${gx + 0.15} ${88.5 + (i % 3) * 0.3} L${gx + 0.3} ${90 + (i % 2) * 0.3}`}
          fill="#5a7a3a" opacity="0.5" />
      ))}

      {/* Trail marker cairn — stacked rocks, bottom-right */}
      <ellipse cx="86%" cy="93%" rx="2%" ry="0.8%" fill="#7a7a6a" opacity="0.7" />
      <ellipse cx="86%" cy="91.8%" rx="1.6%" ry="0.7%" fill="#8a8a7a" opacity="0.65" />
      <ellipse cx="86%" cy="90.8%" rx="1.2%" ry="0.6%" fill="#7a7a6a" opacity="0.6" />
      <ellipse cx="86%" cy="90%" rx="0.8%" ry="0.4%" fill="#9a9a8a" opacity="0.6" />
      <ellipse cx="86%" cy="89.4%" rx="0.5%" ry="0.3%" fill="#8a8a7a" opacity="0.55" />
    </svg>
  );
}
