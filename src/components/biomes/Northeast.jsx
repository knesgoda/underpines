/**
 * Northeast.jsx — Northeast US biome scene components.
 *
 * Exports: NortheastBackground (Layer 2), NortheastMidground (Layer 5),
 *          NortheastForeground (Layer 8)
 *
 * Appalachian hills, sugar maples, stone walls, dramatic four-season cycle.
 */

// ─── NortheastBackground (Layer 2) ───
export function NortheastBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1000 500"
      preserveAspectRatio="none"
      style={{ pointerEvents: 'none' }}
    >
      {/* Furthest Appalachian hills — rounded, gentle */}
      <path
        d="M0,220 C80,195 160,210 260,190 C360,175 440,200 560,185
           C680,170 800,195 900,180 C950,175 1000,190 1000,190
           L1000,500 L0,500 Z"
        fill="var(--biome-bg-far, #8a9a8a)"
        opacity="0.6"
      />

      {/* Middle hills — dense deciduous forest */}
      <path
        d="M0,270 C70,250 150,262 260,245 C370,230 460,258 580,240
           C700,225 810,252 900,238 C950,232 1000,248 1000,248
           L1000,500 L0,500 Z"
        fill="var(--biome-bg-mid, #5a7a58)"
        opacity="0.75"
      />

      {/* Winding road/river glimpsed between hills */}
      <path
        d="M320,258 C360,255 400,260 440,252 C480,248 520,256 560,250
           C600,246 640,255 680,248"
        stroke="#c8c0b0" strokeWidth="1.5" fill="none" opacity="0.3"
      />

      {/* Nearest hills */}
      <path
        d="M0,320 C90,298 200,312 320,295 C440,280 560,308 680,290
           C800,275 900,300 1000,288
           L1000,500 L0,500 Z"
        fill="var(--biome-bg-near, #4a6a46)"
        opacity="0.85"
      />
    </svg>
  );
}


// ─── NortheastMidground (Layer 5) ───

function SugarMaple({ x, baseY, spread, delay }) {
  const trunkH = 22;
  const canopyR = spread;
  const canopyY = baseY - trunkH - canopyR * 0.4;

  return (
    <g
      className="tree-sway"
      style={{ transformOrigin: `${x}% ${baseY}%`, animationDelay: `${delay}ms` }}
    >
      {/* Thick trunk with slight taper */}
      <path
        d={`M${x - 1} ${baseY} L${x - 1.5} ${baseY - trunkH * 0.5}
            Q${x - 1} ${baseY - trunkH * 0.8} ${x - 0.3} ${baseY - trunkH}
            L${x + 0.3} ${baseY - trunkH}
            Q${x + 1} ${baseY - trunkH * 0.8} ${x + 1.5} ${baseY - trunkH * 0.5}
            L${x + 1} ${baseY} Z`}
        fill="var(--biome-trunk, #5a4a3a)"
        opacity="0.85"
      />
      {/* Branch forks */}
      <path
        d={`M${x - 0.5} ${baseY - trunkH}
            Q${x - canopyR * 0.4} ${baseY - trunkH - 4} ${x - canopyR * 0.35} ${canopyY + 3}`}
        stroke="var(--biome-trunk, #5a4a3a)" strokeWidth="0.6" fill="none" opacity="0.6"
      />
      <path
        d={`M${x + 0.5} ${baseY - trunkH}
            Q${x + canopyR * 0.4} ${baseY - trunkH - 4} ${x + canopyR * 0.35} ${canopyY + 3}`}
        stroke="var(--biome-trunk, #5a4a3a)" strokeWidth="0.6" fill="none" opacity="0.6"
      />
      {/* Large spreading canopy — reads --biome-canopy for seasonal color */}
      <ellipse
        cx={x - canopyR * 0.2 + '%'} cy={canopyY + 2 + '%'}
        rx={canopyR * 0.5 + '%'} ry={canopyR * 0.4 + '%'}
        fill="var(--biome-canopy, #3a7a3a)" opacity="0.78"
      />
      <ellipse
        cx={x + canopyR * 0.2 + '%'} cy={canopyY + 1 + '%'}
        rx={canopyR * 0.55 + '%'} ry={canopyR * 0.38 + '%'}
        fill="var(--biome-canopy, #3a7a3a)" opacity="0.82"
      />
      <ellipse
        cx={x + '%'} cy={canopyY + '%'}
        rx={canopyR * 0.45 + '%'} ry={canopyR * 0.35 + '%'}
        fill="var(--biome-canopy, #3a7a3a)" opacity="0.85"
      />
    </g>
  );
}

function WhiteBirchNE({ x, baseY, height, delay }) {
  const trunkH = height;
  const canopyTop = baseY - trunkH;
  const marks = [0.18, 0.3, 0.42, 0.55, 0.67, 0.78, 0.88];

  return (
    <g
      className="tree-sway"
      style={{ transformOrigin: `${x}% ${baseY}%`, animationDelay: `${delay}ms` }}
    >
      <rect
        x={x - 0.4 + '%'} y={canopyTop + '%'}
        width="0.8%" height={trunkH + '%'}
        rx="0.15%" fill="#e8e0d0" opacity="0.9"
      />
      {marks.map((frac, i) => (
        <line
          key={`bk-${i}`}
          x1={x - 0.35 + '%'} y1={canopyTop + trunkH * frac + '%'}
          x2={x + 0.35 + '%'} y2={canopyTop + trunkH * frac + '%'}
          stroke="#3a3a3a" strokeWidth="0.12%" opacity="0.35"
        />
      ))}
      {/* Delicate rounded canopy */}
      <ellipse
        cx={x + '%'} cy={canopyTop + 3.5 + '%'}
        rx="3%" ry="3.5%"
        fill="var(--biome-canopy, #3a7a3a)" opacity="0.5"
      />
      <ellipse
        cx={x + 0.5 + '%'} cy={canopyTop + 1.8 + '%'}
        rx="2.5%" ry="2.2%"
        fill="var(--biome-canopy, #3a7a3a)" opacity="0.45"
      />
    </g>
  );
}

function WhitePine({ x, baseY, height, delay }) {
  const trunkH = height;
  const canopyTop = baseY - trunkH;

  return (
    <g
      className="tree-sway"
      style={{ transformOrigin: `${x}% ${baseY}%`, animationDelay: `${delay}ms` }}
    >
      <rect
        x={x - 0.5 + '%'} y={canopyTop + trunkH * 0.35 + '%'}
        width="1%" height={trunkH * 0.65 + '%'}
        rx="0.2%" fill="var(--biome-trunk, #5a4a3a)" opacity="0.8"
      />
      {/* Evergreen conical canopy — stays green year-round */}
      <path
        d={`M${x} ${canopyTop}
            L${x - 3.5} ${canopyTop + trunkH * 0.4}
            L${x - 1.5} ${canopyTop + trunkH * 0.35}
            L${x - 4} ${canopyTop + trunkH * 0.55}
            L${x - 1} ${canopyTop + trunkH * 0.5}
            L${x - 3} ${canopyTop + trunkH * 0.65}
            L${x + 3} ${canopyTop + trunkH * 0.65}
            L${x + 1} ${canopyTop + trunkH * 0.5}
            L${x + 4} ${canopyTop + trunkH * 0.55}
            L${x + 1.5} ${canopyTop + trunkH * 0.35}
            L${x + 3.5} ${canopyTop + trunkH * 0.4}
            Z`}
        fill="#2a5a2a" opacity="0.8"
      />
    </g>
  );
}

export function NortheastMidground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ pointerEvents: 'none' }}
    >
      {/* New England stone wall — angular dry-stack */}
      {[18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66, 69, 72].map((sx, i) => (
        <rect
          key={`sw-${i}`}
          x={sx + (i % 3) * 0.2 + '%'}
          y={80.5 - (i % 4) * 0.3 + '%'}
          width={1.6 + (i % 2) * 0.4 + '%'}
          height={0.9 + (i % 3) * 0.2 + '%'}
          rx="0.1%"
          fill="#7a7a7a"
          opacity={0.5 + (i % 3) * 0.1}
        />
      ))}
      {/* Top cap stones */}
      {[20, 28, 36, 44, 52, 60, 68].map((sx, i) => (
        <rect
          key={`cap-${i}`}
          x={sx + '%'} y="79.8%"
          width="2.5%" height="0.5%"
          rx="0.1%" fill="#8a8a7a" opacity="0.45"
        />
      ))}

      {/* Sugar maples */}
      <SugarMaple x={15} baseY={82} spread={11} delay={0} />
      <SugarMaple x={50} baseY={81} spread={13} delay={150} />
      <SugarMaple x={80} baseY={82} spread={10} delay={280} />

      {/* White birches */}
      <WhiteBirchNE x={32} baseY={82} height={28} delay={100} />
      <WhiteBirchNE x={68} baseY={81} height={26} delay={220} />

      {/* White pine — evergreen anchor */}
      <WhitePine x={92} baseY={82} height={35} delay={60} />

      {/* Fallen autumn leaves — seasonal */}
      <g style={{ opacity: 'var(--seasonal-autumn-detail-opacity, 0)' }}>
        {[12, 18, 25, 33, 40, 48, 55, 62, 70, 77, 84].map((lx, i) => {
          const colors = ['#d4843a', '#b04030', '#c86a28', '#8a5a2a'];
          return (
            <ellipse
              key={`leaf-${i}`}
              cx={lx + (i % 3) * 0.8 + '%'}
              cy={83 + (i % 4) * 0.4 + '%'}
              rx={0.4 + (i % 2) * 0.15 + '%'}
              ry="0.25%"
              fill={colors[i % colors.length]}
              opacity={0.5 + (i % 3) * 0.12}
              transform={`rotate(${(i * 37) % 180} ${lx + (i % 3) * 0.8} ${83 + (i % 4) * 0.4})`}
            />
          );
        })}
      </g>
    </svg>
  );
}


// ─── NortheastForeground (Layer 8) ───

export function NortheastForeground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ pointerEvents: 'none' }}
    >
      {/* Ground — dark forest floor */}
      <path
        d="M0,89 C8,88.2 16,89 24,88.5 C32,89.2 40,88.5 48,89
           C56,88.3 64,89 72,88.6 C80,89.2 88,88.5 96,89
           L100,89 L100,100 L0,100 Z"
        fill="var(--biome-fg-ground, #2a3a1a)"
      />

      {/* Autumn leaf litter on ground */}
      <g style={{ opacity: 'var(--seasonal-autumn-detail-opacity, 0)' }}>
        {[5, 15, 28, 40, 52, 65, 78, 88].map((lx, i) => {
          const colors = ['#d4843a', '#b04030', '#c86a28', '#8a5a2a'];
          return (
            <ellipse
              key={`fg-leaf-${i}`}
              cx={lx + '%'} cy={90.5 + (i % 3) * 0.6 + '%'}
              rx={0.5 + (i % 2) * 0.2 + '%'} ry="0.3%"
              fill={colors[i % colors.length]}
              opacity={0.45 + (i % 3) * 0.1}
              transform={`rotate(${(i * 45) % 180} ${lx} ${90.5 + (i % 3) * 0.6})`}
            />
          );
        })}
      </g>

      {/* Large framing maple — left side */}
      <path
        d="M0,30 L0,100 L5.5,100 L5.5,30
           Q5,27 3.5,25 Q1.5,23 0,26 Z"
        fill="#1a2a14" opacity="0.92"
      />
      {/* Branch fork */}
      <path
        d="M4,35 Q7,30 9,26" stroke="#1a2a14" strokeWidth="0.6" fill="none" opacity="0.7"
      />
      {/* Maple canopy — reads biome-canopy */}
      <ellipse cx="0%" cy="28%" rx="8%" ry="9%" fill="var(--biome-canopy, #3a7a3a)" opacity="0.85" />
      <ellipse cx="4%" cy="24%" rx="6%" ry="6.5%" fill="var(--biome-canopy, #3a7a3a)" opacity="0.8" />
      <ellipse cx="7%" cy="30%" rx="5%" ry="5.5%" fill="var(--biome-canopy, #3a7a3a)" opacity="0.75" />

      {/* Split-rail fence — bottom-right */}
      {/* Vertical posts */}
      <rect x="80%" y="88%" width="0.7%" height="7%" rx="0.1%" fill="#6a5a3a" opacity="0.75" />
      <rect x="87%" y="87.5%" width="0.7%" height="7.5%" rx="0.1%" fill="#6a5a3a" opacity="0.75" />
      <rect x="94%" y="88%" width="0.7%" height="7%" rx="0.1%" fill="#6a5a3a" opacity="0.75" />
      {/* Rails — angled X pattern */}
      <line x1="80.5%" y1="90%" x2="87.5%" y2="89.5%" stroke="#7a6a4a" strokeWidth="0.35%" opacity="0.65" />
      <line x1="80.5%" y1="92%" x2="87.5%" y2="91.5%" stroke="#7a6a4a" strokeWidth="0.35%" opacity="0.65" />
      <line x1="87.5%" y1="89.5%" x2="94.5%" y2="90%" stroke="#7a6a4a" strokeWidth="0.35%" opacity="0.65" />
      <line x1="87.5%" y1="91.5%" x2="94.5%" y2="92%" stroke="#7a6a4a" strokeWidth="0.35%" opacity="0.65" />
    </svg>
  );
}
