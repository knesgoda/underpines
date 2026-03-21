/**
 * CreatureRenderer — Places a creature into the CabinScene at Layer 7.
 *
 * Handles scheduling, positioning, weather/season gating, animation variants,
 * and the social cameo (visitor creature) system.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { getNextAppearance } from '@/lib/creatureScheduler';
import { creatureMap } from '@/config/creatures';
import { getBiomeConfig } from '@/config/biomes';

// ── Lazy component registry ──────────────────────────────────────
import * as Common from './common';
import * as Uncommon from './uncommon';
import * as Rare from './rare';
import * as Legendary from './legendary';
import * as Mythical from './mythical';

/** Map creature keys → React components */
const COMPONENT_MAP = {
  // Common
  'rabbit': Common.Rabbit, 'raccoon': Common.Raccoon, 'badger': Common.Badger,
  'hedgehog': Common.Hedgehog, 'squirrel': Common.Squirrel, 'red-fox': Common.RedFox,
  'grey-fox': Common.GreyFox, 'finch': Common.Finch, 'hummingbird': Common.Hummingbird,
  'robin': Common.Robin, 'frog': Common.Frog, 'otter': Common.Otter,
  'beaver': Common.Beaver, 'fireflies': Common.Fireflies,
  // Uncommon
  'white-tailed-deer': Uncommon.WhiteTailedDeer, 'red-deer-stag': Uncommon.RedDeerStag,
  'elk': Uncommon.Elk, 'caribou': Uncommon.Caribou, 'moose': Uncommon.Moose,
  'brown-bear': Uncommon.BrownBear, 'black-bear': Uncommon.BlackBear,
  'coyote': Uncommon.Coyote, 'eagle': Uncommon.Eagle, 'hawk': Uncommon.Hawk,
  'owl': Uncommon.Owl, 'raven': Uncommon.Raven, 'salmon': Uncommon.Salmon,
  'wild-boar': Uncommon.WildBoar, 'stork': Uncommon.Stork, 'puffin': Uncommon.Puffin,
  'arctic-fox': Uncommon.ArcticFox, 'fennec-fox': Uncommon.FennecFox,
  // Rare
  'timberwolf': Rare.Timberwolf, 'grey-wolf': Rare.GreyWolf, 'red-wolf': Rare.RedWolf,
  'mountain-lion': Rare.MountainLion, 'lynx': Rare.Lynx, 'wolverine': Rare.Wolverine,
  'orca': Rare.Orca, 'whale': Rare.Whale, 'shark': Rare.Shark,
  'hippo': Rare.Hippo, 'rhino': Rare.Rhino, 'vulture': Rare.Vulture,
  // Legendary
  'sasquatch': Legendary.Sasquatch, 'loch-ness-monster': Legendary.LochNessMonster,
  'yeti': Legendary.Yeti, 'dire-wolf': Legendary.DireWolf,
  'nuckelavee': Legendary.Nuckelavee, 'dragon': Legendary.Dragon,
  'wendigo': Legendary.Wendigo, 'kraken': Legendary.Kraken,
  'thunderbird': Legendary.Thunderbird, 'phoenix': Legendary.Phoenix,
  // Mythical
  'fairy': Mythical.Fairy, 'leprechaun': Mythical.Leprechaun,
  'will-o-the-wisp': Mythical.WillOTheWisp, 'mermaid': Mythical.Mermaid,
  'selkie': Mythical.Selkie, 'ghost': Mythical.Ghost, 'witch': Mythical.Witch,
  'jackalope': Mythical.Jackalope, 'vampire': Mythical.Vampire,
  'werewolf': Mythical.Werewolf, 'banshee': Mythical.Banshee,
  'kelpie': Mythical.Kelpie, 'troll': Mythical.Troll, 'huldra': Mythical.Huldra,
  'puckwudgie': Mythical.Puckwudgie, 'zombie': Mythical.Zombie,
  'ghoul': Mythical.Ghoul, 'headless-horseman': Mythical.HeadlessHorseman,
};

// ── Movement classification ──────────────────────────────────────
const FLYING_STYLES = new Set(['soar', 'hover', 'flit']);
const WATER_STYLES = new Set(['swim', 'drift']);
const PERCHING_KEYS = new Set(['owl', 'raven', 'witch']);

// Weather condition key map for weatherTrigger matching
function matchesWeather(trigger, weather) {
  if (!trigger) return true; // no trigger = always ok
  if (!weather) return true; // no weather data = optimistic
  const cond = weather.condition?.toLowerCase() || '';
  const map = {
    rain: cond.includes('rain') || cond.includes('drizzle'),
    thunderstorm: cond.includes('thunder') || cond.includes('storm'),
    snow: cond.includes('snow') || cond.includes('blizzard'),
    fog: cond.includes('fog') || cond.includes('mist'),
  };
  return !!map[trigger];
}

function matchesSeason(lock, seasonalEvent) {
  if (!lock) return true;
  if (!seasonalEvent) return false;
  return seasonalEvent.key === lock || seasonalEvent.name?.toLowerCase() === lock;
}

/**
 * Get Y-position (as %) based on creature movement style.
 *  - Flying: 8–25% (upper)
 *  - Ground: 68–82% (lower)
 *  - Water: 76–84% (water line)
 *  - Perching: 35–50% (branch level)
 */
function getYPosition(creature, isPerching) {
  if (isPerching) return 38 + (hashQuick(creature.key) % 12);
  if (FLYING_STYLES.has(creature.movementStyle)) return 8 + (hashQuick(creature.key) % 18);
  if (WATER_STYLES.has(creature.movementStyle)) return 76 + (hashQuick(creature.key) % 8);
  return 68 + (hashQuick(creature.key) % 14);
}

function hashQuick(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ── Inject crossing keyframes once ──────────────────────────────
const crossId = 'creature-crossing-anims';
if (typeof document !== 'undefined' && !document.getElementById(crossId)) {
  const s = document.createElement('style');
  s.id = crossId;
  s.textContent = `
@keyframes creature-cross-ltr{0%{transform:translateX(-10%)}100%{transform:translateX(110%)}}
@keyframes creature-cross-rtl{0%{transform:translateX(110%)}100%{transform:translateX(-10%)}}
@keyframes creature-perch{0%{opacity:0}8%{opacity:1}85%{opacity:1}100%{opacity:0}}
@keyframes creature-soar-y{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes creature-snow-trail{0%{opacity:0.4;width:0}50%{opacity:0.25;width:30px}100%{opacity:0;width:40px}}
`;
  document.head.appendChild(s);
}

// ── Single creature render logic ────────────────────────────────
function RenderSingleCreature({
  creatureKey, userId, weather, seasonalEvent, biome, isCameo = false,
}) {
  const [now, setNow] = useState(() => new Date());

  // Re-check every 60 s
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const creature = creatureMap[creatureKey];
  const Component = COMPONENT_MAP[creatureKey];
  if (!creature || !Component) return null;

  const biomeConfig = getBiomeConfig?.(biome) || {};

  // ── Gate: biome match ──
  if (!creature.biomes.includes(biome || 'default')) return null;

  // ── Gate: water requirement ──
  if (WATER_STYLES.has(creature.movementStyle) && !biomeConfig.hasWater) return null;

  // ── Gate: weather trigger ──
  if (creature.weatherTrigger && !matchesWeather(creature.weatherTrigger, weather)) return null;

  // ── Gate: season lock ──
  if (creature.seasonLock && !matchesSeason(creature.seasonLock, seasonalEvent)) return null;

  // ── Scheduler ──
  const weatherCond = weather?.condition || '';
  const seasonCond = seasonalEvent?.key || '';
  const appearance = getNextAppearance(creatureKey, userId, now, {
    weather: weatherCond,
    season: seasonCond,
  });

  if (!appearance || !appearance.isActive) return null;

  // ── Position & animation ──
  const isPerching = PERCHING_KEYS.has(creatureKey);
  const isFlying = FLYING_STYLES.has(creature.movementStyle);
  const isWater = WATER_STYLES.has(creature.movementStyle);
  const yPos = getYPosition(creature, isPerching);

  const duration = creature.animationDuration;
  const { variant, direction } = appearance;

  // ── Weather effects ──
  const isHeavyRain = weather?.condition?.toLowerCase()?.includes('rain') && !isFlying && !isWater && !isPerching;
  const isSnowing = weather?.condition?.toLowerCase()?.includes('snow') && !isFlying && !isWater;
  const isSamhain = seasonalEvent?.key === 'samhain';

  // Build container style
  const containerStyle = {
    position: 'absolute',
    top: `${yPos}%`,
    left: 0,
    width: '100%',
    height: 'auto',
    pointerEvents: 'none',
    zIndex: 7,
    ...(isCameo && {
      transform: 'scale(0.7)',
      opacity: 0.6,
      top: `${yPos + 4}%`,
    }),
  };

  // Crossing animation for the wrapper
  let wrapperAnimation;
  if (isPerching) {
    wrapperAnimation = `creature-perch ${duration}s ease-in-out forwards`;
  } else {
    const dir = direction === 'rtl' ? 'rtl' : 'ltr';
    const crossDuration = isCameo ? Math.max(duration * 0.6, 4) : duration;
    wrapperAnimation = `creature-cross-${dir} ${crossDuration}s linear forwards`;
  }

  const wrapperStyle = {
    display: 'inline-block',
    animation: wrapperAnimation,
    willChange: 'transform',
    position: 'relative',
    ...(isPerching && {
      position: 'absolute',
      left: `${30 + (hashQuick(creatureKey) % 40)}%`,
    }),
  };

  // Rain lean
  if (isHeavyRain) {
    wrapperStyle.transform = (wrapperStyle.transform || '') + ' rotate(3deg)';
  }

  // Flying soar Y wobble
  const soarStyle = isFlying && !isPerching ? {
    animation: `creature-soar-y ${2 + (hashQuick(creatureKey) % 3)}s ease-in-out infinite`,
  } : {};

  // Samhain spectral filter
  const creatureFilter = isSamhain
    ? { opacity: 0.85, filter: 'hue-rotate(20deg) saturate(0.9)' }
    : {};

  return (
    <div style={containerStyle} aria-hidden="true">
      <div style={wrapperStyle}>
        <div style={{ ...soarStyle, ...creatureFilter, position: 'relative', display: 'inline-block' }}>
          <Component variant={isCameo ? 0 : variant} direction={direction} />
          {/* Snow trail */}
          {isSnowing && !isPerching && (
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: 'rgba(255,255,255,0.4)',
              animation: 'creature-snow-trail 3s ease-out forwards',
              pointerEvents: 'none',
            }} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────
export default function CreatureRenderer({
  creatureKey,
  userId,
  biome,
  timeOfDay,
  weather,
  seasonalEvent,
  visitorCreatureKey = null,
}) {
  return (
    <>
      <RenderSingleCreature
        creatureKey={creatureKey}
        userId={userId}
        biome={biome}
        weather={weather}
        seasonalEvent={seasonalEvent}
      />
      {visitorCreatureKey && (
        <RenderSingleCreature
          creatureKey={visitorCreatureKey}
          userId={userId}
          biome={biome}
          weather={weather}
          seasonalEvent={seasonalEvent}
          isCameo
        />
      )}
    </>
  );
}
