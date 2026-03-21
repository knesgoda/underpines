/**
 * CaliforniaSW.jsx — California / Southwest biome.
 * Golden hills, Ponderosa pines, live oaks, manzanita, dry golden grass.
 */

export function CaliforniaSWBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1000 500"
      preserveAspectRatio="none"
      style={{ pointerEvents: 'none' }}
    >
      {/* Distant haze band */}
      <rect x="0" y="160" width="1000" height="40" fill="#e8d8b8" opacity="0.25" />

      {/* Far golden hills */}
      <path
        d="M0,220 C100,200 200,215 320,195 C440,180 560,210 700,190
           C820,175 920,200 1000,188
           L1000,500 L0,500 Z"
        fill="#c4a43a" opacity="0.45"
      />

      {/* Mid golden hills */}
      <path
        d="M0,270 C80,252 180,265 300,248 C420,235 540,260 680,242
           C800,228 900,252 1000,240
           L1000,500 L0,500 Z"
        fill="#b89830" opacity="0.6"
      />

      {/* Near dry grass hills */}
      <path
        d="M0,320 C100,305 220,315 360,298 C500,285 640,310 780,295
           C880,282 960,305 1000,295
           L1000,500 L0,500 Z"
        fill="#a08828" opacity="0.75"
      />
    </svg>
  );
}

function PonderosaPine({ x, baseY, height, delay }) {
  const trunkH = height;
  const canopyTop = baseY - trunkH;
  return (
    <g className="tree-sway"
      style={{ transformOrigin: `${x}% ${baseY}%`, animationDelay: `${delay}ms` }}>
      {/* Orange-barked trunk */}
      <rect x={x - 0.6 + '%'} y={canopyTop + trunkH * 0.3 + '%'}
        width="1.2%" height={trunkH * 0.7 + '%'}
        rx="0.2%" fill="#b87a40" opacity="0.85" />
      {/* Open canopy clusters */}
      <ellipse cx={x - 1.5 + '%'} cy={canopyTop + 3 + '%'}
        rx="2.5%" ry="2.2%" fill="var(--biome-canopy, #7a9a5a)" opacity="0.7" />
      <ellipse cx={x + 1.5 + '%'} cy={canopyTop + 2 + '%'}
        rx="2.2%" ry="1.8%" fill="var(--biome-canopy, #7a9a5a)" opacity="0.65" />
      <ellipse cx={x + '%'} cy={canopyTop + 5 + '%'}
        rx="2%" ry="1.5%" fill="var(--biome-canopy, #7a9a5a)" opacity="0.6" />
    </g>
  );
}

function LiveOakCA({ x, baseY, spread, delay }) {
  const trunkH = 16;
  const canopyY = baseY - trunkH - spread * 0.3;
  return (
    <g className="tree-sway"
      style={{ transformOrigin: `${x}% ${baseY}%`, animationDelay: `${delay}ms` }}>
      <path
        d={`M${x - 1.2} ${baseY} L${x - 1.8} ${baseY - trunkH * 0.5}
            Q${x} ${baseY - trunkH * 0.9} ${x + 1.8} ${baseY - trunkH * 0.5}
            L${x + 1.2} ${baseY} Z`}
        fill="var(--biome-trunk, #9a7a5a)" opacity="0.8" />
      <ellipse cx={x - spread * 0.2 + '%'} cy={canopyY + 2 + '%'}
        rx={spread * 0.55 + '%'} ry={spread * 0.35 + '%'}
        fill="#2a5a2a" opacity="0.8" />
      <ellipse cx={x + spread * 0.15 + '%'} cy={canopyY + '%'}
        rx={spread * 0.5 + '%'} ry={spread * 0.3 + '%'}
        fill="#2a5a2a" opacity="0.75" />
    </g>
  );
}

export function CaliforniaSWMidground() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100"
      preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
      {/* Manzanita shrubs */}
      {[20, 55, 78].map((mx, i) => (
        <g key={`manz-${i}`}>
          <path d={`M${mx} ${84 + i * 0.3} Q${mx + 1} ${82 + i * 0.2} ${mx + 2} ${83 + i * 0.3}
                     Q${mx + 1.5} ${81 + i * 0.2} ${mx + 0.5} ${82}`}
            stroke="#8a3a2a" strokeWidth="0.3" fill="none" opacity="0.6" />
          <ellipse cx={mx + 1 + '%'} cy={82 + i * 0.3 + '%'}
            rx="1.8%" ry="1.2%" fill="#3a6a2a" opacity="0.55" />
        </g>
      ))}
      <PonderosaPine x={12} baseY={83} height={38} delay={0} />
      <PonderosaPine x={42} baseY={82} height={42} delay={180} />
      <PonderosaPine x={70} baseY={83} height={36} delay={100} />
      <LiveOakCA x={30} baseY={83} spread={12} delay={80} />
      <LiveOakCA x={85} baseY={82} spread={10} delay={250} />
    </svg>
  );
}

export function CaliforniaSWForeground() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100"
      preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
      {/* Dry golden grass ground */}
      <path
        d="M0,89.5 C10,88.5 20,89.5 30,88.8 C40,89.2 50,88.5 60,89
           C70,88.5 80,89.2 90,88.8 C95,89 100,89 100,89
           L100,100 L0,100 Z"
        fill="var(--biome-fg-ground, #b8a070)" />
      {/* Grass blade tips */}
      {[6, 14, 22, 30, 38, 46, 54, 62, 70, 78, 86, 94].map((gx, i) => (
        <path key={`g-${i}`}
          d={`M${gx} ${89 + (i % 2) * 0.3} L${gx + 0.2} ${87.5 + (i % 3) * 0.4} L${gx + 0.4} ${89 + (i % 2) * 0.3}`}
          fill="#c4a43a" opacity="0.6" />
      ))}
      {/* Exposed rock */}
      <ellipse cx="35%" cy="91%" rx="3%" ry="1.2%" fill="#8a7a6a" opacity="0.5" />
      <ellipse cx="65%" cy="92%" rx="2.5%" ry="1%" fill="#7a6a5a" opacity="0.45" />
      {/* Rustic wooden fence post */}
      <rect x="82%" y="86%" width="1%" height="10%" rx="0.15%" fill="#7a6040" opacity="0.75" />
      <rect x="78%" y="88%" width="8%" height="0.5%" rx="0.1%" fill="#8a7050" opacity="0.6" />
    </svg>
  );
}
