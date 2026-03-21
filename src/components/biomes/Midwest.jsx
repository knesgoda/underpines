/**
 * Midwest.jsx — Midwest / Plains biome.
 * Low horizon, massive sky, bur oaks, prairie grass, wire fence.
 */

export function MidwestBackground() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 500"
      preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
      {/* Horizon is LOW — 60% from top = 300 in 500-unit viewBox */}

      {/* Distant farmland — golden grain fields */}
      <path
        d="M0,310 C150,305 300,312 500,302 C700,295 850,308 1000,300
           L1000,500 L0,500 Z"
        fill="#d4b43a" opacity="0.35"
      />
      {/* Farmland edges — thin lines */}
      <line x1="200" y1="308" x2="350" y2="305" stroke="#b09828" strokeWidth="0.8" opacity="0.2" />
      <line x1="600" y1="300" x2="780" y2="298" stroke="#b09828" strokeWidth="0.8" opacity="0.18" />

      {/* Gently rolling near fields */}
      <path
        d="M0,340 C120,332 260,340 400,330 C540,322 680,338 820,328
           C900,324 1000,335 1000,335
           L1000,500 L0,500 Z"
        fill="var(--biome-bg-near, #5a7a48)" opacity="0.7"
      />
    </svg>
  );
}

function BurOak({ x, baseY, spread, delay }) {
  const trunkH = 18;
  const canopyY = baseY - trunkH - spread * 0.35;
  return (
    <g className="tree-sway"
      style={{ transformOrigin: `${x}% ${baseY}%`, animationDelay: `${delay}ms` }}>
      <path
        d={`M${x - 1.5} ${baseY} L${x - 2} ${baseY - trunkH * 0.5}
            Q${x} ${baseY - trunkH * 0.85} ${x + 2} ${baseY - trunkH * 0.5}
            L${x + 1.5} ${baseY} Z`}
        fill="var(--biome-trunk, #6a5040)" opacity="0.85" />
      <ellipse cx={x + '%'} cy={canopyY + 2 + '%'}
        rx={spread * 0.55 + '%'} ry={spread * 0.4 + '%'}
        fill="var(--biome-canopy, #5a8a4a)" opacity="0.8" />
      <ellipse cx={x - spread * 0.15 + '%'} cy={canopyY + '%'}
        rx={spread * 0.45 + '%'} ry={spread * 0.35 + '%'}
        fill="var(--biome-canopy, #5a8a4a)" opacity="0.75" />
      <ellipse cx={x + spread * 0.2 + '%'} cy={canopyY + 1 + '%'}
        rx={spread * 0.5 + '%'} ry={spread * 0.32 + '%'}
        fill="var(--biome-canopy, #5a8a4a)" opacity="0.78" />
    </g>
  );
}

function Cottonwood({ x, baseY, height, delay }) {
  const trunkH = height;
  const canopyTop = baseY - trunkH;
  return (
    <g className="tree-sway"
      style={{ transformOrigin: `${x}% ${baseY}%`, animationDelay: `${delay}ms` }}>
      <rect x={x - 0.6 + '%'} y={canopyTop + trunkH * 0.3 + '%'}
        width="1.2%" height={trunkH * 0.7 + '%'}
        rx="0.2%" fill="var(--biome-trunk, #6a5040)" opacity="0.8" />
      <ellipse cx={x + '%'} cy={canopyTop + 4 + '%'}
        rx="4%" ry="4.5%" fill="var(--biome-canopy, #5a8a4a)" opacity="0.75" />
      <ellipse cx={x + 0.5 + '%'} cy={canopyTop + 1.5 + '%'}
        rx="3%" ry="3%" fill="var(--biome-canopy, #5a8a4a)" opacity="0.7" />
    </g>
  );
}

export function MidwestMidground() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100"
      preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>

      {/* Prairie grass — midground band */}
      <path
        d="M0,82 C5,80.5 10,81.5 15,80 C20,81 25,80 30,81
           C35,80 40,81.5 45,80.5 C50,81 55,80 60,81
           C65,80.5 70,81.5 75,80 C80,81 85,80 90,81
           C95,80.5 100,81 100,81
           L100,86 L0,86 Z"
        fill="var(--biome-fg-ground, #4a6a38)" opacity="0.7" />

      {/* Summer wildflower dots */}
      <g style={{ opacity: 'var(--seasonal-spring-detail-opacity, 0.3)' }}>
        {[12, 28, 44, 58, 74, 88].map((fx, i) => {
          const colors = ['#d4d44a', '#e86060', '#6a6ae8', '#e8a040'];
          return (
            <circle key={`wf-${i}`}
              cx={fx + '%'} cy={81 + (i % 3) * 0.4 + '%'}
              r="0.3%" fill={colors[i % 4]} opacity="0.6" />
          );
        })}
      </g>

      <BurOak x={20} baseY={82} spread={11} delay={0} />
      <BurOak x={55} baseY={81} spread={13} delay={200} />
      <BurOak x={85} baseY={82} spread={10} delay={100} />
      <Cottonwood x={40} baseY={81} height={34} delay={150} />
    </svg>
  );
}

export function MidwestForeground() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100"
      preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
      {/* Ground */}
      <path
        d="M0,90 C10,89 20,90 30,89.2 C40,89.8 50,89 60,89.5
           C70,89 80,90 90,89.2 C95,89.5 100,89 100,89
           L100,100 L0,100 Z"
        fill="var(--biome-fg-ground, #4a6a38)" />

      {/* Tall prairie grass framing — left side */}
      {[1, 3, 5, 7].map((gx, i) => (
        <path key={`pgl-${i}`}
          className="tree-sway"
          style={{ transformOrigin: `${gx}% 100%`, animationDelay: `${i * 120}ms` }}
          d={`M${gx} 100 Q${gx - 0.5} ${82 - i * 2} ${gx + 0.8} ${78 - i * 1.5}
              L${gx + 1} ${78 - i * 1.5}
              Q${gx + 0.3} ${82 - i * 2} ${gx + 0.5} 100 Z`}
          fill="#5a7a28" opacity={0.6 + i * 0.05} />
      ))}

      {/* Tall prairie grass — right side */}
      {[92, 94, 96, 98].map((gx, i) => (
        <path key={`pgr-${i}`}
          className="tree-sway"
          style={{ transformOrigin: `${gx}% 100%`, animationDelay: `${i * 100 + 50}ms` }}
          d={`M${gx} 100 Q${gx - 0.5} ${83 - i * 1.5} ${gx + 0.6} ${79 - i * 2}
              L${gx + 0.8} ${79 - i * 2}
              Q${gx + 0.3} ${83 - i * 1.5} ${gx + 0.3} 100 Z`}
          fill="#5a7a28" opacity={0.6 + i * 0.05} />
      ))}

      {/* Wire fence / wooden post */}
      <rect x="48%" y="87%" width="0.8%" height="8%" rx="0.1%" fill="#6a5a3a" opacity="0.65" />
      <line x1="35%" y1="89%" x2="62%" y2="89%" stroke="#8a8a8a" strokeWidth="0.1%" opacity="0.35" />
      <line x1="35%" y1="91%" x2="62%" y2="91%" stroke="#8a8a8a" strokeWidth="0.1%" opacity="0.3" />
    </svg>
  );
}
