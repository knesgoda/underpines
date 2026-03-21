/**
 * PacificNorthwest.jsx — PNW biome scene components for CabinScene.
 *
 * Exports: PNWBackground (Layer 2), PNWMidground (Layer 5), PNWForeground (Layer 8)
 *
 * Everything reads from CSS custom properties (--biome-*) so the weather,
 * solar, and seasonal systems work without modification.
 */

// ─── PNWBackground (Layer 2) ───
// Cascade mountain silhouette, forested hills, misty valley
export function PNWBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1000 333"
      preserveAspectRatio="none"
      style={{ pointerEvents: 'none' }}
    >
      {/* Cascade mountain range — jagged peaks */}
      <path
        d="M0,180 L30,165 L55,120 L70,145 L100,90 L120,130 L155,70 L175,110
           L210,55 L235,100 L260,80 L290,130 L320,95 L345,140 L370,105
           L400,65 L430,120 L455,85 L480,140 L510,100 L540,60 L565,110
           L590,75 L620,130 L650,90 L680,55 L710,100 L740,70 L770,120
           L800,85 L830,130 L860,95 L890,140 L920,110 L950,135 L980,120
           L1000,150 L1000,333 L0,333 Z"
        fill="var(--biome-bg-far, #4a6a7a)"
        opacity="0.7"
      />

      {/* Snow caps on tallest peaks */}
      <path
        d="M155,70 L145,95 L165,95 Z"
        fill="#e8f0f8" opacity="0.9"
      />
      <path
        d="M210,55 L198,82 L222,82 Z"
        fill="#e8f0f8" opacity="0.9"
      />
      <path
        d="M400,65 L388,90 L412,90 Z"
        fill="#e8f0f8" opacity="0.85"
      />
      <path
        d="M540,60 L528,85 L552,85 Z"
        fill="#e8f0f8" opacity="0.9"
      />
      <path
        d="M680,55 L668,82 L692,82 Z"
        fill="#e8f0f8" opacity="0.85"
      />

      {/* Misty valley band between mountains and hills */}
      <rect x="0" y="155" width="1000" height="30" fill="#ffffff" opacity="0.12" />

      {/* Forested hills — far layer */}
      <path
        d="M0,200 C60,178 120,192 200,175 C280,158 340,185 440,170
           C540,155 600,180 700,165 C800,150 880,175 1000,160
           L1000,333 L0,333 Z"
        fill="var(--biome-bg-mid, #1a4a2a)"
        opacity="0.85"
      />

      {/* Forested hills — near layer */}
      <path
        d="M0,230 C80,212 160,225 260,210 C360,195 440,220 540,205
           C640,190 740,215 840,200 C920,188 960,210 1000,200
           L1000,333 L0,333 Z"
        fill="var(--biome-bg-near, #2a5c3a)"
        opacity="0.9"
      />

      {/* Second misty valley — subtle depth */}
      <rect x="0" y="195" width="1000" height="18" fill="#ffffff" opacity="0.08" />
    </svg>
  );
}


// ─── PNWMidground (Layer 5) ───
// Douglas firs, Western red cedars, sword ferns, moss

// Tree definitions — each has position, type, scale, delay
const MID_TREES = [
  { x: 5,  type: 'fir', h: 68, delay: 0 },
  { x: 15, type: 'cedar', h: 55, delay: 180 },
  { x: 28, type: 'fir', h: 72, delay: 90 },
  { x: 42, type: 'fir', h: 60, delay: 270 },
  { x: 55, type: 'cedar', h: 50, delay: 150 },
  { x: 68, type: 'fir', h: 65, delay: 320 },
  { x: 78, type: 'fir', h: 58, delay: 60 },
  { x: 90, type: 'cedar', h: 52, delay: 200 },
];

function DouglasFir({ x, h, delay }) {
  // Tall, narrow, conical with distinctive drooping branches
  const trunkW = 2;
  const baseY = 95;
  const topY = baseY - h;
  const cx = x;
  const canopyW = h * 0.22;

  return (
    <g
      className="tree-sway"
      style={{
        transformOrigin: `${cx}% ${baseY}%`,
        animationDelay: `${delay}ms`,
      }}
    >
      {/* Trunk */}
      <rect
        x={cx - trunkW / 2 + '%'}
        y={topY + h * 0.6 + '%'}
        width={trunkW + '%'}
        height={h * 0.42 + '%'}
        rx="0.4%"
        fill="var(--biome-trunk, #3a2a1a)"
        opacity="0.85"
      />

      {/* Moss patches on trunk */}
      <rect
        x={cx - trunkW / 2 + 0.2 + '%'}
        y={topY + h * 0.7 + '%'}
        width="0.6%"
        height="3%"
        rx="0.2%"
        fill="var(--biome-accent, #7a9a3a)"
        opacity="0.5"
      />

      {/* Drooping branch layers — the PNW look */}
      {[0, 0.12, 0.22, 0.32, 0.42, 0.52, 0.62, 0.72].map((frac, i) => {
        const bY = topY + h * frac;
        const bW = canopyW * (0.3 + frac * 0.9);
        return (
          <path
            key={i}
            d={`M${cx} ${bY}
                Q${cx - bW * 0.3} ${bY + 1.5} ${cx - bW} ${bY + 2.5}
                Q${cx - bW * 0.5} ${bY + 1} ${cx} ${bY + 0.8}
                Q${cx + bW * 0.5} ${bY + 1} ${cx + bW} ${bY + 2.5}
                Q${cx + bW * 0.3} ${bY + 1.5} ${cx} ${bY} Z`}
            fill="var(--biome-canopy, #1f5c2e)"
            opacity={0.85 - i * 0.02}
            style={{ transformOrigin: `${cx}% ${bY}%` }}
          />
        );
      })}
    </g>
  );
}

function WesternRedCedar({ x, h, delay }) {
  const baseY = 95;
  const topY = baseY - h;
  const cx = x;
  const canopyW = h * 0.3;

  return (
    <g
      className="tree-sway"
      style={{
        transformOrigin: `${cx}% ${baseY}%`,
        animationDelay: `${delay}ms`,
      }}
    >
      {/* Trunk */}
      <rect
        x={cx - 1.2 + '%'}
        y={topY + h * 0.5 + '%'}
        width="2.4%"
        height={h * 0.52 + '%'}
        rx="0.5%"
        fill="var(--biome-trunk, #3a2a1a)"
        opacity="0.8"
      />

      {/* Broader layered canopy */}
      {[0, 0.1, 0.2, 0.32, 0.45, 0.58].map((frac, i) => {
        const bY = topY + h * frac;
        const bW = canopyW * (0.35 + frac * 1.1);
        return (
          <ellipse
            key={i}
            cx={cx + '%'}
            cy={bY + 1.5 + '%'}
            rx={bW + '%'}
            ry={2.8 + i * 0.3 + '%'}
            fill="#2d6b3a"
            opacity={0.82 - i * 0.03}
          />
        );
      })}
    </g>
  );
}

function SwordFernCluster({ x, baseY }) {
  // Small frond-shaped SVG elements
  return (
    <g style={{ opacity: 'var(--seasonal-detail-opacity, 1)' }}>
      {[-2.5, -1, 0.5, 2].map((offset, i) => (
        <path
          key={i}
          d={`M${x + offset} ${baseY}
              Q${x + offset - 1} ${baseY - 2.5} ${x + offset - 0.5} ${baseY - 4}
              Q${x + offset + 0.3} ${baseY - 3} ${x + offset} ${baseY} Z`}
          fill="#3a8a4a"
          opacity={0.7 + i * 0.05}
          style={{
            transform: `rotate(${(i - 1.5) * 15}deg)`,
            transformOrigin: `${x + offset}% ${baseY}%`,
          }}
        />
      ))}
    </g>
  );
}

export function PNWMidground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ pointerEvents: 'none' }}
    >
      {MID_TREES.map((t, i) =>
        t.type === 'fir'
          ? <DouglasFir key={i} x={t.x} h={t.h} delay={t.delay} />
          : <WesternRedCedar key={i} x={t.x} h={t.h} delay={t.delay} />
      )}

      {/* Sword fern clusters at tree bases */}
      <SwordFernCluster x={6} baseY={94} />
      <SwordFernCluster x={29} baseY={93} />
      <SwordFernCluster x={56} baseY={94} />
      <SwordFernCluster x={79} baseY={93} />
    </svg>
  );
}


// ─── PNWForeground (Layer 8) ───
// Large framing fir, mossy ground, fallen log, mushrooms

export function PNWForeground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ pointerEvents: 'none' }}
    >
      {/* Ground plane — rich mossy green with textured edge */}
      <path
        d="M0,92 C8,90.5 16,91.5 24,90 C32,91 40,89.5 48,91 C56,90 64,91.5 72,90.5
           C80,91 88,90 96,91 L100,90.5 L100,100 L0,100 Z"
        fill="var(--biome-fg-ground, #1a3a1a)"
      />

      {/* Fern fronds along ground edge */}
      {[8, 20, 35, 52, 65, 82].map((fx, i) => (
        <path
          key={`fern-${i}`}
          d={`M${fx} 91 Q${fx - 1.5} 88 ${fx - 0.5} 86
              Q${fx + 0.5} 88.5 ${fx} 91 Z`}
          fill="#3a8a4a"
          opacity={0.6 + (i % 3) * 0.1}
          style={{ opacity: 'var(--seasonal-detail-opacity, 0.7)' }}
        />
      ))}

      {/* Large framing Douglas fir — left edge */}
      <rect x="0" y="20" width="4" height="80" rx="1" fill="#0a2a0a" opacity="0.95" />
      {/* Partial canopy — drooping branches from left */}
      {[22, 30, 38, 46, 55, 64].map((by, i) => (
        <path
          key={`fg-branch-${i}`}
          d={`M0 ${by} Q${4 + i * 1.2} ${by - 1} ${6 + i * 2} ${by + 1.5}
              Q${3 + i * 0.8} ${by + 0.5} 0 ${by + 1} Z`}
          fill="#0a2a0a"
          opacity={0.88 - i * 0.04}
        />
      ))}

      {/* Fallen log — bottom-right, partially moss-covered */}
      <path
        d="M55,96 Q62,94.5 72,95 Q82,94 92,95.5 Q95,96 95,97
           Q90,97.5 82,97 Q72,97.5 62,97 Q56,97 55,96 Z"
        fill="var(--biome-trunk, #3a2a1a)"
        opacity="0.7"
      />
      {/* Moss on log */}
      <path
        d="M60,95.5 Q67,95 75,95.3 Q82,94.8 88,95.5"
        fill="none"
        stroke="var(--biome-accent, #7a9a3a)"
        strokeWidth="0.8"
        opacity="0.5"
      />

      {/* Small mushroom shapes — autumn detail */}
      {[62, 74, 86].map((mx, i) => (
        <g key={`mush-${i}`} style={{ opacity: 'var(--seasonal-autumn-detail-opacity, 0)' }}>
          <rect x={mx - 0.15 + '%'} y="94.5%" width="0.3%" height="1.5%" rx="0.1%" fill="#c8a080" opacity="0.7" />
          <ellipse cx={mx + '%'} cy="94.5%" rx="0.6%" ry="0.3%" fill="#d4a060" opacity="0.75" />
        </g>
      ))}
    </svg>
  );
}
