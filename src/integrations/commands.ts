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

// ---- Validation helpers shared by transports/executor ----

export function isLngLat(v: unknown): v is LngLat {
  return Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number';
}

export function isBounds(v: unknown): v is Bounds {
  return Array.isArray(v) && v.length === 2 && isLngLat(v[0]) && isLngLat(v[1]);
}
