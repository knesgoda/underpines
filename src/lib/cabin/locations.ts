/**
 * Curated Cabin Locations — where a cabin can fictionally live.
 *
 * These drive weather + daylight when cabins.weather_source = 'cabin_location'.
 * They are deliberately not the member's real location: sharing one reveals a
 * mood, not an address. Coordinates are scenic-area centroids, biome keys map
 * into the scene registry in src/config/biomes.js.
 */

export interface CabinLocation {
  key: string;
  label: string;
  region: string;
  lat: number;
  lng: number;
  biome: string;
}

export const CABIN_LOCATIONS: CabinLocation[] = [
  { key: 'olympic-peninsula', label: 'Olympic Peninsula', region: 'Washington', lat: 47.8, lng: -123.6, biome: 'pacific-northwest' },
  { key: 'north-cascades', label: 'North Cascades', region: 'Washington', lat: 48.7, lng: -121.3, biome: 'pacific-northwest' },
  { key: 'redwood-coast', label: 'Redwood Coast', region: 'California', lat: 41.2, lng: -124.0, biome: 'california-southwest' },
  { key: 'lake-tahoe', label: 'Lake Tahoe', region: 'California / Nevada', lat: 39.1, lng: -120.0, biome: 'mountain-west' },
  { key: 'tetons', label: 'The Tetons', region: 'Wyoming', lat: 43.7, lng: -110.8, biome: 'mountain-west' },
  { key: 'boundary-waters', label: 'Boundary Waters', region: 'Minnesota', lat: 47.9, lng: -91.5, biome: 'midwest' },
  { key: 'green-mountains', label: 'Green Mountains', region: 'Vermont', lat: 44.1, lng: -72.8, biome: 'northeast' },
  { key: 'coastal-maine', label: 'Coastal Maine', region: 'Maine', lat: 44.3, lng: -68.3, biome: 'northeast' },
  { key: 'blue-ridge', label: 'Blue Ridge Mountains', region: 'North Carolina', lat: 35.6, lng: -82.5, biome: 'southeast' },
  { key: 'ozarks', label: 'The Ozarks', region: 'Arkansas', lat: 35.9, lng: -93.2, biome: 'southeast' },
  { key: 'scottish-highlands', label: 'Scottish Highlands', region: 'Scotland', lat: 57.1, lng: -4.7, biome: 'british-isles' },
  { key: 'lake-district', label: 'Lake District', region: 'England', lat: 54.5, lng: -3.1, biome: 'british-isles' },
  { key: 'reykjavik', label: 'Near Reykjavík', region: 'Iceland', lat: 64.1, lng: -21.9, biome: 'nordic' },
  { key: 'norwegian-fjords', label: 'Norwegian Fjords', region: 'Norway', lat: 61.9, lng: 6.7, biome: 'nordic' },
  { key: 'lapland', label: 'Lapland', region: 'Finland', lat: 67.9, lng: 26.6, biome: 'nordic' },
  { key: 'tuscan-hills', label: 'Tuscan Hills', region: 'Italy', lat: 43.3, lng: 11.3, biome: 'mediterranean' },
  { key: 'provence', label: 'Provence', region: 'France', lat: 43.9, lng: 5.4, biome: 'mediterranean' },
  { key: 'joshua-tree', label: 'Near Joshua Tree', region: 'California', lat: 34.1, lng: -116.3, biome: 'california-southwest' },
];

export const getCabinLocation = (key: string | null | undefined): CabinLocation | null =>
  CABIN_LOCATIONS.find(l => l.key === key) ?? null;

/** The default cabin sits in the Pacific Northwest, because of course it does. */
export const DEFAULT_LOCATION: CabinLocation = CABIN_LOCATIONS[0];
