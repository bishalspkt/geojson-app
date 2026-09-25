import type * as maplibregl from 'maplibre-gl';
import { ensureMarkerIcon, MARKER_IMAGE_PREFIX } from '@/style/marker-icons';

const EMPTY_IMAGE = { width: 1, height: 1, data: new Uint8Array(4) };

/**
 * Supplies style images on demand:
 * - `maki-*` marker icons (simplestyle `marker-symbol`) are fetched and
 *   rasterised the first time a feature asks for one;
 * - the basemap sprite lacks a few POI icons its style references (e.g.
 *   "townhall") — those get an empty image instead of a warning per tile.
 */
export function installStyleImageResolver(map: maplibregl.Map): () => void {
  map.setMissingStyleImageResolver(async (id) => {
    if (id.startsWith(MARKER_IMAGE_PREFIX)) {
      await ensureMarkerIcon(map, id.slice(MARKER_IMAGE_PREFIX.length));
      return;
    }
    if (!map.hasImage(id)) map.addImage(id, EMPTY_IMAGE);
  });
  return () => {
    map.setMissingStyleImageResolver(null);
  };
}
