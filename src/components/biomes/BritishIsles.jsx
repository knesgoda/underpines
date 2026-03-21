/**
 * BritishIsles.jsx — British Isles biome scene components for CabinScene.
 *
 * Exports: BritishIslesBackground (Layer 2), BritishIslesMidground (Layer 5),
 *          BritishIslesForeground (Layer 8)
 *
 * Moody, green, overcast-friendly. Rolling hills, hedgerows, oaks, stone walls.
 */

// ─── BritishIslesBackground (Layer 2) ───
export function BritishIslesBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1000 333"
      preserveAspectRatio="none"
      style={{ pointerEvents: 'none' }}
    >
      {/* Furthest hills — misty blue-green, soft rolling */}
      <path
        d="M0,185 C80,170 160,178 260,165 C360,152 440,175 560,158
           C680,145 780,168 880,155 C940,148 1000,165 1000,165
           L1000,333 L0,333 Z"
        fill="#7a9a8a"
        opacity="0.6"
      />

      {/* Tiny church spire on distant hill */}
      <rect x="620" y="145" width="2" height="14" fill="#6a7a6a" opacity="0.5" />
      <path d="M619,145 L621,138 L623,145 Z" fill="#6a7a6a" opacity="0.5" />

      {/* Valley fog band 1 */}
      <ellipse cx="300" cy="178" rx="180" ry="8" fill="#ffffff" opacity="0.15" />
      <ellipse cx="750" cy="172" rx="150" ry="7" fill="#ffffff" opacity="0.12" />

      {/* Middle hills — medium green */}
      <path
        d="M0,215 C60,198 140,210 240,195 C340,180 420,205 540,190
           C660,175 760,200 860,188 C930,180 1000,200 1000,200
           L1000,333 L0,333 Z"
        fill="#4a7a4a"
        opacity="0.8"
      />

      {/* Valley fog band 2 */}
      <ellipse cx="180" cy="210" rx="140" ry="6" fill="#ffffff" opacity="0.18" />
      <ellipse cx="600" cy="205" rx="160" ry="7" fill="#ffffff" opacity="0.14" />

      {/* Nearest hills — rich green */}
      <path
        d="M0,248 C100,232 200,242 320,228 C440,215 540,238 660,225
           C780,212 880,235 1000,222
           L1000,333 L0,333 Z"
        fill="#2a5a2a"
        opacity="0.9"
      />

      {/* Valley fog band 3 — low */}
      <ellipse cx="450" cy="245" rx="200" ry="5" fill="#ffffff" opacity="0.1" />
    </svg>
  );
}


// ─── BritishIslesMidground (Layer 5) ───

function EnglishOak({ x, baseY, spread, delay }) {
  const trunkW = 3.5;
  const trunkH = 18;
  const canopyRx = spread;
  const canopyRy = spread * 0.6;
  const canopyY = baseY - trunkH - canopyRy * 0.5;

  return (
    <g
      className="tree-sway"
      style={{ transformOrigin: `${x}% ${baseY}%`, animationDelay: `${delay}ms` }}
    >
      {/* Thick gnarled trunk */}
      <path
        d={`M${x - 1.2} ${baseY} L${x - 1.8} ${baseY - trunkH * 0.4}
            Q${x - 2} ${baseY - trunkH * 0.7} ${x - 0.5} ${baseY - trunkH}
            L${x + 0.5} ${baseY - trunkH}
            Q${x + 2} ${baseY - trunkH * 0.7} ${x + 1.8} ${baseY - trunkH * 0.4}
            L${x + 1.2} ${baseY} Z`}
        fill="var(--biome-trunk, #4a3a2a)"
        opacity="0.85"
      />
      {/* Main branch forks */}
      <path
        d={`M${x - 0.8} ${baseY - trunkH} Q${x - canopyRx * 0.6} ${baseY - trunkH - 3} ${x - canopyRx * 0.5} ${canopyY + 2}`}
        stroke="var(--biome-trunk, #4a3a2a)" strokeWidth="0.8" fill="none" opacity="0.6"
      />
      <path
        d={`M${x + 0.8} ${baseY - trunkH} Q${x + canopyRx * 0.6} ${baseY - trunkH - 3} ${x + canopyRx * 0.5} ${canopyY + 2}`}
        stroke="var(--biome-trunk, #4a3a2a)" strokeWidth="0.8" fill="none" opacity="0.6"
      />
      {/* Broad spreading canopy — overlapping ellipses */}
      <ellipse cx={`${x - canopyRx * 0.25}%`} cy={`${canopyY + 1}%`}
        rx={`${canopyRx * 0.55}%`} ry={`${canopyRy * 0.7}%`}
        fill="var(--biome-canopy, #3a6a2a)" opacity="0.75" />
      <ellipse cx={`${x + canopyRx * 0.25}%`} cy={`${canopyY - 0.5}%`}
        rx={`${canopyRx * 0.6}%`} ry={`${canopyRy * 0.65}%`}
        fill="var(--biome-canopy, #3a6a2a)" opacity="0.8" />
      <ellipse cx={`${x}%`} cy={`${canopyY - 1}%`}
        rx={`${canopyRx * 0.5}%`} ry={`${canopyRy * 0.55}%`}
        fill="var(--biome-canopy, #3a6a2a)" opacity="0.85" />
    </g>
  );
}

function BeechTree({ x, baseY, height, delay }) {
  const trunkH = height;
  const canopyW = height * 0.35;
  const canopyH = height * 0.55;
  const canopyY = baseY - trunkH;

  return (
    <g
      className="tree-sway"
      style={{ transformOrigin: `${x}% ${baseY}%`, animationDelay: `${delay}ms` }}
    >
      {/* Smooth columnar trunk */}
      <rect
        x={x - 0.8 + '%'} y={baseY - trunkH + '%'}
        width="1.6%" height={trunkH + '%'}
        rx="0.4%" fill="var(--biome-trunk, #4a3a2a)" opacity="0.75"
      />
      {/* Columnar canopy — reads --seasonal-canopy for autumn copper */}
      <ellipse cx={x + '%'} cy={canopyY + canopyH * 0.35 + '%'}
        rx={canopyW * 0.5 + '%'} ry={canopyH * 0.5 + '%'}
        fill="var(--seasonal-canopy, var(--biome-canopy, #3a6a2a))" opacity="0.82" />
      <ellipse cx={x + '%'} cy={canopyY + canopyH * 0.2 + '%'}
        rx={canopyW * 0.38 + '%'} ry={canopyH * 0.38 + '%'}
        fill="var(--seasonal-canopy, var(--biome-canopy, #3a6a2a))" opacity="0.75" />
    </g>
  );
}

export function BritishIslesMidground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ pointerEvents: 'none' }}
    >
      {/* Hedgerow — THE visual signature */}
      <path
        d="M0,78 C3,76.5 6,77.5 9,76 C12,77 15,75.5 18,77 C21,75.8 24,77.2 27,76
           C30,77.5 33,75.5 36,77 C39,76 42,77.5 45,76.5 C48,77 51,75.8 54,77
           C57,76 60,77.5 63,76 C66,77 69,75.5 72,77 C75,76.2 78,77.5 81,76
           C84,77 87,75.8 90,77 C93,76 96,77.5 100,76.5
           L100,82 L0,82 Z"
        fill="#3a5a2a"
        opacity="0.9"
      />

      {/* Stone wall segment */}
      {[32, 34, 36, 38, 40, 42, 44, 46, 48].map((sx, i) => (
        <rect
          key={`stone-${i}`}
          x={sx + (i % 2) * 0.3 + '%'}
          y={80 - (i % 3) * 0.4 + '%'}
          width="1.8%"
          height={1.2 + (i % 2) * 0.3 + '%'}
          rx="0.2%"
          fill="#8a8a7a"
          opacity={0.6 + (i % 3) * 0.08}
        />
      ))}
      {/* Wall cap stones */}
      <path
        d="M32,79.5 L50,79 L50,80 L32,80.5 Z"
        fill="#7a7a6a" opacity="0.5"
      />

      {/* English oaks */}
      <EnglishOak x={12} baseY={82} spread={10} delay={0} />
      <EnglishOak x={38} baseY={80} spread={12} delay={200} />
      <EnglishOak x={65} baseY={81} spread={11} delay={120} />
      <EnglishOak x={88} baseY={82} spread={9} delay={300} />

      {/* Beech trees */}
      <BeechTree x={25} baseY={81} height={30} delay={160} />
      <BeechTree x={75} baseY={80} height={28} delay={250} />

      {/* Bluebell carpet — spring detail */}
      <g style={{ opacity: 'var(--seasonal-spring-detail-opacity, 0)' }}>
        {[8, 10, 12, 14, 16, 34, 36, 40, 42, 61, 63, 67, 69, 84, 86, 90].map((bx, i) => (
          <circle
            key={`bell-${i}`}
            cx={bx + (i % 3) * 0.5 + '%'}
            cy={82 + (i % 4) * 0.4 + '%'}
            r="0.35%"
            fill="#6a5aaa"
            opacity={0.5 + (i % 3) * 0.12}
          />
        ))}
      </g>
    </svg>
  );
}


// ─── BritishIslesForeground (Layer 8) ───

export function BritishIslesForeground({ timeOfDay }) {
  const showDew = timeOfDay === 'dawn' || timeOfDay === 'morning';

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ pointerEvents: 'none' }}
    >
      {/* Ground plane — lush grass with irregular edge */}
      <path
        d="M0,90 C5,88.8 10,89.5 15,88.5 C20,89.2 25,88 30,89
           C35,88.5 40,89.5 45,88.8 C50,89.2 55,88.5 60,89
           C65,88.2 70,89.5 75,88.8 C80,89 85,88.5 90,89.2
           C95,88.5 100,89 100,89 L100,100 L0,100 Z"
        fill="var(--biome-fg-ground, #2a4a1a)"
      />

      {/* Grass blade tips */}
      {[4, 9, 14, 22, 28, 35, 43, 50, 58, 64, 71, 78, 85, 93].map((gx, i) => (
        <path
          key={`grass-${i}`}
          d={`M${gx} ${89 + (i % 3) * 0.3} L${gx + 0.15} ${87.5 + (i % 2) * 0.5} L${gx + 0.3} ${89 + (i % 3) * 0.3} Z`}
          fill="var(--biome-fg-ground, #2a4a1a)"
          opacity="0.8"
        />
      ))}

      {/* Morning dew dots */}
      {showDew && [5, 12, 19, 26, 33, 41, 48, 56, 63, 70, 77, 84, 91].map((dx, i) => (
        <circle
          key={`dew-${i}`}
          cx={dx + (i % 2) * 0.8 + '%'}
          cy={87.8 + (i % 3) * 0.6 + '%'}
          r="0.2%"
          fill="white"
          opacity={0.4 + (i % 3) * 0.15}
        />
      ))}

      {/* Large framing oak — left side */}
      <path
        d={`M0,35 L0,100 L5,100 L5,35
            Q4.5,32 3,30 Q1.5,28 0,30 Z`}
        fill="#1a2a12"
        opacity="0.92"
      />
      {/* Oak canopy framing */}
      <ellipse cx="0%" cy="32%" rx="8%" ry="10%" fill="#1a2a12" opacity="0.88" />
      <ellipse cx="3%" cy="28%" rx="6%" ry="7%" fill="#1a2a12" opacity="0.85" />
      <ellipse cx="6%" cy="35%" rx="5%" ry="6%" fill="#1a2a12" opacity="0.82" />

      {/* Wooden gate/stile — bottom-right */}
      {/* Vertical posts */}
      <rect x="82%" y="88%" width="0.8%" height="8%" rx="0.15%" fill="#6a5a3a" opacity="0.8" />
      <rect x="88%" y="87%" width="0.8%" height="9%" rx="0.15%" fill="#6a5a3a" opacity="0.8" />
      {/* Horizontal rails */}
      <rect x="82%" y="90%" width="7%" height="0.6%" rx="0.1%" fill="#7a6a4a" opacity="0.7" />
      <rect x="82%" y="92.5%" width="7%" height="0.6%" rx="0.1%" fill="#7a6a4a" opacity="0.7" />
      {/* Step plank */}
      <rect x="83%" y="94.5%" width="5%" height="0.5%" rx="0.1%" fill="#7a6a4a" opacity="0.6" />
    </svg>
  );
}
