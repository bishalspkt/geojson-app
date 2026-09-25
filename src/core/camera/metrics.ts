import type * as maplibregl from 'maplibre-gl';

/**
 * Camera measurements from MapLibre's public API (v6 removed `map.transform`).
 */

/** Distance from the camera to the view centre, in CSS pixels. */
export function cameraToCenterPx(map: maplibregl.Map): number {
  const halfFov = (map.getVerticalFieldOfView() * Math.PI) / 360;
  // The canvas size in device pixels needs no layout (clientHeight would force one every frame).
  const canvas = map.getCanvas();
  const halfHeight = (canvas.height / map.getPixelRatio() || 600) / 2;
  return halfHeight / Math.tan(halfFov);
}

/** Integer zoom whose DEM tiles back the current view (for elevation lookups). */
export function terrainTileZoom(map: maplibregl.Map): number {
  return Math.max(0, Math.floor(map.getZoom()));
}
