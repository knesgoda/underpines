/**
 * CompanionRenderer — Renders memorial companions in Layer 7,
 * ABOVE standard creature rendering.
 *
 * Handles three behavior types:
 *  - always_present: cycles position variants every few minutes
 *  - daily_visit: entrance → action → exit, once per day
 *  - passing_through: quick crossing, once per session
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { creatureMap } from '@/config/creatures';

// Import special memorial variants
import { DirectGazeWave, MincingTrot, AlwaysPresentHover } from './companions';

// Map movement_style → special component
const SPECIAL_VARIANTS = {
  direct_gaze_wave: DirectGazeWave,
  mincing_trot: MincingTrot,
};

// Import all creature components
import * as Common from './common';
import * as Uncommon from './uncommon';
import * as Rare from './rare';
import * as Legendary from './legendary';
import * as Mythical from './mythical';

const COMPONENT_MAP = {
  'rabbit': Common.Rabbit, 'raccoon': Common.Raccoon, 'badger': Common.Badger,
  'hedgehog': Common.Hedgehog, 'squirrel': Common.Squirrel, 'red-fox': Common.RedFox,
  'grey-fox': Common.GreyFox, 'finch': Common.Finch, 'hummingbird': Common.Hummingbird,
  'robin': Common.Robin, 'frog': Common.Frog, 'otter': Common.Otter,
  'beaver': Common.Beaver, 'fireflies': Common.Fireflies,
  'white-tailed-deer': Uncommon.WhiteTailedDeer, 'red-deer-stag': Uncommon.RedDeerStag,
  'elk': Uncommon.Elk, 'caribou': Uncommon.Caribou, 'moose': Uncommon.Moose,
  'brown-bear': Uncommon.BrownBear, 'black-bear': Uncommon.BlackBear,
  'coyote': Uncommon.Coyote, 'eagle': Uncommon.Eagle, 'hawk': Uncommon.Hawk,
  'owl': Uncommon.Owl, 'raven': Uncommon.Raven, 'salmon': Uncommon.Salmon,
  'wild-boar': Uncommon.WildBoar, 'stork': Uncommon.Stork, 'puffin': Uncommon.Puffin,
  'arctic-fox': Uncommon.ArcticFox, 'fennec-fox': Uncommon.FennecFox,
  'timberwolf': Rare.Timberwolf, 'grey-wolf': Rare.GreyWolf, 'red-wolf': Rare.RedWolf,
  'mountain-lion': Rare.MountainLion, 'lynx': Rare.Lynx, 'wolverine': Rare.Wolverine,
  'orca': Rare.Orca, 'whale': Rare.Whale, 'shark': Rare.Shark,
  'hippo': Rare.Hippo, 'rhino': Rare.Rhino, 'vulture': Rare.Vulture,
  'sasquatch': Legendary.Sasquatch, 'loch-ness-monster': Legendary.LochNessMonster,
  'yeti': Legendary.Yeti, 'dire-wolf': Legendary.DireWolf,
  'nuckelavee': Legendary.Nuckelavee, 'dragon': Legendary.Dragon,
  'wendigo': Legendary.Wendigo, 'kraken': Legendary.Kraken,
  'thunderbird': Legendary.Thunderbird, 'phoenix': Legendary.Phoenix,
  'fairy': Mythical.Fairy, 'leprechaun': Mythical.Leprechaun,
  'will-o-the-wisp': Mythical.WillOTheWisp, 'mermaid': Mythical.Mermaid,
  'selkie': Mythical.Selkie, 'ghost': Mythical.Ghost, 'witch': Mythical.Witch,
  'jackalope': Mythical.Jackalope, 'vampire': Mythical.Vampire,
  'werewolf': Mythical.Werewolf, 'banshee': Mythical.Banshee,
  'kelpie': Mythical.Kelpie, 'troll': Mythical.Troll, 'huldra': Mythical.Huldra,
  'puckwudgie': Mythical.Puckwudgie, 'zombie': Mythical.Zombie,
  'ghoul': Mythical.Ghoul, 'headless-horseman': Mythical.HeadlessHorseman,
};

// Inject companion-specific keyframes once
const animId = 'companion-anims';
if (typeof document !== 'undefined' && !document.getElementById(animId)) {
  const s = document.createElement('style');
  s.id = animId;
  s.textContent = `
@keyframes comp-cross-ltr{0%{transform:translateX(-10%);opacity:0}5%{opacity:1}95%{opacity:1}100%{transform:translateX(110%);opacity:0}}
@keyframes comp-cross-rtl{0%{transform:translateX(110%);opacity:0}5%{opacity:1}95%{opacity:1}100%{transform:translateX(-10%);opacity:0}}
@keyframes comp-visit-enter{0%{transform:translateX(-10%);opacity:0}15%{opacity:1}40%{transform:translateX(42%)}}
@keyframes comp-visit-action{0%{transform:translateX(42%)}25%{transform:translateX(44%) scale(1.03)}50%{transform:translateX(42%) scale(1)}75%{transform:translateX(43%)}100%{transform:translateX(42%)}}
@keyframes comp-visit-exit{0%{transform:translateX(42%);opacity:1}85%{opacity:0.8}100%{transform:translateX(110%);opacity:0}}
@keyframes comp-present-idle{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
@keyframes comp-present-shift{0%{transform:translateX(25%)}50%{transform:translateX(55%)}100%{transform:translateX(25%)}}
`;
  document.head.appendChild(s);
}

// ── Position variants for always_present ─────────────────────
const POSITION_VARIANTS = [
  { left: '20%', top: '70%' },
  { left: '50%', top: '68%' },
  { left: '75%', top: '72%' },
  { left: '35%', top: '74%' },
];

// ── Single companion renderer ────────────────────────────────
function SingleCompanion({ companion, onComplete, isRaining = false }) {
  const Component = COMPONENT_MAP[companion.creature_key];
  const creature = creatureMap[companion.creature_key];
  const SpecialVariant = companion.movement_style ? SPECIAL_VARIANTS[companion.movement_style] : null;
  const [phase, setPhase] = useState('idle'); // idle | entering | acting | exiting | done
  const [posVariant, setPosVariant] = useState(0);
  const timerRef = useRef(null);

  // Resolve direction
  const dir = useMemo(() => {
    if (companion.direction === 'random') {
      return Math.random() < 0.5 ? 'ltr' : 'rtl';
    }
    return companion.direction;
  }, [companion.direction]);

  // ── Special variant: always_present hummingbird hover ──
  if (companion.movement_style === 'always_present_hover' || 
      (companion.behavior === 'always_present' && companion.creature_key === 'hummingbird')) {
    return <AlwaysPresentHover isRaining={isRaining} />;
  }

  // ── Special variant: delegate to memorial-specific component ──
  if (SpecialVariant) {
    return (
      <SpecialVariant
        direction={dir}
        onComplete={() => onComplete?.(companion.id, companion.behavior)}
      />
    );
  }

  // ── always_present: cycle position every 3–5 min ──
  useEffect(() => {
    if (companion.behavior !== 'always_present') return;
    const cycle = () => {
      setPosVariant(v => (v + 1) % POSITION_VARIANTS.length);
    };
    const interval = (180 + Math.random() * 120) * 1000; // 3–5 min
    timerRef.current = setInterval(cycle, interval);
    return () => clearInterval(timerRef.current);
  }, [companion.behavior]);

  // ── daily_visit: entrance → action → exit sequence ──
  useEffect(() => {
    if (companion.behavior !== 'daily_visit') return;
    setPhase('entering');
    const enterDur = 4000;
    const actionDur = 5000;
    const exitDur = 3000;

    const t1 = setTimeout(() => setPhase('acting'), enterDur);
    const t2 = setTimeout(() => setPhase('exiting'), enterDur + actionDur);
    const t3 = setTimeout(() => {
      setPhase('done');
      onComplete?.(companion.id, 'daily_visit');
    }, enterDur + actionDur + exitDur);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [companion.behavior, companion.id, onComplete]);

  // ── passing_through: single crossing ──
  useEffect(() => {
    if (companion.behavior !== 'passing_through') return;
    setPhase('entering');
    const dur = (creature?.animationDuration || 8) * 1000 * 0.6; // quicker
    const t = setTimeout(() => {
      setPhase('done');
      onComplete?.(companion.id, 'passing_through');
    }, dur);
    return () => clearTimeout(t);
  }, [companion.behavior, companion.id, creature, onComplete]);

  if (!Component || !creature) return null;
  if (phase === 'done') return null;

  // ── Build style per behavior ──
  let containerStyle = {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: 8 + (companion.priority || 1), // above standard creature layer (7)
  };

  let wrapperStyle = { display: 'inline-block', willChange: 'transform' };
  let variant = posVariant % 3;

  if (companion.behavior === 'always_present') {
    const pos = POSITION_VARIANTS[posVariant];
    containerStyle = {
      ...containerStyle,
      left: pos.left,
      top: pos.top,
      transition: 'left 8s ease-in-out, top 8s ease-in-out',
    };
    wrapperStyle.animation = 'comp-present-idle 4s ease-in-out infinite';
  }

  if (companion.behavior === 'daily_visit') {
    containerStyle.top = '70%';
    containerStyle.left = 0;
    containerStyle.width = '100%';
    const anims = {
      entering: 'comp-visit-enter 4s ease-out forwards',
      acting: 'comp-visit-action 5s ease-in-out forwards',
      exiting: 'comp-visit-exit 3s ease-in forwards',
    };
    wrapperStyle.animation = anims[phase] || 'none';
  }

  if (companion.behavior === 'passing_through') {
    containerStyle.top = '72%';
    containerStyle.left = 0;
    containerStyle.width = '100%';
    const crossDur = (creature.animationDuration || 8) * 0.6;
    wrapperStyle.animation = `comp-cross-${dir} ${crossDur}s linear forwards`;
  }

  return (
    <div style={containerStyle} aria-hidden="true">
      <div style={wrapperStyle}>
        <Component variant={variant} direction={dir} />
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────
export default function CompanionRenderer({
  companions = [],
  onDailyVisitComplete,
  onPassingComplete,
}) {
  const handleComplete = useCallback((companionId, behavior) => {
    if (behavior === 'daily_visit') onDailyVisitComplete?.(companionId);
    if (behavior === 'passing_through') onPassingComplete?.(companionId);
  }, [onDailyVisitComplete, onPassingComplete]);

  const activeCompanions = companions.filter(c => c.isActive);

  if (!activeCompanions.length) return null;

  return (
    <>
      {activeCompanions.map(companion => (
        <SingleCompanion
          key={companion.id}
          companion={companion}
          onComplete={handleComplete}
        />
      ))}
    </>
  );
}
