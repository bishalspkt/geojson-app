import type * as maplibregl from 'maplibre-gl';
import type { MapSettings, MapTheme } from '@/types';
import { isAppLayerId, sysId } from '../layers/ids';

/**
 * Open elevation tiles (Mapzen/Tilezen "Terrarium" encoding on AWS Open Data):
 * free, keyless, CORS-enabled — no serving cost for geojson.app.
 */
export const TERRAIN_TILES_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
export const TERRAIN_ATTRIBUTION =
  '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank">Terrain: Mapzen, AWS Open Data (SRTM, GMTED, ETOPO1…)</a>';

export const TERRAIN_SOURCE = sysId('dem');
const HILLSHADE_SOURCE = sysId('dem-hillshade');
export const HILLSHADE_LAYER = sysId('hillshade');

export const TERRAIN_LAYER_IDS = [HILLSHADE_LAYER];

function demSource(): maplibregl.RasterDEMSourceSpecification {
  return {
    type: 'raster-dem',
    tiles: [TERRAIN_TILES_URL],
    encoding: 'terrarium',
    tileSize: 256,
    maxzoom: 14,
    attribution: TERRAIN_ATTRIBUTION,
  };
}

const isDarkTheme = (theme: MapTheme) => theme === 'dark' || theme === 'black';

/**
 * Hillshade sits above land/water fills but beneath roads, boundaries and
 * labels so the basemap stays legible.
 */
function hillshadeBeforeId(map: maplibregl.Map): string | undefined {
  const layers = map.getStyle()?.layers ?? [];
  const hit = layers.find(
    (l) =>
      !isAppLayerId(l.id) &&
      (l.type === 'symbol' || /^(roads|transit|boundaries|buildings|pois|places|address)/.test(l.id)),
  );
  return hit?.id;
}

/**
 * Idempotently bring terrain, hillshade and sky in line with settings.
 * Safe to call after every style load (theme swaps drop custom sources).
 */
export function applyTerrain(
  map: maplibregl.Map,
  settings: Pick<MapSettings, 'terrain' | 'terrainExaggeration' | 'hillshade' | 'theme'>,
) {
  const dark = isDarkTheme(settings.theme);

  // --- Hillshade ---
  if (settings.hillshade || settings.terrain) {
    if (!map.getSource(HILLSHADE_SOURCE)) map.addSource(HILLSHADE_SOURCE, demSource());
    const paint: maplibregl.HillshadeLayerSpecification['paint'] = {
      'hillshade-exaggeration': settings.terrain ? 0.35 : 0.55,
      'hillshade-shadow-color': dark ? 'rgba(0,0,0,0.75)' : 'rgba(55,45,30,0.55)',
      'hillshade-highlight-color': dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.45)',
      'hillshade-accent-color': dark ? 'rgba(0,0,0,0.4)' : 'rgba(70,60,40,0.3)',
      'hillshade-illumination-anchor': 'viewport',
    };
    if (!map.getLayer(HILLSHADE_LAYER)) {
      map.addLayer({ id: HILLSHADE_LAYER, type: 'hillshade', source: HILLSHADE_SOURCE, paint }, hillshadeBeforeId(map));
    } else {
      for (const [k, v] of Object.entries(paint ?? {})) {
        map.setPaintProperty(HILLSHADE_LAYER, k as keyof typeof paint, v);
      }
    }
  } else {
    if (map.getLayer(HILLSHADE_LAYER)) map.removeLayer(HILLSHADE_LAYER);
    if (map.getSource(HILLSHADE_SOURCE)) map.removeSource(HILLSHADE_SOURCE);
  }

  // --- 3D terrain + sky ---
  if (settings.terrain) {
    if (!map.getSource(TERRAIN_SOURCE)) map.addSource(TERRAIN_SOURCE, demSource());
    map.setTerrain({ source: TERRAIN_SOURCE, exaggeration: settings.terrainExaggeration });
    map.setSky(
      dark
        ? {
            'sky-color': '#0b1020',
            'horizon-color': '#1e293b',
            'fog-color': '#0f172a',
            'sky-horizon-blend': 0.6,
            'horizon-fog-blend': 0.7,
            'fog-ground-blend': 0.85,
            'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 1, 12, 0],
          }
        : {
            'sky-color': '#9ec5f0',
            'horizon-color': '#e7eef7',
            'fog-color': '#eef2f6',
            'sky-horizon-blend': 0.55,
            'horizon-fog-blend': 0.75,
            'fog-ground-blend': 0.9,
            'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 1, 12, 0],
          },
    );
  } else {
    if (map.getTerrain()) map.setTerrain(null);
    if (map.getSource(TERRAIN_SOURCE)) map.removeSource(TERRAIN_SOURCE);
  }
}
