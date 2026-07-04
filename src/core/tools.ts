import maplibregl from 'maplibre-gl';

export interface ToolContext {
  map: maplibregl.Map;
}

/**
 * An exclusive pointer mode (measure, draw, …). Exactly one tool can be
 * active at a time; while active, default feature interactions are suppressed.
 * Tools are registered in `extensions/tools` and resolved by the map engine.
 */
export interface MapTool {
  id: string;
  /** CSS cursor while the tool is active (default: crosshair). */
  cursor?: string;
  onActivate?(ctx: ToolContext): void;
  onDeactivate?(ctx: ToolContext): void;
  onMapClick?(e: { lngLat: { lng: number; lat: number } }, ctx: ToolContext): void;
}
