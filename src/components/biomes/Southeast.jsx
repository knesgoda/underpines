/**
 * Southeast.jsx — Southeast US biome.
 * Spanish moss, longleaf pines, humid haze, bayou, magnolia.
 */

const mossSwayStyle = `
@keyframes moss-sway {
  0%, 100% { transform: rotate(-1.5deg); }
  50% { transform: rotate(1.5deg); }
}
`;

export function SoutheastBackground() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 500"
      preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
      {/* Permanent humid haze */}
      <rect x="0" y="120" width="1000" height="380" fill="#ffffff" opacity="0.06" />

      {/* Flat terrain — distant tree line */}
      <path
        d="M0,240 C100,238 250,242 400,236 C550,232 700,240 850,235 C930,232 1000,238 1000,238
           L1000,500 L0,500 Z"
        fill="var(--biome-bg-far, #90a880)" opacity="0.5"
      />

      {/* Bayou / river water */}
      <path
        d="M300,265 C380,260 450,268 540,258 C630,252 720,262 800,255
           C850,250 900,260 950,255"
        stroke="#4a6a5a" strokeWidth="12" fill="none" opacity="0.3" strokeLinecap="round"
      />

      {/* Mid terrain */}
      <path
        d="M0,290 C120,280 260,288 400,275 C540,265 680,282 820,270
           C920,264 1000,278 1000,278
           L1000,500 L0,500 Z"
        fill="var(--biome-bg-mid, #5a8a50)" opacity="0.65"
      />

      {/* Thicker haze in background */}
      <rect x="0" y="220" width="1000" height="100" fill="#ffffff" opacity="0.08" />

      {/* Near terrain */}
      <path
        d="M0,340 C100,330 220,338 360,325 C500,315 650,335 800,322
           C900,316 1000,330 1000,330
           L1000,500 L0,500 Z"
        fill="var(--biome-bg-near, #3a7040)" opacity="0.8"
      />
    </svg>
  );
}

function LongleafPine({ x, baseY, height, delay }) {
  const trunkH = height;
  const canopyTop = baseY - trunkH;
  return (
    <g className="tree-sway"
      style={{ transformOrigin: `${x}% ${baseY}%`, animationDelay: `${delay}ms` }}>
      {/* Very tall, thin, straight trunk */}
      <rect x={x - 0.35 + '%'} y={canopyTop + '%'}
        width="0.7%" height={trunkH + '%'}
        rx="0.1%" fill="var(--biome-trunk, #6a5038)" opacity="0.85" />
      {/* Small crown at top only */}
      <ellipse cx={x + '%'} cy={canopyTop + 2 + '%'}
        rx="2.5%" ry="2.5%" fill="var(--biome-canopy, #3a8a3a)" opacity="0.7" />
      <ellipse cx={x + 0.5 + '%'} cy={canopyTop + 0.5 + '%'}
        rx="1.8%" ry="1.5%" fill="var(--biome-canopy, #3a8a3a)" opacity="0.65" />
    </g>
  );
}

function MossyLiveOak({ x, baseY, spread, delay }) {
  const trunkH = 18;
  const canopyY = baseY - trunkH - spread * 0.3;
  /* Moss strand positions relative to branch tips */
  const mossStrands = [
    { dx: -spread * 0.45, dy: 3 },
    { dx: -spread * 0.25, dy: 2.5 },
    { dx: -spread * 0.05, dy: 4 },
    { dx: spread * 0.15, dy: 3.5 },
    { dx: spread * 0.35, dy: 2.8 },
    { dx: spread * 0.5, dy: 3.2 },
  ];

  return (
    <g className="tree-sway"
      style={{ transformOrigin: `${x}% ${baseY}%`, animationDelay: `${delay}ms` }}>
      {/* Thick trunk */}
      <path
        d={`M${x - 1.5} ${baseY} L${x - 2} ${baseY - trunkH * 0.5}
            Q${x} ${baseY - trunkH * 0.85} ${x + 2} ${baseY - trunkH * 0.5}
            L${x + 1.5} ${baseY} Z`}
        fill="var(--biome-trunk, #6a5038)" opacity="0.85" />
      {/* Wide spreading canopy */}
      <ellipse cx={x + '%'} cy={canopyY + 2 + '%'}
        rx={spread * 0.6 + '%'} ry={spread * 0.38 + '%'}
        fill="var(--biome-canopy, #3a8a3a)" opacity="0.8" />
      <ellipse cx={x - spread * 0.15 + '%'} cy={canopyY + '%'}
        rx={spread * 0.5 + '%'} ry={spread * 0.32 + '%'}
        fill="var(--biome-canopy, #3a8a3a)" opacity="0.75" />

      {/* Spanish moss strands — each sways independently */}
      {mossStrands.map((m, i) => (
        <path key={`moss-${i}`}
          d={`M${x + m.dx} ${canopyY + m.dy}
              Q${x + m.dx - 0.3} ${canopyY + m.dy + 2.5} ${x + m.dx + 0.1} ${canopyY + m.dy + 4.5}`}
          stroke="#7a8a6a" strokeWidth="0.25" fill="none"
          opacity={0.5 + (i % 3) * 0.1}
          style={{
            animation: `moss-sway ${5 + i * 0.6}s ease-in-out infinite`,
            transformOrigin: `${x + m.dx}% ${canopyY + m.dy}%`,
            animationDelay: `${i * 400}ms`,
          }}
        />
      ))}
    </g>
  );
}

function Magnolia({ x, baseY, delay }) {
  const trunkH = 22;
  const canopyTop = baseY - trunkH;
  return (
    <g className="tree-sway"
      style={{ transformOrigin: `${x}% ${baseY}%`, animationDelay: `${delay}ms` }}>
      <rect x={x - 0.5 + '%'} y={canopyTop + trunkH * 0.35 + '%'}
        width="1%" height={trunkH * 0.65 + '%'}
        rx="0.2%" fill="var(--biome-trunk, #6a5038)" opacity="0.8" />
      <ellipse cx={x + '%'} cy={canopyTop + 4 + '%'}
        rx="3.5%" ry="4%" fill="#2a6a2a" opacity="0.8" />
      <ellipse cx={x + 0.3 + '%'} cy={canopyTop + 1.5 + '%'}
        rx="2.5%" ry="2.5%" fill="#2a6a2a" opacity="0.75" />
    </g>
  );
}

export function SoutheastMidground() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100"
      preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
      <style>{mossSwayStyle}</style>

      <LongleafPine x={10} baseY={83} height={42} delay={0} />
      <LongleafPine x={38} baseY={82} height={45} delay={160} />
      <LongleafPine x={75} baseY={83} height={40} delay={80} />

      <MossyLiveOak x={55} baseY={82} spread={14} delay={120} />

      <Magnolia x={88} baseY={83} delay={220} />
    </svg>
  );
}

export function SoutheastForeground() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100"
      preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
      <style>{mossSwayStyle}</style>

      {/* Lush ground */}
      <path
        d="M0,88.5 C8,87.5 16,88.5 24,87.8 C32,88.2 40,87.5 48,88
           C56,87.5 64,88.2 72,87.8 C80,88.5 88,87.5 96,88
           L100,88 L100,100 L0,100 Z"
        fill="var(--biome-fg-ground, #2a5a28)" />

      {/* Fern clusters */}
      {[8, 22, 40, 62, 80].map((fx, i) => (
        <g key={`fern-${i}`}>
          <path
            d={`M${fx} ${89 + (i % 2) * 0.3}
                Q${fx - 1} ${87.5} ${fx - 2} ${87}
                M${fx} ${89 + (i % 2) * 0.3}
                Q${fx + 1} ${87.5} ${fx + 2} ${87.2}`}
            stroke="#2a6a1a" strokeWidth="0.2" fill="none" opacity="0.55" />
          <ellipse cx={fx + '%'} cy={88.5 + (i % 2) * 0.3 + '%'}
            rx="2%" ry="0.8%" fill="#2a6a1a" opacity="0.4" />
        </g>
      ))}

      {/* Weathered wooden dock plank — bottom */}
      <rect x="35%" y="95%" width="20%" height="0.8%" rx="0.1%"
        fill="#7a6a5a" opacity="0.65" />
      <line x1="37%" y1="95.3%" x2="53%" y2="95.3%" stroke="#5a4a3a" strokeWidth="0.06%" opacity="0.3" />
      <rect x="36%" y="94%" width="0.5%" height="2.5%" rx="0.1%"
        fill="#6a5a4a" opacity="0.55" />
      <rect x="54%" y="94.2%" width="0.5%" height="2.3%" rx="0.1%"
        fill="#6a5a4a" opacity="0.5" />
    </svg>
  );
}
