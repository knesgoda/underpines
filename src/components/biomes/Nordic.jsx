/**
 * Nordic.jsx — Nordic / Scandinavian biome scene components.
 *
 * Exports: NordicBackground (Layer 2), NordicMidground (Layer 5),
 *          NordicForeground (Layer 8)
 *
 * Dramatic mountains, fjord water, Scots pines, silver birches, big sky.
 */

// ─── NordicBackground (Layer 2) ───
export function NordicBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1000 500"
      preserveAspectRatio="none"
      style={{ pointerEvents: 'none' }}
    >
      <defs>
        <linearGradient id="nordic-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8f0f8" />
          <stop offset="100%" stopColor="#4a4a5a" />
        </linearGradient>
      </defs>

      {/* Steep dramatic mountains — dark granite with snow caps */}
      <path
        d="M0,280 L60,210 L100,180 L130,140 L155,165 L190,110
           L220,160 L260,135 L290,175 L330,120 L365,170
           L400,145 L440,190 L490,130 L530,170 L560,155
           L600,100 L640,150 L680,125 L720,165 L760,140
           L800,175 L840,130 L880,160 L920,145 L960,180 L1000,200
           L1000,310 L0,310 Z"
        fill="#4a4a5a"
      />

      {/* Snow on upper ridges */}
      <path
        d="M130,140 L140,155 L155,165 L160,158 L175,130 L190,110
           L205,140 L210,148 L190,155 Z"
        fill="url(#nordic-snow)" opacity="0.7"
      />
      <path
        d="M320,128 L330,120 L345,142 L350,150 L338,148 Z"
        fill="url(#nordic-snow)" opacity="0.65"
      />
      <path
        d="M585,108 L600,100 L615,120 L625,140 L610,135 Z"
        fill="url(#nordic-snow)" opacity="0.7"
      />
      <path
        d="M680,125 L695,140 L705,148 L690,145 L675,135 Z"
        fill="url(#nordic-snow)" opacity="0.6"
      />
      <path
        d="M830,138 L840,130 L855,148 L862,158 L845,152 Z"
        fill="url(#nordic-snow)" opacity="0.65"
      />

      {/* Fjord / lake water band */}
      <rect x="0" y="310" width="1000" height="55" fill="#3a4a5a" />

      {/* Mirror reflection of mountains — flipped, desaturated */}
      <g transform="translate(0,675) scale(1,-1)" opacity="0.15">
        <path
          d="M0,280 L60,210 L100,180 L130,140 L155,165 L190,110
             L220,160 L260,135 L290,175 L330,120 L365,170
             L400,145 L440,190 L490,130 L530,170 L560,155
             L600,100 L640,150 L680,125 L720,165 L760,140
             L800,175 L840,130 L880,160 L920,145 L960,180 L1000,200
             L1000,310 L0,310 Z"
          fill="#6a6a7a"
        />
      </g>

      {/* Subtle water shimmer lines */}
      <line x1="50" y1="325" x2="250" y2="325" stroke="#5a6a7a" strokeWidth="0.5" opacity="0.25" />
      <line x1="400" y1="335" x2="650" y2="335" stroke="#5a6a7a" strokeWidth="0.5" opacity="0.2" />
      <line x1="700" y1="320" x2="900" y2="320" stroke="#5a6a7a" strokeWidth="0.5" opacity="0.22" />

      {/* Forested shore below water */}
      <path
        d="M0,365 C80,358 180,362 280,355 C380,348 480,360 600,352
           C720,345 850,358 1000,350
           L1000,500 L0,500 Z"
        fill="#2a3a2a"
        opacity="0.85"
      />
    </svg>
  );
}


// ─── NordicMidground (Layer 5) ───

function ScotsPine({ x, baseY, height, delay }) {
  const trunkH = height;
  const trunkW = 1.0;
  const canopyTop = baseY - trunkH;

  return (
    <g
      className="tree-sway"
      style={{ transformOrigin: `${x}% ${baseY}%`, animationDelay: `${delay}ms` }}
    >
      {/* Tall straight trunk */}
      <rect
        x={x - trunkW / 2 + '%'} y={canopyTop + trunkH * 0.3 + '%'}
        width={trunkW + '%'} height={trunkH * 0.7 + '%'}
        rx="0.2%" fill="var(--biome-trunk, #5a4a3a)" opacity="0.85"
      />
      {/* Flat-topped / wind-swept canopy — sparse clusters */}
      <ellipse
        cx={x + '%'} cy={canopyTop + 4 + '%'}
        rx="3.5%" ry="2.8%"
        fill="var(--biome-canopy, #2a5a3a)" opacity="0.8"
      />
      <ellipse
        cx={x + 1 + '%'} cy={canopyTop + 2 + '%'}
        rx="3%" ry="2%"
        fill="var(--biome-canopy, #2a5a3a)" opacity="0.75"
      />
      {/* Wind-swept extension */}
      <ellipse
        cx={x + 2.5 + '%'} cy={canopyTop + 3.5 + '%'}
        rx="2%" ry="1.5%"
        fill="var(--biome-canopy, #2a5a3a)" opacity="0.6"
      />
      {/* Lower sparse branch */}
      <ellipse
        cx={x - 0.5 + '%'} cy={canopyTop + trunkH * 0.4 + '%'}
        rx="2%" ry="1.2%"
        fill="var(--biome-canopy, #2a5a3a)" opacity="0.5"
      />
    </g>
  );
}

function SilverBirch({ x, baseY, height, delay }) {
  const trunkH = height;
  const canopyTop = baseY - trunkH;
  const barkMarks = [0.15, 0.28, 0.4, 0.52, 0.63, 0.74, 0.85];

  return (
    <g
      className="tree-sway"
      style={{ transformOrigin: `${x}% ${baseY}%`, animationDelay: `${delay}ms` }}
    >
      {/* White trunk */}
      <rect
        x={x - 0.4 + '%'} y={canopyTop + '%'}
        width="0.8%" height={trunkH + '%'}
        rx="0.15%" fill="var(--biome-accent, #e8e0d0)" opacity="0.92"
      />
      {/* Horizontal dark bark lines */}
      {barkMarks.map((frac, i) => (
        <line
          key={`bark-${i}`}
          x1={x - 0.35 + '%'} y1={canopyTop + trunkH * frac + '%'}
          x2={x + 0.35 + '%'} y2={canopyTop + trunkH * frac + '%'}
          stroke="#3a3a3a" strokeWidth="0.15%" opacity="0.4"
        />
      ))}
      {/* Small, delicate leaf canopy */}
      <ellipse
        cx={x + '%'} cy={canopyTop + 3 + '%'}
        rx="2.8%" ry="3%"
        fill="var(--biome-canopy, #2a5a3a)" opacity="0.55"
      />
      <ellipse
        cx={x + 0.5 + '%'} cy={canopyTop + 1.5 + '%'}
        rx="2.2%" ry="2%"
        fill="var(--biome-canopy, #2a5a3a)" opacity="0.5"
      />
    </g>
  );
}

export function NordicMidground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ pointerEvents: 'none' }}
    >
      {/* Lichen-covered boulders */}
      <ellipse cx="22%" cy="84%" rx="3%" ry="1.8%" fill="#7a7a7a" opacity="0.75" />
      <ellipse cx="23%" cy="83.5%" rx="1.2%" ry="0.7%" fill="#9a9a3a" opacity="0.5" />
      <ellipse cx="58%" cy="85%" rx="2.5%" ry="1.5%" fill="#7a7a7a" opacity="0.7" />
      <ellipse cx="59%" cy="84.5%" rx="0.9%" ry="0.5%" fill="#9a9a3a" opacity="0.45" />
      <ellipse cx="78%" cy="83%" rx="3.5%" ry="2%" fill="#7a7a7a" opacity="0.72" />
      <ellipse cx="79.5%" cy="82.5%" rx="1.4%" ry="0.6%" fill="#9a9a3a" opacity="0.48" />

      {/* Lingonberry bushes — small dark-green shrubs */}
      {[14, 35, 52, 70, 86].map((bx, i) => (
        <ellipse
          key={`berry-${i}`}
          cx={bx + '%'} cy={85.5 + (i % 2) * 0.5 + '%'}
          rx="1.5%" ry="0.8%"
          fill="#1a3a1a" opacity="0.65"
        />
      ))}

      {/* Scots pine trees */}
      <ScotsPine x={8}  baseY={84} height={38} delay={0} />
      <ScotsPine x={28} baseY={83} height={42} delay={180} />
      <ScotsPine x={45} baseY={84} height={36} delay={90} />
      <ScotsPine x={62} baseY={83} height={40} delay={260} />
      <ScotsPine x={82} baseY={84} height={37} delay={140} />

      {/* Silver birch trees */}
      <SilverBirch x={18} baseY={84} height={32} delay={70} />
      <SilverBirch x={52} baseY={83} height={30} delay={200} />
      <SilverBirch x={72} baseY={84} height={28} delay={310} />
    </svg>
  );
}


// ─── NordicForeground (Layer 8) ───

export function NordicForeground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ pointerEvents: 'none' }}
    >
      {/* Rocky ground plane */}
      <path
        d="M0,90 C6,89 12,90.2 18,89.5 C24,88.8 30,90 36,89.2
           C42,89.8 48,89 54,89.5 C60,88.8 66,90 72,89.3
           C78,89.8 84,89 90,89.5 C96,89 100,89.5 100,89.5
           L100,100 L0,100 Z"
        fill="var(--biome-fg-ground, #3a3a2a)"
      />

      {/* Scattered moss patches on rock */}
      {[8, 25, 42, 60, 75].map((mx, i) => (
        <ellipse
          key={`moss-${i}`}
          cx={mx + (i % 2) * 2 + '%'}
          cy={91 + (i % 3) * 0.8 + '%'}
          rx={1.5 + (i % 2) * 0.5 + '%'}
          ry="0.6%"
          fill="#3a5a2a"
          opacity={0.35 + (i % 3) * 0.1}
        />
      ))}

      {/* Small rocks on ground */}
      {[15, 38, 55, 82].map((rx, i) => (
        <ellipse
          key={`rock-${i}`}
          cx={rx + '%'}
          cy={90.5 + (i % 2) * 0.5 + '%'}
          rx={0.8 + (i % 2) * 0.3 + '%'}
          ry="0.4%"
          fill="#5a5a4a"
          opacity="0.6"
        />
      ))}

      {/* Framing birch trunk — right side */}
      <rect x="94%" y="20%" width="1.2%" height="80%" rx="0.2%"
        fill="var(--biome-accent, #e8e0d0)" opacity="0.92" />
      {/* Bark marks on framing birch */}
      {[25, 32, 39, 46, 53, 60, 67, 74, 81, 88].map((by, i) => (
        <line
          key={`fbark-${i}`}
          x1="94.1%" y1={by + '%'}
          x2="95.1%" y2={by + '%'}
          stroke="#3a3a3a" strokeWidth="0.12%" opacity="0.35"
        />
      ))}
      {/* Birch canopy peeking in from right */}
      <ellipse cx="96%" cy="22%" rx="4%" ry="5%" fill="var(--biome-canopy, #2a5a3a)" opacity="0.6" />
      <ellipse cx="97%" cy="18%" rx="3%" ry="3.5%" fill="var(--biome-canopy, #2a5a3a)" opacity="0.5" />

      {/* Wooden dock / boat edge — bottom extending toward water */}
      <rect x="30%" y="95%" width="18%" height="0.8%" rx="0.1%"
        fill="#8a7a6a" opacity="0.7" />
      {/* Plank grain lines */}
      <line x1="32%" y1="95.3%" x2="46%" y2="95.3%" stroke="#6a5a4a" strokeWidth="0.08%" opacity="0.3" />
      <line x1="33%" y1="95.6%" x2="47%" y2="95.6%" stroke="#6a5a4a" strokeWidth="0.06%" opacity="0.25" />
      {/* Dock support post */}
      <rect x="31%" y="94%" width="0.6%" height="3%" rx="0.1%"
        fill="#7a6a5a" opacity="0.6" />
      <rect x="47%" y="94.5%" width="0.6%" height="2.5%" rx="0.1%"
        fill="#7a6a5a" opacity="0.55" />
    </svg>
  );
}
