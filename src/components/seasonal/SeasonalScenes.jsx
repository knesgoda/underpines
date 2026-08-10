/**
 * SeasonalScenes.jsx — SVG scene illustrations for each Wheel of the Year event.
 * Each scene is a self-contained SVG that renders at the given width/height.
 * Moon scenes accept optional moonProps from getMoonSVGProps().
 */

import { getMoonSVGProps } from '@/lib/astronomyUtils';

// --- MOON RENDERING HELPER ---
// Renders an astronomically-accurate moon phase using two-arc shadow paths.
// Reference: the terminator (shadow edge) is an ellipse whose rx varies with
// cos(cyclePosition * 2π). The dark side is always a semicircle; the terminator
// curves inward (crescent) or outward (gibbous) to sculpt the shadow.

function MoonSVG({ cx, cy, r, moonProps, darkColor }) {
  const mp = moonProps || getMoonSVGProps(new Date());
  if (!mp.isVisible) return null;

  const { cyclePosition, illumination } = mp;
  const shadow = darkColor || '#1a1a2a';

  // Phase geometry
  const angle = cyclePosition * 2 * Math.PI;
  const k = Math.cos(angle); // +1 at new, -1 at full
  const terminatorRx = Math.abs(k) * r;
  const isWaxing = cyclePosition < 0.5;

  // Build shadow path with two arcs: outer semicircle + terminator
  const top = `${cx} ${cy - r}`;
  const bot = `${cx} ${cy + r}`;

  let shadowPath;
  if (isWaxing) {
    // Dark on left: outer arc sweeps counter-clockwise (left side)
    const outerArc = `A ${r} ${r} 0 1 0 ${bot}`;
    // Terminator: sweep direction flips at first quarter
    const termSweep = k >= 0 ? 1 : 0;
    const termArc = `A ${terminatorRx} ${r} 0 0 ${termSweep} ${top}`;
    shadowPath = `M ${top} ${outerArc} ${termArc} Z`;
  } else {
    // Dark on right: outer arc sweeps clockwise (right side)
    const outerArc = `A ${r} ${r} 0 1 1 ${bot}`;
    const termSweep = k >= 0 ? 0 : 1;
    const termArc = `A ${terminatorRx} ${r} 0 0 ${termSweep} ${top}`;
    shadowPath = `M ${top} ${outerArc} ${termArc} Z`;
  }

  // Unique IDs for this moon instance
  const uid = `moon-${cx}-${cy}`;

  return (
    <g>
      {/* Ambient glow */}
      <defs>
        <radialGradient id={`${uid}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#e8f0f8" stopOpacity={0.15 * illumination} />
          <stop offset="100%" stopColor="#e8f0f8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r * 2} fill={`url(#${uid}-glow)`} />

      {/* Moon disc */}
      <circle cx={cx} cy={cy} r={r} fill="#e8f0f8" />

      {/* Subtle crater marks — only visible when illuminated enough */}
      {illumination > 0.3 && (
        <g opacity={0.12 * illumination}>
          <circle cx={cx - r * 0.25} cy={cy - r * 0.15} r={r * 0.18} fill="#c0ccd4" />
          <circle cx={cx + r * 0.15} cy={cy + r * 0.25} r={r * 0.12} fill="#b8c8d0" />
          <circle cx={cx - r * 0.05} cy={cy + r * 0.4} r={r * 0.09} fill="#c4d0d8" />
          <circle cx={cx + r * 0.35} cy={cy - r * 0.3} r={r * 0.07} fill="#bcc8d4" />
          <circle cx={cx - r * 0.35} cy={cy + r * 0.1} r={r * 0.1} fill="#c0c8d0" />
        </g>
      )}

      {/* Phase shadow */}
      <path d={shadowPath} fill={shadow} opacity={0.94} />

      {/* Subtle limb darkening on the lit edge */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#c0d0e0" strokeWidth={0.5} opacity={0.3 * illumination} />
    </g>
  );
}

// --- SHARED HELPERS ---

function PineTree({ x, y, height, color, opacity = 0.8 }) {
  const w = height * 0.45;
  return (
    <g opacity={opacity}>
      <polygon
        points={`${x},${y - height} ${x - w / 2},${y - height * 0.25} ${x + w / 2},${y - height * 0.25}`}
        fill={color}
      />
      <polygon
        points={`${x},${y - height * 0.7} ${x - w * 0.6 / 2},${y - height * 0.05} ${x + w * 0.6 / 2},${y - height * 0.05}`}
        fill={color}
        opacity={0.8}
      />
      <rect x={x - 2.5} y={y - height * 0.08} width={5} height={height * 0.08} rx={1.5} fill="#5a3a1a" opacity={0.6} />
    </g>
  );
}

function Ground({ width, height, colorTop, colorBottom, y }) {
  const gY = y || height * 0.72;
  return (
    <rect x={0} y={gY} width={width} height={height - gY} fill={colorBottom} rx={0}>
      <animate attributeName="opacity" values="0.9;1;0.9" dur="8s" repeatCount="indefinite" />
    </rect>
  );
}

// --- SCENE 1: IMBOLC ---

function ImbolcScene({ width = 680, height = 280, moonProps }) {
  const groundY = height * 0.7;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      {/* Sky */}
      <defs>
        <linearGradient id="imbolc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dce8f0" />
          <stop offset="100%" stopColor="#e8f0e4" />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill="url(#imbolc-sky)" />

      {/* Moon */}
      <MoonSVG cx={width * 0.15} cy={height * 0.2} r={14} moonProps={moonProps} darkColor="#c8d8e0" />

      {/* Distant hills */}
      <ellipse cx={width * 0.3} cy={groundY} rx={width * 0.4} ry={40} fill="#d0d8cc" opacity={0.5} />
      <ellipse cx={width * 0.75} cy={groundY} rx={width * 0.35} ry={35} fill="#c8d4c0" opacity={0.4} />

      {/* Ground with snow patches */}
      <rect x={0} y={groundY} width={width} height={height - groundY} fill="#c8d8c0" />
      <ellipse cx={width * 0.2} cy={groundY + 20} rx={60} ry={8} fill="#f0f4f0" opacity={0.6} />
      <ellipse cx={width * 0.65} cy={groundY + 15} rx={80} ry={10} fill="#e8f0e8" opacity={0.5} />

      {/* Bare trees with hints of buds */}
      <PineTree x={width * 0.08} y={groundY} height={90} color="#8a9a80" opacity={0.6} />
      <PineTree x={width * 0.88} y={groundY} height={100} color="#90a088" opacity={0.55} />

      {/* Snowdrops — tiny white flowers */}
      {[0.3, 0.35, 0.42, 0.55, 0.6].map((px, i) => (
        <g key={i}>
          <line x1={width * px} y1={groundY} x2={width * px - 2} y2={groundY - 12} stroke="#6a8a5a" strokeWidth={1} />
          <circle cx={width * px - 2} cy={groundY - 14} r={2.5} fill="white" opacity={0.9} />
        </g>
      ))}

      {/* Candle in window — small warm glow */}
      <rect x={width * 0.48} y={groundY - 40} width={24} height={30} rx={2} fill="#d8d0c0" opacity={0.7} />
      <rect x={width * 0.49} y={groundY - 38} width={10} height={20} rx={1} fill="#f5f0e8" opacity={0.5} />
      <circle cx={width * 0.494 + 5} cy={groundY - 28} r={4} fill="#f8e8a0" opacity={0.8}>
        <animate attributeName="opacity" values="0.6;0.9;0.6" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

// --- SCENE 2: OSTARA ---

function OstaraScene({ width = 680, height = 280, moonProps }) {
  const groundY = height * 0.68;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ostara-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a8cce0" />
          <stop offset="100%" stopColor="#d8eec8" />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill="url(#ostara-sky)" />

      {/* Moon */}
      <MoonSVG cx={width * 0.12} cy={height * 0.18} r={12} moonProps={moonProps} darkColor="#b8d0c8" />

      {/* Rolling green hills */}
      <ellipse cx={width * 0.35} cy={groundY} rx={width * 0.5} ry={50} fill="#8ab84a" opacity={0.6} />
      <ellipse cx={width * 0.7} cy={groundY + 5} rx={width * 0.4} ry={40} fill="#7aaa3a" opacity={0.5} />

      {/* Ground */}
      <rect x={0} y={groundY} width={width} height={height - groundY} fill="#5a8a28" />

      {/* Budding tree */}
      <line x1={width * 0.6} y1={groundY} x2={width * 0.6} y2={groundY - 80} stroke="#6a4a2a" strokeWidth={4} />
      <line x1={width * 0.6} y1={groundY - 50} x2={width * 0.55} y2={groundY - 70} stroke="#6a4a2a" strokeWidth={2} />
      <line x1={width * 0.6} y1={groundY - 40} x2={width * 0.67} y2={groundY - 65} stroke="#6a4a2a" strokeWidth={2} />
      {/* Buds */}
      {[[0.55, -72], [0.67, -67], [0.6, -82]].map(([px, py], i) => (
        <circle key={i} cx={width * px} cy={groundY + py} r={3} fill="#c8e090" opacity={0.8} />
      ))}

      {/* Robin on a fence post */}
      <rect x={width * 0.78} y={groundY - 30} width={4} height={30} fill="#8a6a40" />
      <rect x={width * 0.75} y={groundY - 32} width={10} height={3} rx={1} fill="#7a5a30" />
      <circle cx={width * 0.78 + 2} cy={groundY - 38} r={5} fill="#a05030" />
      <circle cx={width * 0.78 + 2} cy={groundY - 43} r={3.5} fill="#5a3a20" />
      <circle cx={width * 0.78 + 3.5} cy={groundY - 44} r={1} fill="white" />

      {/* Spring flowers */}
      {[0.15, 0.25, 0.4, 0.5, 0.85].map((px, i) => (
        <g key={i}>
          <line x1={width * px} y1={groundY} x2={width * px} y2={groundY - 10} stroke="#4a8a2a" strokeWidth={1} />
          <circle cx={width * px} cy={groundY - 12} r={3} fill={i % 2 === 0 ? '#f0c8d0' : '#e8d060'} opacity={0.85} />
        </g>
      ))}
    </svg>
  );
}

// --- SCENE 3: BELTANE ---

function BeltaneScene({ width = 680, height = 280 }) {
  const groundY = height * 0.72;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="beltane-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1408" />
          <stop offset="100%" stopColor="#1a3010" />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill="url(#beltane-sky)" />

      {/* Stars */}
      {Array.from({ length: 12 }, (_, i) => (
        <circle key={i} cx={Math.random() * width} cy={Math.random() * height * 0.4} r={0.8} fill="white" opacity={0.3}>
          <animate attributeName="opacity" values="0.2;0.4;0.2" dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Ground */}
      <rect x={0} y={groundY} width={width} height={height - groundY} fill="#0a2008" />

      {/* Dark pines */}
      <PineTree x={width * 0.05} y={groundY} height={110} color="#0a2a08" opacity={0.7} />
      <PineTree x={width * 0.18} y={groundY} height={95} color="#0c2a0a" opacity={0.6} />
      <PineTree x={width * 0.82} y={groundY} height={105} color="#0a280a" opacity={0.65} />
      <PineTree x={width * 0.94} y={groundY} height={90} color="#0c2c0c" opacity={0.6} />

      {/* Bonfire */}
      <g>
        {/* Fire logs */}
        <line x1={width * 0.45} y1={groundY} x2={width * 0.55} y2={groundY - 8} stroke="#4a2a0a" strokeWidth={4} strokeLinecap="round" />
        <line x1={width * 0.55} y1={groundY} x2={width * 0.45} y2={groundY - 8} stroke="#3a2008" strokeWidth={4} strokeLinecap="round" />
        {/* Flames */}
        {[0, 1, 2, 3, 4].map(i => (
          <ellipse
            key={i}
            cx={width * 0.5 + (i - 2) * 6}
            cy={groundY - 20 - i * 8}
            rx={8 - i}
            ry={14 - i * 2}
            fill={i < 2 ? '#f07030' : i < 4 ? '#f0a030' : '#f8d060'}
            opacity={0.8}
          >
            <animate attributeName="ry" values={`${14 - i * 2};${16 - i * 2};${14 - i * 2}`} dur={`${0.8 + i * 0.2}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0.9;0.6" dur={`${1 + i * 0.3}s`} repeatCount="indefinite" />
          </ellipse>
        ))}
        {/* Fire glow */}
        <circle cx={width * 0.5} cy={groundY - 20} r={50} fill="#f07030" opacity={0.15}>
          <animate attributeName="opacity" values="0.1;0.2;0.1" dur="2s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* Hawthorn blossom — white dots on dark branches */}
      <line x1={width * 0.7} y1={groundY} x2={width * 0.72} y2={groundY - 50} stroke="#2a1a08" strokeWidth={3} />
      <line x1={width * 0.72} y1={groundY - 35} x2={width * 0.68} y2={groundY - 55} stroke="#2a1a08" strokeWidth={2} />
      {[0.68, 0.70, 0.73, 0.69].map((px, i) => (
        <circle key={i} cx={width * px} cy={groundY - 50 - i * 4} r={2} fill="white" opacity={0.7} />
      ))}
    </svg>
  );
}

// --- SCENE 4: LITHA ---

function LithaScene({ width = 680, height = 280 }) {
  const groundY = height * 0.7;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="litha-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0c840" />
          <stop offset="100%" stopColor="#f8e890" />
        </linearGradient>
        <radialGradient id="litha-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fff8d0" />
          <stop offset="70%" stopColor="#f0c840" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#f0c840" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={width} height={height} fill="url(#litha-sky)" />

      {/* Massive sun */}
      <circle cx={width * 0.5} cy={height * 0.08} r={80} fill="url(#litha-sun)" />
      <circle cx={width * 0.5} cy={height * 0.08} r={28} fill="#fff8d0" opacity={0.9} />

      {/* Rolling meadows */}
      <ellipse cx={width * 0.3} cy={groundY} rx={width * 0.5} ry={30} fill="#5aaa28" opacity={0.6} />
      <ellipse cx={width * 0.7} cy={groundY + 5} rx={width * 0.45} ry={25} fill="#4a9a20" opacity={0.5} />

      {/* Ground */}
      <rect x={0} y={groundY} width={width} height={height - groundY} fill="#3a7818" />

      {/* Lush pines */}
      <PineTree x={width * 0.06} y={groundY} height={100} color="#3a8818" opacity={0.7} />
      <PineTree x={width * 0.92} y={groundY} height={95} color="#3a8418" opacity={0.65} />

      {/* Wildflowers */}
      {[0.2, 0.3, 0.45, 0.55, 0.65, 0.75].map((px, i) => (
        <g key={i}>
          <line x1={width * px} y1={groundY} x2={width * px} y2={groundY - 8} stroke="#2a6a10" strokeWidth={1} />
          <circle cx={width * px} cy={groundY - 10} r={2.5} fill={['#f8f8a0', '#f0a060', '#e060a0', '#a0c0f0'][i % 4]} opacity={0.8} />
        </g>
      ))}

      {/* Fireflies */}
      {[0.25, 0.4, 0.55, 0.7, 0.8].map((px, i) => (
        <circle key={i} cx={width * px} cy={groundY - 30 - i * 15} r={1.5} fill="#f8f8a0" opacity={0.6}>
          <animate attributeName="opacity" values="0;0.8;0" dur={`${2 + i * 0.7}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

// --- SCENE 5: LAMMAS ---

function LammasScene({ width = 680, height = 280, moonProps }) {
  const groundY = height * 0.68;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lammas-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4a030" />
          <stop offset="100%" stopColor="#e8c870" />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill="url(#lammas-sky)" />

      {/* Harvest moon — large */}
      <MoonSVG cx={width * 0.15} cy={height * 0.2} r={28} moonProps={moonProps} darkColor="#c8a850" />

      {/* Late summer haze */}
      <rect x={0} y={height * 0.5} width={width} height={height * 0.2} fill="#e8c870" opacity={0.3} />

      {/* Ground — golden grain fields */}
      <rect x={0} y={groundY} width={width} height={height - groundY} fill="#906818" />
      <rect x={0} y={groundY} width={width} height={15} fill="#c89828" opacity={0.7} />

      {/* Wheat stalks */}
      {Array.from({ length: 20 }, (_, i) => {
        const px = 0.05 + i * 0.045;
        const h = 30 + Math.random() * 20;
        return (
          <g key={i}>
            <line x1={width * px} y1={groundY} x2={width * px + 2} y2={groundY - h} stroke="#b89028" strokeWidth={1.5} />
            <ellipse cx={width * px + 2} cy={groundY - h - 4} rx={2} ry={5} fill="#d0a830" opacity={0.8} />
          </g>
        );
      })}

      {/* Distant pines */}
      <PineTree x={width * 0.88} y={groundY} height={80} color="#7a6818" opacity={0.4} />
      <PineTree x={width * 0.95} y={groundY} height={70} color="#6a5810" opacity={0.35} />
    </svg>
  );
}

// --- SCENE 6: MABON ---

function MabonScene({ width = 680, height = 280, moonProps }) {
  const groundY = height * 0.7;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mabon-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#604028" />
          <stop offset="100%" stopColor="#8a6040" />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill="url(#mabon-sky)" />

      {/* Moon */}
      <MoonSVG cx={width * 0.8} cy={height * 0.15} r={22} moonProps={moonProps} darkColor="#402818" />

      {/* Ground */}
      <rect x={0} y={groundY} width={width} height={height - groundY} fill="#3a1808" />

      {/* Autumn trees with turning leaves */}
      {[
        { x: 0.15, h: 90, c: '#c04820' },
        { x: 0.35, h: 80, c: '#d06830' },
        { x: 0.55, h: 95, c: '#b03818' },
        { x: 0.75, h: 85, c: '#d08030' },
      ].map((t, i) => (
        <g key={i}>
          <line x1={width * t.x} y1={groundY} x2={width * t.x} y2={groundY - t.h} stroke="#4a2a10" strokeWidth={4} />
          <circle cx={width * t.x} cy={groundY - t.h - 10} r={22} fill={t.c} opacity={0.7} />
          <circle cx={width * t.x - 10} cy={groundY - t.h} r={16} fill={t.c} opacity={0.5} />
          <circle cx={width * t.x + 12} cy={groundY - t.h + 5} r={14} fill={t.c} opacity={0.55} />
        </g>
      ))}

      {/* Falling leaves */}
      {[0.2, 0.4, 0.5, 0.65, 0.8].map((px, i) => (
        <ellipse key={i} cx={width * px} cy={groundY - 10 - i * 20} rx={3} ry={2} fill="#d06020" opacity={0.6} transform={`rotate(${30 + i * 25} ${width * px} ${groundY - 10 - i * 20})`}>
          <animate attributeName="cy" values={`${groundY - 60 - i * 10};${groundY}`} dur={`${4 + i}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;0.3" dur={`${4 + i}s`} repeatCount="indefinite" />
        </ellipse>
      ))}
    </svg>
  );
}

// --- SCENE 7: SAMHAIN ---

function SamhainScene({ width = 680, height = 280, moonProps }) {
  const groundY = height * 0.72;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="samhain-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#050208" />
          <stop offset="100%" stopColor="#0a0414" />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill="url(#samhain-sky)" />

      {/* Faint stars */}
      {Array.from({ length: 8 }, (_, i) => (
        <circle key={i} cx={width * (0.1 + i * 0.1)} cy={height * (0.05 + Math.random() * 0.3)} r={0.6} fill="white" opacity={0.2}>
          <animate attributeName="opacity" values="0.1;0.3;0.1" dur={`${4 + i}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Moon */}
      <MoonSVG cx={width * 0.82} cy={height * 0.12} r={16} moonProps={moonProps} darkColor="#08040c" />

      {/* Ground */}
      <rect x={0} y={groundY} width={width} height={height - groundY} fill="#080410" />

      {/* Bare branches — spooky silhouettes */}
      {[0.1, 0.3, 0.7, 0.9].map((px, i) => (
        <g key={i} opacity={0.6}>
          <line x1={width * px} y1={groundY} x2={width * px} y2={groundY - 80 - i * 10} stroke="#140820" strokeWidth={3} />
          <line x1={width * px} y1={groundY - 50} x2={width * px - 15} y2={groundY - 75} stroke="#140820" strokeWidth={2} />
          <line x1={width * px} y1={groundY - 40} x2={width * px + 18} y2={groundY - 68} stroke="#140820" strokeWidth={1.5} />
          <line x1={width * px} y1={groundY - 60} x2={width * px + 10} y2={groundY - 85} stroke="#140820" strokeWidth={1} />
        </g>
      ))}

      {/* Ember glow on the ground */}
      <circle cx={width * 0.5} cy={groundY} r={30} fill="#ff6030" opacity={0.08}>
        <animate attributeName="opacity" values="0.05;0.12;0.05" dur="4s" repeatCount="indefinite" />
      </circle>
      {/* Small embers */}
      {[0.45, 0.48, 0.52, 0.55].map((px, i) => (
        <circle key={i} cx={width * px} cy={groundY - 2} r={1.5} fill="#ff6030" opacity={0.5}>
          <animate attributeName="opacity" values="0.3;0.7;0.3" dur={`${1.5 + i * 0.5}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Purple accent mist */}
      <ellipse cx={width * 0.5} cy={groundY - 10} rx={width * 0.4} ry={15} fill="#c04080" opacity={0.06} />
    </svg>
  );
}

// --- SCENE 8: YULE ---

function YuleScene({ width = 680, height = 280, moonProps }) {
  const groundY = height * 0.65;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="yule-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#040608" />
          <stop offset="100%" stopColor="#080c14" />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill="url(#yule-sky)" />

      {/* Bright stars */}
      {Array.from({ length: 20 }, (_, i) => (
        <circle key={i} cx={width * (0.05 + Math.random() * 0.9)} cy={height * Math.random() * 0.5} r={0.6 + Math.random() * 0.8} fill="white" opacity={0.5 + Math.random() * 0.3}>
          <animate attributeName="opacity" values={`${0.3 + Math.random() * 0.2};${0.6 + Math.random() * 0.3};${0.3 + Math.random() * 0.2}`} dur={`${2 + Math.random() * 3}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Moon */}
      <MoonSVG cx={width * 0.2} cy={height * 0.15} r={18} moonProps={moonProps} darkColor="#080c14" />

      {/* Snow ground */}
      <rect x={0} y={groundY} width={width} height={height - groundY} fill="#c8d8e8" />
      <rect x={0} y={groundY} width={width} height={8} fill="#e8f0f8" opacity={0.6} />

      {/* Snow-covered pines */}
      {[0.1, 0.25, 0.7, 0.88].map((px, i) => (
        <g key={i}>
          <PineTree x={width * px} y={groundY} height={80 + i * 10} color="#1a2a3a" opacity={0.7} />
          {/* Snow caps */}
          <polygon
            points={`${width * px},${groundY - (80 + i * 10)} ${width * px - 8},${groundY - (80 + i * 10) + 15} ${width * px + 8},${groundY - (80 + i * 10) + 15}`}
            fill="#e8f0f8"
            opacity={0.7}
          />
        </g>
      ))}

      {/* Candlelight — warm glow from a small cabin */}
      <rect x={width * 0.45} y={groundY - 32} width={30} height={28} rx={2} fill="#1a2a3a" opacity={0.8} />
      <polygon points={`${width * 0.44},${groundY - 32} ${width * 0.46 + 15},${groundY - 48} ${width * 0.44 + 32},${groundY - 32}`} fill="#1a2a3a" opacity={0.7} />
      {/* Window with warm light */}
      <rect x={width * 0.455} y={groundY - 26} width={10} height={12} rx={1} fill="#f8d870" opacity={0.7}>
        <animate attributeName="opacity" values="0.5;0.8;0.5" dur="4s" repeatCount="indefinite" />
      </rect>

      {/* Falling snow */}
      {Array.from({ length: 15 }, (_, i) => (
        <circle key={i} cx={width * (0.05 + Math.random() * 0.9)} cy={-5} r={1.5 + Math.random()} fill="white" opacity={0.6}>
          <animate attributeName="cy" values="-5;${height + 5}" dur={`${5 + Math.random() * 5}s`} repeatCount="indefinite" />
          <animate attributeName="cx" values={`${width * (0.05 + Math.random() * 0.9)};${width * (0.05 + Math.random() * 0.9) + 20}`} dur={`${5 + Math.random() * 5}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

// --- SCENE MAP ---

const SCENE_MAP = {
  imbolc: ImbolcScene,
  ostara: OstaraScene,
  beltane: BeltaneScene,
  litha: LithaScene,
  lammas: LammasScene,
  mabon: MabonScene,
  samhain: SamhainScene,
  yule: YuleScene,
};

// --- DEFAULT EXPORT ---

export default function SceneForEvent({ eventKey, width = 680, height = 280, moonProps }) {
  const Scene = SCENE_MAP[eventKey];
  if (!Scene) return null;
  return <Scene width={width} height={height} moonProps={moonProps} />;
}
