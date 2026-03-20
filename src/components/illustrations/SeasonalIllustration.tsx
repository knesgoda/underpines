interface SeasonalIllustrationProps {
  illustrationKey: string;
  className?: string;
}

const SeasonalIllustration = ({ illustrationKey, className = '' }: SeasonalIllustrationProps) => {
  switch (illustrationKey) {
    case 'winter_solstice':
      return <WinterSolstice className={className} />;
    case 'spring_equinox':
      return <SpringEquinox className={className} />;
    case 'summer_solstice':
      return <SummerSolstice className={className} />;
    case 'autumn_equinox':
      return <AutumnEquinox className={className} />;
    default:
      return <div className={`bg-muted ${className}`} />;
  }
};

const WinterSolstice = ({ className }: { className: string }) => (
  <svg viewBox="0 0 400 200" className={className} preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="ws-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0a0a1a" />
        <stop offset="100%" stopColor="#1a1040" />
      </linearGradient>
    </defs>
    <rect fill="url(#ws-sky)" width="400" height="200" />
    {/* Stars */}
    {[
      [30, 20], [80, 35], [150, 15], [220, 40], [280, 25], [350, 30],
      [60, 50], [130, 55], [190, 10], [310, 45], [370, 15], [100, 8],
    ].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r={i === 0 ? 2 : 1} fill="white" opacity={0.6 + Math.random() * 0.4}>
        <animate attributeName="opacity" values="0.4;1;0.4" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
      </circle>
    ))}
    {/* Bright star atop tallest pine */}
    <circle cx="200" cy="42" r="3" fill="#fef9c3">
      <animate attributeName="r" values="2.5;3.5;2.5" dur="3s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" />
    </circle>
    {/* Pine silhouettes */}
    <path d="M180 200 L200 50 L220 200 Z" fill="#0a1a0a" opacity="0.9" />
    <path d="M185 200 L200 70 L215 200 Z" fill="#0d1f0d" opacity="0.7" />
    <path d="M80 200 L100 90 L120 200 Z" fill="#0a1a0a" opacity="0.85" />
    <path d="M300 200 L320 80 L340 200 Z" fill="#0a1a0a" opacity="0.8" />
    <path d="M40 200 L55 110 L70 200 Z" fill="#0a1a0a" opacity="0.7" />
    <path d="M350 200 L365 100 L380 200 Z" fill="#0a1a0a" opacity="0.75" />
    {/* Cabin window glow */}
    <rect x="145" y="165" width="12" height="10" rx="1" fill="#fbbf24" opacity="0.8">
      <animate attributeName="opacity" values="0.7;0.9;0.7" dur="4s" repeatCount="indefinite" />
    </rect>
    <rect x="140" y="155" width="22" height="30" rx="2" fill="none" stroke="#1a1a0a" strokeWidth="1.5" />
    {/* Ground snow */}
    <path d="M0 185 Q100 175 200 185 Q300 178 400 185 L400 200 L0 200 Z" fill="#e2e8f0" opacity="0.3" />
  </svg>
);

const SpringEquinox = ({ className }: { className: string }) => (
  <svg viewBox="0 0 400 200" className={className} preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="se-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e0f2fe" />
        <stop offset="100%" stopColor="#fef3c7" />
      </linearGradient>
    </defs>
    <rect fill="url(#se-sky)" width="400" height="200" />
    {/* Mist layers */}
    <ellipse cx="200" cy="160" rx="250" ry="30" fill="white" opacity="0.2" />
    <ellipse cx="150" cy="170" rx="200" ry="20" fill="white" opacity="0.15" />
    {/* Trees with buds */}
    <path d="M100 200 L115 100 L130 200 Z" fill="#4ade80" opacity="0.5" />
    <path d="M105 200 L115 115 L125 200 Z" fill="#22c55e" opacity="0.4" />
    <path d="M250 200 L270 85 L290 200 Z" fill="#4ade80" opacity="0.45" />
    <path d="M255 200 L270 100 L285 200 Z" fill="#22c55e" opacity="0.35" />
    <path d="M50 200 L60 130 L70 200 Z" fill="#86efac" opacity="0.4" />
    <path d="M340 200 L355 110 L370 200 Z" fill="#86efac" opacity="0.45" />
    {/* Spring buds */}
    {[115, 117, 120, 270, 265, 275].map((x, i) => (
      <circle key={i} cx={x} cy={100 + i * 8} r="2.5" fill="#fbbf24" opacity="0.7">
        <animate attributeName="r" values="2;3;2" dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
      </circle>
    ))}
    {/* Bird silhouette */}
    <path d="M280 50 Q285 45 290 50 Q295 45 300 50" fill="none" stroke="#374151" strokeWidth="1.5" opacity="0.5">
      <animateTransform attributeName="transform" type="translate" values="0,0;5,-2;0,0" dur="4s" repeatCount="indefinite" />
    </path>
    {/* Ground */}
    <path d="M0 185 Q100 180 200 185 Q300 182 400 188 L400 200 L0 200 Z" fill="#86efac" opacity="0.3" />
  </svg>
);

const SummerSolstice = ({ className }: { className: string }) => (
  <svg viewBox="0 0 400 200" className={className} preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="ss-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fcd34d" />
        <stop offset="60%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#166534" />
      </linearGradient>
    </defs>
    <rect fill="url(#ss-sky)" width="400" height="200" />
    {/* Sun glow */}
    <circle cx="320" cy="40" r="30" fill="#fbbf24" opacity="0.3" />
    <circle cx="320" cy="40" r="18" fill="#fcd34d" opacity="0.6" />
    {/* Full canopy pines */}
    <path d="M60 200 L80 60 L100 200 Z" fill="#166534" opacity="0.85" />
    <path d="M65 200 L80 80 L95 200 Z" fill="#15803d" opacity="0.65" />
    <path d="M150 200 L175 55 L200 200 Z" fill="#166534" opacity="0.9" />
    <path d="M155 200 L175 75 L195 200 Z" fill="#15803d" opacity="0.7" />
    <path d="M240 200 L260 65 L280 200 Z" fill="#166534" opacity="0.8" />
    <path d="M350 200 L370 70 L390 200 Z" fill="#166534" opacity="0.75" />
    {/* Long shadows */}
    <path d="M80 200 L130 200 L80 190 Z" fill="#0a2e0a" opacity="0.15" />
    <path d="M175 200 L230 200 L175 185 Z" fill="#0a2e0a" opacity="0.15" />
    {/* Fireflies */}
    {[
      [120, 130], [200, 140], [300, 120], [180, 160], [350, 150], [70, 150],
    ].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="2" fill="#fde68a" opacity="0">
        <animate attributeName="opacity" values="0;0.9;0" dur={`${3 + i * 0.7}s`} begin={`${i * 0.8}s`} repeatCount="indefinite" />
      </circle>
    ))}
    {/* Ground */}
    <path d="M0 190 Q200 182 400 190 L400 200 L0 200 Z" fill="#052e16" opacity="0.6" />
  </svg>
);

const AutumnEquinox = ({ className }: { className: string }) => (
  <svg viewBox="0 0 400 200" className={className} preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="ae-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fcd34d" />
        <stop offset="50%" stopColor="#ea580c" />
        <stop offset="100%" stopColor="#7c2d12" />
      </linearGradient>
    </defs>
    <rect fill="url(#ae-sky)" width="400" height="200" />
    {/* Amber and red trees */}
    <path d="M80 200 L100 70 L120 200 Z" fill="#d97706" opacity="0.85" />
    <path d="M85 200 L100 90 L115 200 Z" fill="#ea580c" opacity="0.65" />
    <path d="M180 200 L200 60 L220 200 Z" fill="#dc2626" opacity="0.8" />
    <path d="M185 200 L200 80 L215 200 Z" fill="#b91c1c" opacity="0.6" />
    <path d="M280 200 L300 75 L320 200 Z" fill="#d97706" opacity="0.85" />
    <path d="M350 200 L365 90 L380 200 Z" fill="#ea580c" opacity="0.7" />
    <path d="M30 200 L45 110 L60 200 Z" fill="#92400e" opacity="0.6" />
    {/* Falling leaf */}
    <g>
      <animateTransform attributeName="transform" type="translate" values="0,0;15,60;30,120;20,180" dur="8s" repeatCount="indefinite" />
      <path d="M250 30 Q255 25 260 30 Q255 35 250 30" fill="#dc2626" opacity="0.8">
        <animateTransform attributeName="transform" type="rotate" values="0 255 30;45 255 30;-20 255 30;30 255 30" dur="8s" repeatCount="indefinite" />
      </path>
    </g>
    {/* Harvest light */}
    <rect x="0" y="0" width="400" height="200" fill="#fbbf24" opacity="0.08" />
    {/* Ground */}
    <path d="M0 188 Q100 183 200 188 Q300 184 400 190 L400 200 L0 200 Z" fill="#78350f" opacity="0.5" />
  </svg>
);

export default SeasonalIllustration;
