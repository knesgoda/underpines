// Default avatar illustrations for Under Pines
// Each key maps to an illustration in src/assets/avatars/

import redFox from '@/assets/avatars/red-fox.png';
import barnOwl from '@/assets/avatars/barn-owl.png';
import whiteTailedDeer from '@/assets/avatars/white-tailed-deer.png';
import blackBear from '@/assets/avatars/black-bear.png';
import riverOtter from '@/assets/avatars/river-otter.png';
import greatHornedOwl from '@/assets/avatars/great-horned-owl.png';
import grayWolf from '@/assets/avatars/gray-wolf.png';
import raccoon from '@/assets/avatars/raccoon.png';
import snowshoeHare from '@/assets/avatars/snowshoe-hare.png';
import bobcat from '@/assets/avatars/bobcat.png';
import moose from '@/assets/avatars/moose.png';
import mountainLion from '@/assets/avatars/mountain-lion.png';
import sasquatch from '@/assets/avatars/sasquatch.png';
import puckwudgie from '@/assets/avatars/puckwudgie.png';
import lochNessMonster from '@/assets/avatars/loch-ness-monster.png';
import banshee from '@/assets/avatars/banshee.png';
import witch from '@/assets/avatars/witch.png';
import ghost from '@/assets/avatars/ghost.png';
import mothman from '@/assets/avatars/mothman.png';
import wendigo from '@/assets/avatars/wendigo.png';
import blackDog from '@/assets/avatars/black-dog.png';
import willOTheWisp from '@/assets/avatars/will-o-the-wisp.png';
import jackalope from '@/assets/avatars/jackalope.png';
import selkie from '@/assets/avatars/selkie.png';

export const defaultAvatars: Record<string, { src: string; label: string }> = {
  'red-fox': { src: redFox, label: 'Red Fox' },
  'barn-owl': { src: barnOwl, label: 'Barn Owl' },
  'white-tailed-deer': { src: whiteTailedDeer, label: 'White-Tailed Deer' },
  'black-bear': { src: blackBear, label: 'Black Bear' },
  'river-otter': { src: riverOtter, label: 'River Otter' },
  'great-horned-owl': { src: greatHornedOwl, label: 'Great Horned Owl' },
  'gray-wolf': { src: grayWolf, label: 'Gray Wolf' },
  'raccoon': { src: raccoon, label: 'Raccoon' },
  'snowshoe-hare': { src: snowshoeHare, label: 'Snowshoe Hare' },
  'bobcat': { src: bobcat, label: 'Bobcat' },
  'moose': { src: moose, label: 'Moose' },
  'mountain-lion': { src: mountainLion, label: 'Mountain Lion' },
  'sasquatch': { src: sasquatch, label: 'Sasquatch' },
  'puckwudgie': { src: puckwudgie, label: 'Puckwudgie' },
  'loch-ness-monster': { src: lochNessMonster, label: 'Loch Ness Monster' },
  'banshee': { src: banshee, label: 'Banshee' },
  'witch': { src: witch, label: 'Witch' },
  'ghost': { src: ghost, label: 'Ghost' },
  'mothman': { src: mothman, label: 'Mothman' },
  'wendigo': { src: wendigo, label: 'Wendigo' },
  'black-dog': { src: blackDog, label: 'Black Dog' },
  'will-o-the-wisp': { src: willOTheWisp, label: "Will-o'-the-Wisp" },
  'jackalope': { src: jackalope, label: 'Jackalope' },
  'selkie': { src: selkie, label: 'Selkie' },
};

export const defaultAvatarKeys = Object.keys(defaultAvatars);

export function getAvatarSrc(avatarUrl: string | null, defaultAvatarKey: string | null): string {
  if (avatarUrl) return avatarUrl;
  const key = defaultAvatarKey || 'red-fox';
  return defaultAvatars[key]?.src || defaultAvatars['red-fox'].src;
}
