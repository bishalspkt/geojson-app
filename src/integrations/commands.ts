/**
 * The canonical command surface for driving a geojson.app map from outside.
 *
 * Every transport speaks this schema:
 *   - postMessage embed protocol (`integrations/embed/`) — live iframes
 *   - URL parameters — one-shot links and static embeds
 *   - MCP tools (see docs/integrations.md) — AI agents
 *
 * A command executes identically no matter which transport delivered it
 * (`integrations/executor.ts`). Names and argument shapes here are a public
 * contract: additions are fine, renames/removals require a protocol version
 * bump. Keep them in sync with docs/developers-api.md.
 */

/**
 * Stable id for the primary dataset (`setGeoJSON`, `?geojson=` in embeds).
 * Contains ':' so it can never collide with sanitized caller ids
 * (sanitizeExternalLayerId maps ':' to '_').
 */
export const PRIMARY_LAYER_ID = 'sdk:primary';

export type LngLat = [number, number];
export type Bounds = [LngLat, LngLat];

export const COMMAND_NAMES = [
  // Camera
  'flyTo',
  'jumpTo',
  'fitBounds',
  // Appearance
  'setTheme',
  'setProjection',
  // Data
  'setGeoJSON',
  'addLayer',
  'removeLayer',
  'clearLayers',
  'listLayers',
  'setLayerVisibility',
  // Inspection
  'getCenter',
  'getZoom',
  'getBearing',
  'getBounds',
  // Imagery, terrain, time, stories (additive in v1)
  'addImagery',
  'removeImagery',
  'listImagery',
  'setTerrain',
  'setTime',
  'setCompare',
  'loadStory',
  'setStoryChapter',
] as const;

export type CommandName = (typeof COMMAND_NAMES)[number];

export function isCommandName(name: string): name is CommandName {
  return (COMMAND_NAMES as readonly string[]).includes(name);
}

/** Events pushed from the map to whoever is listening on a live transport. */
export const EVENT_NAMES = [
  'load',
  'move',
  'moveend',
  'click',
  'theme:change',
  'projection:change',
  'error',
  'story:chapter',
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

// ---- Argument / result shapes (documented; validated by the executor) ----

export interface FlyToArgs {
  center?: LngLat;
  zoom?: number;
  bearing?: number;
  pitch?: number;
  /** ms. When omitted and center is set, scales with distance (1.5–3.5 s). */
  duration?: number;
}

export interface JumpToArgs {
  center?: LngLat;
  zoom?: number;
  bearing?: number;
  pitch?: number;
}

export interface FitBoundsArgs {
  bounds: Bounds;
  padding?: number;
  duration?: number;
  maxZoom?: number;
}

export interface AddLayerArgs {
  /** Caller-chosen id. Reusing an id replaces that layer. */
  id: string;
  data: unknown; // Feature | FeatureCollection | JSON string
  /** Raw MapLibre paint overrides, merged over defaults. */
  paint?: Record<string, unknown>;
  name?: string;
}

export interface LayerInfo {
  id: string;
  name: string;
  origin: string;
  featureCount: number;
  visible: boolean;
}

export interface AddImageryArgs {
  /** Caller-chosen id. Reusing an id replaces that imagery layer. */
  id: string;
  name?: string;
  /** XYZ tile URL templates ({z}/{x}/{y}, optional {time}). */
  tiles?: string[];
  tileSize?: number;
  minzoom?: number;
  maxzoom?: number;
  bounds?: [number, number, number, number];
  /** Single georeferenced image (instead of tiles). */
  url?: string;
  /** Image corners TL, TR, BR, BL as [lng, lat]. */
  coordinates?: [LngLat, LngLat, LngLat, LngLat];
  /** Cloud-optimised GeoTIFF streamed from its host (instead of tiles/url); `bounds` clips it. */
  cog?: string;
  opacity?: number;
  visible?: boolean;
  attribution?: string;
  /** How {time} resolves: format + default value. */
  time?: { format: 'date' | 'datetime' | 'month'; default: string; stepMinutes?: number };
}

export interface ImageryInfo {
  id: string;
  name: string;
  origin: string;
  visible: boolean;
  opacity: number;
}

export interface SetTerrainArgs {
  enabled: boolean;
  exaggeration?: number;
  hillshade?: boolean;
}

export interface SetTimeArgs {
  /** Show/hide the timeline (default: true when any other field is given). */
  enabled?: boolean;
  /** Extent; times as ISO strings or epoch ms. */
  start?: string | number;
  end?: string | number;
  current?: string | number;
  playing?: boolean;
  /** Seconds for one full pass at 1×. */
  duration?: number;
  /** Sliding window in ms; null = cumulative. */
  window?: number | null;
  loop?: boolean;
  timeZone?: string | null;
  /** Chase camera on an animated-track layer (the id used with addLayer); null stops following. */
  follow?: { layer: string; zoom?: number; pitch?: number; bearing?: number | 'track'; maxViewSpeed?: number } | null;
  /** Narration shown above the timeline as the playhead passes each time. */
  captions?: { time: string | number; text: string }[];
}

export interface SetCompareArgs {
  /** false ends the comparison. */
  enabled?: boolean;
  /** Imagery id(s) shown left of the divider. */
  left?: string | string[];
  leftLabel?: string;
  rightLabel?: string;
  position?: number;
}

export interface LoadStoryArgs {
  url: string;
  chapter?: number | string;
}

// ---- Validation helpers shared by transports/executor ----

export function isLngLat(v: unknown): v is LngLat {
  return Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number';
}

export function isBounds(v: unknown): v is Bounds {
  return Array.isArray(v) && v.length === 2 && isLngLat(v[0]) && isLngLat(v[1]);
}
