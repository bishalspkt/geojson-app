/**
 * The map engine's public surface. Heavy, optional modules (imagery/COG,
 * terrain, chase camera, compare map) are deliberately NOT re-exported here:
 * import them by path from a lazily loaded module so they stay out of the
 * initial bundle.
 */
export { startMapEngine, isDarkTheme, CONTEXT_MENU_EVENT, currentRenderTime, derivedTimeExtent } from './engine';
export type { MapEngineOptions, MapContextMenuContext } from './engine';
export type { EngineBinding } from './bindings/types';

export { buildBasemapStyle, DEFAULT_TILES_URL, ATTRIBUTION } from './basemap/style';
export type { BasemapOptions } from './basemap/style';
export { generateStarfieldBackground } from './basemap/starfield';

export { createLayerRenderer } from './layers/renderer';
export type { LayerRenderer } from './layers/renderer';
export {
  dataSourceId,
  dataLayerIds,
  allDataLayerIds,
  interactiveLayerIds,
  sysId,
  sanitizeExternalLayerId,
  BUCKETS,
} from './layers/ids';
export { attachLayerInteractions, queryDataFeatures } from './layers/interactions';

export { ensureHighlightOverlay, setHighlightedFeature } from './overlays/highlight';
export { ensureMeasureOverlay, setMeasurePoints } from './overlays/measure';
export { showLocateDot } from './overlays/locate';

export { executeFocus, getBoundingBox, getCurrentPosition } from './camera/focus';
export type { FocusOptions, FocusPadding, LngLatBounds } from './camera/focus';

export type { MapTool, ToolContext } from './tools';

export type { RenderTime } from './layers/temporal-render';
export {
  parseTime,
  featureInterval,
  layerTimeExtent,
  unionExtents,
  detectTemporalConfig,
  partialTrack,
  trackParts,
  imageryTimeParam,
} from './time/temporal';
export { formatInstant, formatDuration, granularityFor } from './time/format';
export type { TimeGranularity } from './time/format';
