/**
 * Mediterranean.jsx — Mediterranean biome.
 * Stone pines, olive trees, terraced golden hills, coastal blue sea.
 */

export function MedBackground() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 500"
      preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
      {/* Blue sea on horizon */}
      <rect x="0" y="175" width="1000" height="45" fill="#4a8ab0" opacity="0.55" />
      {/* Gentle sea shimmer lines */}
      <line x1="80" y1="190" x2="300" y2="190" stroke="#6aaac8" strokeWidth="0.5" opacity="0.2" />
      <line x1="450" y1="195" x2="700" y2="195" stroke="#6aaac8" strokeWidth="0.5" opacity="0.18" />
      <line x1="750" y1="188" x2="950" y2="188" stroke="#6aaac8" strokeWidth="0.5" opacity="0.15" />

      {/* Distant dry ochre hills */}
      <path
        d="M0,230 C80,218 180,225 300,212 C420,202 540,222 680,208
           C800,198 920,218 1000,210
           L1000,500 L0,500 Z"
        fill="#b09a5a" opacity="0.55"
      />

      {/* Tiny village silhouette on distant hill */}
      <rect x="580" y="205" width="6" height="8" fill="#a05a3a" opacity="0.45" />
      <path d="M579,205 L583,200 L587,205 Z" fill="#a05a3a" opacity="0.45" />
      <rect x="590" y="203" width="5" height="10" fill="#a05a3a" opacity="0.4" />
      <path d="M589,203 L592.5,198 L596,203 Z" fill="#a05a3a" opacity="0.4" />
      <rect x="600" y="206" width="4" height="7" fill="#a05a3a" opacity="0.38" />
      <path d="M599,206 L602,202 L605,206 Z" fill="#a05a3a" opacity="0.38" />

      {/* Mid terraced golden stone hills */}
      <path
        d="M0,280 C100,265 220,275 360,260 C500,248 640,272 780,255
           C880,245 960,265 1000,258
           L1000,500 L0,500 Z"
        fill="#d4b47a" opacity="0.6"
      />
      {/* Terrace lines */}
      <path d="M150,272 L350,262" stroke="#c0a468" strokeWidth="0.8" fill="none" opacity="0.2" />
      <path d="M500,260 L720,252" stroke="#c0a468" strokeWidth="0.8" fill="none" opacity="0.18" />

      {/* Near warm hills */}
      <path
        d="M0,330 C120,315 260,325 400,310 C540,298 680,320 820,305
           C920,296 1000,315 1000,315
           L1000,500 L0,500 Z"
        fill="#c4a468" opacity="0.7"
      />
    </svg>
  );
}

function StonePine({ x, baseY, height, canopyW, delay }) {
  const trunkH = height;
  const canopyTop = baseY - trunkH;
  const cw = canopyW || 8;
  return (
    <g className="tree-sway"
      style={{ transformOrigin: `${x}% ${baseY}%`, animationDelay: `${delay}ms` }}>
      {/* Tall bare trunk */}
      <rect x={x - 0.5 + '%'} y={canopyTop + trunkH * 0.15 + '%'}
        width="1%" height={trunkH * 0.85 + '%'}
        rx="0.15%" fill="var(--biome-trunk, #6a4a2a)" opacity="0.85" />
      {/* Flat umbrella canopy — THE parasol shape */}
      <ellipse cx={x + '%'} cy={canopyTop + 2 + '%'}
        rx={cw / 2 + '%'} ry="2.2%"
        fill="var(--biome-canopy, #2a5a2a)" opacity="0.82" />
      <ellipse cx={x + '%'} cy={canopyTop + 1 + '%'}
        rx={cw / 2 - 0.5 + '%'} ry="1.5%"
        fill="var(--biome-canopy, #2a5a2a)" opacity="0.75" />
    </g>
  );
}

function OliveTree({ x, baseY, delay }) {
  const trunkH = 16;
  const canopyTop = baseY - trunkH;
  return (
    <g className="tree-sway"
      style={{ transformOrigin: `${x}% ${baseY}%`, animationDelay: `${delay}ms` }}>
      {/* Gnarled twisted trunk */}
      <path
        d={`M${x - 0.8} ${baseY} Q${x - 1.5} ${baseY - trunkH * 0.4} ${x - 0.5} ${baseY - trunkH * 0.6}
            Q${x + 0.5} ${baseY - trunkH * 0.8} ${x + 0.2} ${baseY - trunkH}
            L${x + 1} ${baseY - trunkH}
            Q${x + 1.5} ${baseY - trunkH * 0.7} ${x + 1.2} ${baseY - trunkH * 0.4}
            L${x + 0.8} ${baseY} Z`}
        fill="#7a6a5a" opacity="0.8" />
      {/* Small silver-green leaf canopy */}
      <ellipse cx={x + '%'} cy={canopyTop + 2 + '%'}
        rx="3.5%" ry="2.5%" fill="#8a9a6a" opacity="0.65" />
      <ellipse cx={x + 1 + '%'} cy={canopyTop + 0.5 + '%'}
        rx="2.5%" ry="1.8%" fill="#8a9a6a" opacity="0.6" />
    </g>
  );
}

export function MedMidground() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100"
      preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
      {/* Dry stone wall — warm, low profile */}
      {[25, 28, 31, 34, 37, 40, 43, 46, 49, 52, 55, 58, 61, 64].map((sx, i) => (
        <rect key={`sw-${i}`}
          x={sx + (i % 2) * 0.2 + '%'}
          y={82 - (i % 3) * 0.2 + '%'}
          width={1.8 + (i % 2) * 0.3 + '%'}
          height={0.7 + (i % 3) * 0.15 + '%'}
          rx="0.1%"
          fill="#b0a07a"
          opacity={0.45 + (i % 3) * 0.08} />
      ))}

      {/* Lavender bushes — summer detail */}
      <g style={{ opacity: 'var(--seasonal-summer-detail-opacity, 0.3)' }}>
        {[15, 42, 70, 88].map((lx, i) => (
          <ellipse key={`lav-${i}`}
            cx={lx + '%'} cy={83.5 + (i % 2) * 0.3 + '%'}
            rx="2%" ry="0.9%"
            fill="#8a6a8a" opacity="0.55" />
        ))}
      </g>

      {/* Stone pines */}
      <StonePine x={12} baseY={83} height={38} canopyW={9} delay={0} />
      <StonePine x={48} baseY={82} height={42} canopyW={10} delay={180} />
      <StonePine x={78} baseY={83} height={36} canopyW={8} delay={100} />

      {/* Olive trees */}
      <OliveTree x={30} baseY={83} delay={80} />
      <OliveTree x={62} baseY={82} delay={240} />
    </svg>
  );
}

export function MedForeground() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100"
      preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
      {/* Dry earth ground */}
      <path
        d="M0,89.5 C10,88.8 20,89.5 30,89 C40,89.5 50,88.8 60,89.2
           C70,88.8 80,89.5 90,89 C95,89.3 100,89 100,89
           L100,100 L0,100 Z"
        fill="var(--biome-fg-ground, #8a7a5a)" />

      {/* Rocks and gravel texture */}
      {[12, 28, 45, 60, 75, 88].map((rx, i) => (
        <ellipse key={`gr-${i}`}
          cx={rx + '%'} cy={91 + (i % 3) * 0.5 + '%'}
          rx={0.6 + (i % 2) * 0.3 + '%'} ry="0.3%"
          fill="#7a6a4a" opacity={0.35 + (i % 3) * 0.08} />
      ))}

      {/* Sparse grass tufts */}
      {[8, 35, 55, 82].map((gx, i) => (
        <path key={`sg-${i}`}
          d={`M${gx} ${90 + (i % 2) * 0.3} L${gx + 0.15} ${88.8} L${gx + 0.3} ${90 + (i % 2) * 0.3}`}
          fill="#7a8a4a" opacity="0.4" />
      ))}

      {/* Framing stone pine trunk — left */}
      <rect x="0%" y="25%" width="1.5%" height="75%" rx="0.2%"
        fill="#3a2a1a" opacity="0.9" />
      {/* Partial canopy */}
      <ellipse cx="0%" cy="26%" rx="5%" ry="3%" fill="#1a3a1a" opacity="0.85" />
      <ellipse cx="3%" cy="24%" rx="4%" ry="2.5%" fill="#1a3a1a" opacity="0.8" />

      {/* Faded Mediterranean blue shutter — bottom-right */}
      <rect x="84%" y="90%" width="5%" height="7%" rx="0.2%"
        fill="#5a7a8a" opacity="0.6" />
      {/* Shutter slats */}
      <line x1="84.5%" y1="91.5%" x2="88.5%" y2="91.5%" stroke="#4a6a7a" strokeWidth="0.1%" opacity="0.35" />
      <line x1="84.5%" y1="93%" x2="88.5%" y2="93%" stroke="#4a6a7a" strokeWidth="0.1%" opacity="0.35" />
      <line x1="84.5%" y1="94.5%" x2="88.5%" y2="94.5%" stroke="#4a6a7a" strokeWidth="0.1%" opacity="0.35" />
    </svg>
  );
}
