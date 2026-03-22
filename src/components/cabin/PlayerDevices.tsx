interface DeviceProps {
  playing: boolean;
  accent: string;
  cardBg: string;
  background: string;
}

/* ─── Radio ─── */
export const RadioSVG = ({ playing, accent, cardBg, background }: DeviceProps) => (
  <svg viewBox="0 0 160 120" width="160" height="120" className="drop-shadow-sm">
    <rect x="10" y="20" width="140" height="90" rx="16" ry="16"
      fill={cardBg} stroke={accent} strokeWidth="2" opacity="0.9" />
    <rect x="18" y="28" width="124" height="74" rx="10" ry="10"
      fill={background} opacity="0.5" />
    <g opacity={playing ? 1 : 0.5}>
      {[0,1,2,3,4,5,6].map(i => (
        <line key={i} x1="30" y1={38+i*8} x2="90" y2={38+i*8}
          stroke={accent} strokeWidth="1.5" strokeLinecap="round" opacity={0.4}>
          {playing && <animate attributeName="opacity" values="0.3;0.6;0.3" dur={`${1.2+i*0.15}s`} repeatCount="indefinite"/>}
        </line>
      ))}
    </g>
    <rect x="102" y="34" width="34" height="20" rx="4"
      fill={playing ? accent : background} opacity={playing ? 0.8 : 0.3}>
      {playing && <animate attributeName="opacity" values="0.6;0.9;0.6" dur="2s" repeatCount="indefinite"/>}
    </rect>
    <line x1="110" y1="40" x2="128" y2="40" stroke={cardBg} strokeWidth="1" opacity="0.6"/>
    {playing && (
      <ellipse cx="119" cy="44" rx="22" ry="14" fill={accent} opacity="0.15">
        <animate attributeName="opacity" values="0.08;0.18;0.08" dur="2s" repeatCount="indefinite"/>
      </ellipse>
    )}
    <circle cx="108" cy="76" r="7" fill={background} stroke={accent} strokeWidth="1.5" opacity="0.7"/>
    <circle cx="108" cy="76" r="2" fill={accent} opacity="0.5"/>
    <circle cx="130" cy="76" r="7" fill={background} stroke={accent} strokeWidth="1.5" opacity="0.7"/>
    <circle cx="130" cy="76" r="2" fill={accent} opacity="0.5"/>
    <line x1="45" y1="20" x2="35" y2="5" stroke={accent} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    <circle cx="35" cy="5" r="2" fill={accent} opacity="0.4"/>
    {playing && (
      <ellipse cx="60" cy="58" rx="30" ry="22" fill={accent} opacity="0.06">
        <animate attributeName="rx" values="28;32;28" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="ry" values="20;24;20" dur="1.5s" repeatCount="indefinite"/>
      </ellipse>
    )}
  </svg>
);

/* ─── Walkman ─── */
export const WalkmanSVG = ({ playing, accent, cardBg, background }: DeviceProps) => (
  <svg viewBox="0 0 140 160" width="130" height="150" className="drop-shadow-sm">
    {/* Body */}
    <rect x="10" y="10" width="120" height="140" rx="12" ry="12"
      fill={cardBg} stroke={accent} strokeWidth="2" opacity="0.9"/>
    {/* Cassette window */}
    <rect x="22" y="22" width="96" height="56" rx="6" ry="6"
      fill={background} stroke={accent} strokeWidth="1" opacity="0.6"/>
    {/* Cassette body inside window */}
    <rect x="28" y="30" width="84" height="40" rx="4" ry="4"
      fill={cardBg} stroke={accent} strokeWidth="0.8" opacity="0.7"/>
    {/* Tape window */}
    <rect x="42" y="36" width="56" height="20" rx="3"
      fill={background} opacity="0.4"/>
    {/* Left spool */}
    <circle cx="55" cy="46" r="8" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.6">
      {playing && <animateTransform attributeName="transform" type="rotate" from="0 55 46" to="360 55 46" dur="2s" repeatCount="indefinite"/>}
    </circle>
    <circle cx="55" cy="46" r="3" fill={accent} opacity="0.4"/>
    {/* Spool teeth */}
    {[0,1,2].map(i => (
      <line key={`ls${i}`} x1="55" y1={42} x2="55" y2={38}
        stroke={accent} strokeWidth="0.8" opacity="0.5"
        transform={`rotate(${i*120} 55 46)`}>
        {playing && <animateTransform attributeName="transform" type="rotate" from={`${i*120} 55 46`} to={`${i*120+360} 55 46`} dur="2s" repeatCount="indefinite" additive="replace"/>}
      </line>
    ))}
    {/* Right spool */}
    <circle cx="85" cy="46" r="8" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.6">
      {playing && <animateTransform attributeName="transform" type="rotate" from="0 85 46" to="360 85 46" dur="2s" repeatCount="indefinite"/>}
    </circle>
    <circle cx="85" cy="46" r="3" fill={accent} opacity="0.4"/>
    {/* Tape between spools */}
    <line x1="63" y1="46" x2="77" y2="46" stroke={accent} strokeWidth="0.5" opacity="0.3"/>
    {/* Label area */}
    <rect x="38" y="58" width="64" height="8" rx="2" fill={accent} opacity="0.15"/>
    {/* Buttons */}
    {[0,1,2,3,4].map(i => (
      <rect key={`btn${i}`} x={26+i*20} y="90" width="14" height="10" rx="2"
        fill={i === 2 && playing ? accent : background}
        stroke={accent} strokeWidth="1" opacity={i === 2 && playing ? 0.8 : 0.5}/>
    ))}
    {/* Play triangle on center button */}
    <polygon points="63,92 63,98 68,95" fill={playing ? cardBg : accent} opacity={playing ? 0.9 : 0.4}/>
    {/* Volume wheel */}
    <rect x="30" y="112" width="80" height="6" rx="3"
      fill={background} stroke={accent} strokeWidth="0.8" opacity="0.4"/>
    <circle cx={playing ? 80 : 50} cy="115" r="4" fill={accent} opacity="0.6"/>
    {/* Headphone jack */}
    <circle cx="70" cy="135" r="3" fill={background} stroke={accent} strokeWidth="1" opacity="0.4"/>
    {/* Belt clip */}
    <rect x="55" y="5" width="30" height="8" rx="2" fill={accent} opacity="0.2"/>
  </svg>
);

/* ─── Discman ─── */
export const DiscmanSVG = ({ playing, accent, cardBg, background }: DeviceProps) => (
  <svg viewBox="0 0 160 140" width="150" height="130" className="drop-shadow-sm">
    {/* Body - round */}
    <ellipse cx="80" cy="70" rx="70" ry="60" fill={cardBg} stroke={accent} strokeWidth="2" opacity="0.9"/>
    {/* Lid - semi-transparent */}
    <ellipse cx="80" cy="65" rx="58" ry="48" fill={background} stroke={accent} strokeWidth="1" opacity="0.35"/>
    {/* CD disc */}
    <g>
      {playing && <animateTransform attributeName="transform" type="rotate" from="0 80 65" to="360 80 65" dur="3s" repeatCount="indefinite"/>}
      <circle cx="80" cy="65" r="38" fill={background} stroke={accent} strokeWidth="0.8" opacity="0.5"/>
      {/* Rainbow sheen */}
      <circle cx="80" cy="65" r="36" fill="none" stroke="url(#discSheen)" strokeWidth="3" opacity={playing ? 0.5 : 0.2}/>
      {/* Tracks */}
      {[12,18,24,30].map(r => (
        <circle key={r} cx="80" cy="65" r={r} fill="none" stroke={accent} strokeWidth="0.3" opacity="0.15"/>
      ))}
      {/* Center hole */}
      <circle cx="80" cy="65" r="5" fill={cardBg} stroke={accent} strokeWidth="1" opacity="0.7"/>
      <circle cx="80" cy="65" r="2" fill={accent} opacity="0.3"/>
      {/* Label ring */}
      <circle cx="80" cy="65" r="10" fill="none" stroke={accent} strokeWidth="0.5" opacity="0.25"/>
    </g>
    {/* Shimmer gradient */}
    <defs>
      <linearGradient id="discSheen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#e879f9" stopOpacity="0.4"/>
        <stop offset="25%" stopColor="#22d3ee" stopOpacity="0.3"/>
        <stop offset="50%" stopColor="#a3e635" stopOpacity="0.3"/>
        <stop offset="75%" stopColor="#fb923c" stopOpacity="0.3"/>
        <stop offset="100%" stopColor="#e879f9" stopOpacity="0.4"/>
      </linearGradient>
    </defs>
    {/* Play indicator light */}
    <circle cx="130" cy="105" r="3" fill={playing ? '#22c55e' : accent} opacity={playing ? 0.8 : 0.2}>
      {playing && <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.5s" repeatCount="indefinite"/>}
    </circle>
    {/* Buttons */}
    <circle cx="40" cy="110" r="5" fill={background} stroke={accent} strokeWidth="1" opacity="0.5"/>
    <circle cx="56" cy="115" r="5" fill={background} stroke={accent} strokeWidth="1" opacity="0.5"/>
    {/* Anti-skip label */}
    <text x="80" y="125" textAnchor="middle" fontSize="5" fill={accent} opacity="0.2" fontFamily="system-ui">ANTI-SKIP</text>
    {/* Hinge */}
    <line x1="20" y1="70" x2="20" y2="60" stroke={accent} strokeWidth="1.5" opacity="0.3" strokeLinecap="round"/>
  </svg>
);

/* ─── MP3 Player (iPod-style) ─── */
export const MP3PlayerSVG = ({ playing, accent, cardBg, background, songTitle }: DeviceProps & { songTitle?: string }) => {
  const displayText = songTitle || 'No track';
  return (
    <svg viewBox="0 0 100 170" width="95" height="162" className="drop-shadow-sm">
      {/* Body */}
      <rect x="5" y="5" width="90" height="160" rx="14" ry="14"
        fill={cardBg} stroke={accent} strokeWidth="2" opacity="0.9"/>
      {/* Chrome bezel */}
      <rect x="10" y="10" width="80" height="150" rx="11" ry="11"
        fill="none" stroke={accent} strokeWidth="0.5" opacity="0.3"/>
      {/* Screen */}
      <rect x="15" y="18" width="70" height="48" rx="4" ry="4"
        fill={background} stroke={accent} strokeWidth="0.8" opacity="0.6"/>
      {/* Screen content */}
      <rect x="18" y="21" width="64" height="42" rx="2" fill={playing ? background : cardBg} opacity="0.3"/>
      {/* Status bar */}
      <line x1="20" y1="28" x2="78" y2="28" stroke={accent} strokeWidth="0.5" opacity="0.2"/>
      {/* Now Playing icon */}
      {playing && (
        <g opacity="0.5">
          <rect x="22" y="23" width="2" height="3" fill={accent}><animate attributeName="height" values="2;4;2" dur="0.6s" repeatCount="indefinite"/></rect>
          <rect x="25" y="22" width="2" height="4" fill={accent}><animate attributeName="height" values="3;5;3" dur="0.5s" repeatCount="indefinite"/></rect>
          <rect x="28" y="23" width="2" height="3" fill={accent}><animate attributeName="height" values="2;4;2" dur="0.7s" repeatCount="indefinite"/></rect>
        </g>
      )}
      {/* Scrolling track name */}
      <clipPath id="screenClip"><rect x="20" y="32" width="60" height="14"/></clipPath>
      <g clipPath="url(#screenClip)">
        <text y="42" fontSize="8" fill={accent} opacity={playing ? 0.7 : 0.35} fontFamily="system-ui" fontWeight="500">
          {playing ? (
            <animate attributeName="x" from="80" to={-displayText.length * 5} dur={`${Math.max(3, displayText.length * 0.3)}s`} repeatCount="indefinite"/>
          ) : null}
          {!playing && <tspan x="22">{displayText.slice(0, 12)}</tspan>}
          {playing && displayText}
        </text>
      </g>
      {/* Progress bar */}
      <rect x="22" y="50" width="56" height="2" rx="1" fill={accent} opacity="0.15"/>
      {playing && (
        <rect x="22" y="50" width="0" height="2" rx="1" fill={accent} opacity="0.4">
          <animate attributeName="width" from="0" to="56" dur="30s" repeatCount="indefinite"/>
        </rect>
      )}
      {/* Click wheel */}
      <circle cx="50" cy="112" r="32" fill={background} stroke={accent} strokeWidth="1.5" opacity="0.5"/>
      <circle cx="50" cy="112" r="11" fill={cardBg} stroke={accent} strokeWidth="1" opacity="0.7"/>
      {/* Wheel labels */}
      <text x="50" y="87" textAnchor="middle" fontSize="5" fill={accent} opacity="0.3" fontFamily="system-ui">MENU</text>
      <text x="28" y="114" textAnchor="middle" fontSize="5" fill={accent} opacity="0.3" fontFamily="system-ui">◀◀</text>
      <text x="72" y="114" textAnchor="middle" fontSize="5" fill={accent} opacity="0.3" fontFamily="system-ui">▶▶</text>
      {/* Play/pause on center */}
      <text x="50" y="115" textAnchor="middle" fontSize="7" fill={accent} opacity="0.5" fontFamily="system-ui">
        {playing ? '❚❚' : '▶'}
      </text>
      <text x="50" y="140" textAnchor="middle" fontSize="5" fill={accent} opacity="0.3" fontFamily="system-ui">▶❚❚</text>
      {/* Headphone port */}
      <circle cx="50" cy="158" r="2.5" fill={background} stroke={accent} strokeWidth="0.8" opacity="0.3"/>
    </svg>
  );
};
