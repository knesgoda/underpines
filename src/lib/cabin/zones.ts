/**
 * Cabin zones — the fixed placement vocabulary (spec §7).
 *
 * Structured customization: objects go in zones, zones have places in the
 * room, and the database trigger enforces each item's valid_zones. This file
 * is the client half of that contract — the keys must match the CHECK
 * constraint in the cabin_system migration exactly.
 *
 * Positions are percentages of the interior room box; the exterior zones
 * render along the bottom of the scene banner instead.
 */

export interface CabinZone {
  key: string;
  label: string;
  area: 'exterior' | 'window' | 'left_wall' | 'right_wall' | 'fireplace' | 'desk'
      | 'bookshelf' | 'floor' | 'ceiling' | 'pet_area';
  /** Interior render anchor, % of room box. Exterior zones use the porch strip. */
  x: number;
  y: number;
}

export const CABIN_ZONES: CabinZone[] = [
  { key: 'porch_left', label: 'Porch, left', area: 'exterior', x: 14, y: 88 },
  { key: 'porch_center', label: 'Porch, by the door', area: 'exterior', x: 50, y: 90 },
  { key: 'porch_right', label: 'Porch, right', area: 'exterior', x: 86, y: 88 },
  { key: 'exterior_sign', label: 'By the sign', area: 'exterior', x: 30, y: 92 },

  { key: 'window_left_sill', label: 'Window sill, left', area: 'window', x: 38, y: 44 },
  { key: 'window_center_sill', label: 'Window sill, center', area: 'window', x: 50, y: 44 },
  { key: 'window_right_sill', label: 'Window sill, right', area: 'window', x: 62, y: 44 },

  { key: 'left_wall_upper', label: 'Left wall, up high', area: 'left_wall', x: 10, y: 18 },
  { key: 'left_wall_middle', label: 'Left wall', area: 'left_wall', x: 10, y: 34 },
  { key: 'left_wall_lower', label: 'Left wall, low', area: 'left_wall', x: 10, y: 50 },

  { key: 'right_wall_upper', label: 'Right wall, up high', area: 'right_wall', x: 90, y: 18 },
  { key: 'right_wall_middle', label: 'Right wall', area: 'right_wall', x: 90, y: 34 },
  { key: 'right_wall_lower', label: 'Right wall, low', area: 'right_wall', x: 90, y: 50 },

  { key: 'fireplace_mantle', label: 'Fireplace mantle', area: 'fireplace', x: 77, y: 46 },

  { key: 'desk', label: 'Desk', area: 'desk', x: 30, y: 62 },

  { key: 'bookshelf_top', label: 'Bookshelf, top', area: 'bookshelf', x: 21, y: 40 },
  { key: 'bookshelf_middle', label: 'Bookshelf, middle', area: 'bookshelf', x: 21, y: 50 },
  { key: 'bookshelf_lower', label: 'Bookshelf, bottom', area: 'bookshelf', x: 21, y: 60 },

  { key: 'floor_left', label: 'Floor, left', area: 'floor', x: 22, y: 84 },
  { key: 'floor_center', label: 'Middle of the room', area: 'floor', x: 50, y: 86 },
  { key: 'floor_right', label: 'Floor, by the fire', area: 'floor', x: 72, y: 84 },

  { key: 'ceiling', label: 'From the ceiling', area: 'ceiling', x: 50, y: 7 },

  { key: 'pet_area', label: 'The pet corner', area: 'pet_area', x: 88, y: 82 },
];

export const zoneByKey = new Map(CABIN_ZONES.map(z => [z.key, z]));

export const INTERIOR_ZONES = CABIN_ZONES.filter(z => z.area !== 'exterior');
export const EXTERIOR_ZONES = CABIN_ZONES.filter(z => z.area === 'exterior');

/** True when `zone` is legal for an item definition's valid_zones list. */
export const zoneAllowed = (validZones: string[] | null | undefined, zone: string): boolean =>
  !!validZones && validZones.includes(zone);
