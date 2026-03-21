/**
 * Biome configuration registry.
 * Each biome sets the same CSS custom properties so weather/solar/seasonal
 * systems work without modification.
 */

const biomes = {
  /* ── Default (Pacific Northwest) ── */
  default: {
    key: 'default',
    name: 'Pacific Northwest',
    cssVariables: {
      '--biome-canopy':    '#3a7d44',
      '--biome-bg-far':    '#7a9a8a',
      '--biome-bg-mid':    '#4a7c59',
      '--biome-bg-near':   '#3a6b48',
      '--biome-fg-ground': '#2d5a3d',
      '--biome-trunk':     '#5c4033',
      '--biome-accent':    '#8fbc8f',
    },
    treeComponent: 'DefaultTrees',
    backgroundComponent: 'DefaultBackground',
    foregroundComponent: 'DefaultForeground',
    seasonalOverrides: {
      ostara:  { '--biome-canopy': '#5eae5e', '--biome-accent': '#c8e6c8' },
      litha:   { '--biome-canopy': '#2d6b34' },
      mabon:   { '--biome-canopy': '#b8860b', '--biome-accent': '#d4a030' },
      yule:    { '--biome-canopy': '#2f5f3f', '--biome-fg-ground': '#e8e8e8' },
    },
    hasWater: false,
    groundCover: 'moss',
  },

  'pacific-northwest': {
    key: 'pacific-northwest',
    name: 'Pacific Northwest',
    cssVariables: {
      '--biome-canopy':    '#3a7d44',
      '--biome-bg-far':    '#7a9a8a',
      '--biome-bg-mid':    '#4a7c59',
      '--biome-bg-near':   '#3a6b48',
      '--biome-fg-ground': '#2d5a3d',
      '--biome-trunk':     '#5c4033',
      '--biome-accent':    '#8fbc8f',
    },
    treeComponent: 'PNWTrees',
    backgroundComponent: 'PNWBackground',
    foregroundComponent: 'PNWForeground',
    seasonalOverrides: {
      ostara:  { '--biome-canopy': '#5eae5e', '--biome-accent': '#c8e6c8' },
      litha:   { '--biome-canopy': '#2d6b34' },
      mabon:   { '--biome-canopy': '#b8860b', '--biome-accent': '#d4a030' },
      yule:    { '--biome-canopy': '#2f5f3f', '--biome-fg-ground': '#e8e8e8' },
    },
    hasWater: true,
    groundCover: 'moss',
  },

  'british-isles': {
    key: 'british-isles',
    name: 'British Isles',
    cssVariables: {
      '--biome-canopy':    '#4a7a52',
      '--biome-bg-far':    '#8a9e90',
      '--biome-bg-mid':    '#5a8060',
      '--biome-bg-near':   '#4a7050',
      '--biome-fg-ground': '#3a5a3a',
      '--biome-trunk':     '#6b5040',
      '--biome-accent':    '#9db89d',
    },
    treeComponent: 'BritishIslesTrees',
    backgroundComponent: 'BritishIslesBackground',
    foregroundComponent: 'BritishIslesForeground',
    seasonalOverrides: {
      ostara:  { '--biome-canopy': '#6ab86a', '--biome-accent': '#d0e8c0' },
      mabon:   { '--biome-canopy': '#c89030', '--biome-accent': '#daa520' },
      yule:    { '--biome-canopy': '#3a5a42', '--biome-fg-ground': '#d8dcd8' },
    },
    hasWater: false,
    groundCover: 'grass',
  },

  'mediterranean': {
    key: 'mediterranean',
    name: 'Mediterranean',
    cssVariables: {
      '--biome-canopy':    '#6b8e5a',
      '--biome-bg-far':    '#c4b89a',
      '--biome-bg-mid':    '#9a9a6e',
      '--biome-bg-near':   '#7a8a5e',
      '--biome-fg-ground': '#a09060',
      '--biome-trunk':     '#8b7355',
      '--biome-accent':    '#e6c84a',
    },
    treeComponent: 'MediterraneanTrees',
    backgroundComponent: 'MediterraneanBackground',
    foregroundComponent: 'MediterraneanForeground',
    seasonalOverrides: {
      litha:   { '--biome-canopy': '#5a7e4a', '--biome-accent': '#d4a030' },
      mabon:   { '--biome-canopy': '#9a8a50' },
    },
    hasWater: true,
    groundCover: 'dry-scrub',
  },

  'nordic': {
    key: 'nordic',
    name: 'Nordic',
    cssVariables: {
      '--biome-canopy':    '#2e5e3e',
      '--biome-bg-far':    '#8a9aa0',
      '--biome-bg-mid':    '#5a7a6a',
      '--biome-bg-near':   '#3a5a48',
      '--biome-fg-ground': '#2a4a32',
      '--biome-trunk':     '#4a3a2e',
      '--biome-accent':    '#7aaaa0',
    },
    treeComponent: 'NordicTrees',
    backgroundComponent: 'NordicBackground',
    foregroundComponent: 'NordicForeground',
    seasonalOverrides: {
      ostara:  { '--biome-canopy': '#4a8e5a' },
      yule:    { '--biome-canopy': '#1e3e2e', '--biome-fg-ground': '#e0e6e8' },
    },
    hasWater: true,
    groundCover: 'moss',
  },

  'california-southwest': {
    key: 'california-southwest',
    name: 'California & Southwest',
    cssVariables: {
      '--biome-canopy':    '#7a9a5a',
      '--biome-bg-far':    '#d4c0a0',
      '--biome-bg-mid':    '#b0a078',
      '--biome-bg-near':   '#8a7a58',
      '--biome-fg-ground': '#b8a070',
      '--biome-trunk':     '#9a7a5a',
      '--biome-accent':    '#e0a030',
    },
    treeComponent: 'SouthwestTrees',
    backgroundComponent: 'SouthwestBackground',
    foregroundComponent: 'SouthwestForeground',
    seasonalOverrides: {
      litha:   { '--biome-canopy': '#6a8a4a', '--biome-fg-ground': '#c8b080' },
    },
    hasWater: false,
    groundCover: 'dry-scrub',
  },

  'mountain-west': {
    key: 'mountain-west',
    name: 'Mountain West',
    cssVariables: {
      '--biome-canopy':    '#2a5a3a',
      '--biome-bg-far':    '#9aaa9a',
      '--biome-bg-mid':    '#5a7a5a',
      '--biome-bg-near':   '#3a5a3a',
      '--biome-fg-ground': '#4a6a3a',
      '--biome-trunk':     '#5a4030',
      '--biome-accent':    '#8ab0a0',
    },
    treeComponent: 'MountainWestTrees',
    backgroundComponent: 'MountainWestBackground',
    foregroundComponent: 'MountainWestForeground',
    seasonalOverrides: {
      yule:    { '--biome-fg-ground': '#dce0e0', '--biome-canopy': '#1e3e2a' },
      mabon:   { '--biome-canopy': '#c09020', '--biome-accent': '#daa520' },
    },
    hasWater: false,
    groundCover: 'grass',
  },

  'midwest': {
    key: 'midwest',
    name: 'Midwest',
    cssVariables: {
      '--biome-canopy':    '#5a8a4a',
      '--biome-bg-far':    '#a0b090',
      '--biome-bg-mid':    '#7a9a68',
      '--biome-bg-near':   '#5a7a48',
      '--biome-fg-ground': '#4a6a38',
      '--biome-trunk':     '#6a5040',
      '--biome-accent':    '#c8b040',
    },
    treeComponent: 'MidwestTrees',
    backgroundComponent: 'MidwestBackground',
    foregroundComponent: 'MidwestForeground',
    seasonalOverrides: {
      ostara:  { '--biome-canopy': '#6aae5a', '--biome-accent': '#d8e8b0' },
      mabon:   { '--biome-canopy': '#c89020', '--biome-accent': '#d4a020' },
      yule:    { '--biome-fg-ground': '#d8dce0' },
    },
    hasWater: false,
    groundCover: 'prairie',
  },

  'northeast': {
    key: 'northeast',
    name: 'Northeast',
    cssVariables: {
      '--biome-canopy':    '#4a7a4a',
      '--biome-bg-far':    '#8a9a8a',
      '--biome-bg-mid':    '#5a7a58',
      '--biome-bg-near':   '#4a6a46',
      '--biome-fg-ground': '#3a5a34',
      '--biome-trunk':     '#5a4438',
      '--biome-accent':    '#b0c0a0',
    },
    treeComponent: 'NortheastTrees',
    backgroundComponent: 'NortheastBackground',
    foregroundComponent: 'NortheastForeground',
    seasonalOverrides: {
      ostara:  { '--biome-canopy': '#5aae5a' },
      mabon:   { '--biome-canopy': '#c84020', '--biome-accent': '#e86020' },
      yule:    { '--biome-fg-ground': '#dce0e4', '--biome-canopy': '#2a4a3a' },
    },
    hasWater: false,
    groundCover: 'grass',
  },

  'southeast': {
    key: 'southeast',
    name: 'Southeast',
    cssVariables: {
      '--biome-canopy':    '#3a8a3a',
      '--biome-bg-far':    '#90a880',
      '--biome-bg-mid':    '#5a8a50',
      '--biome-bg-near':   '#3a7040',
      '--biome-fg-ground': '#2a5a28',
      '--biome-trunk':     '#6a5038',
      '--biome-accent':    '#a0c890',
    },
    treeComponent: 'SoutheastTrees',
    backgroundComponent: 'SoutheastBackground',
    foregroundComponent: 'SoutheastForeground',
    seasonalOverrides: {
      ostara:  { '--biome-canopy': '#4aae4a', '--biome-accent': '#d0f0c0' },
      litha:   { '--biome-canopy': '#2a7a2a' },
    },
    hasWater: true,
    groundCover: 'grass',
  },
};

export default biomes;

/**
 * Get a biome config by key, falling back to 'default'.
 * @param {string} key
 */
export function getBiomeConfig(key) {
  return biomes[key] || biomes.default;
}
