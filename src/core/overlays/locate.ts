import maplibregl from 'maplibre-gl';
import { sysId } from '../layers/ids';

const SOURCE = sysId('locate');
const DOT = sysId('locate-dot');
const GLOW = sysId('locate-glow');

export const LOCATE_LAYER_IDS = [GLOW, DOT];

/** Drop the "you are here" blue dot at a position (replaces any previous dot). */
export function showLocateDot(map: maplibregl.Map, position: { longitude: number; latitude: number }) {
  for (const l of [GLOW, DOT]) {
    if (map.getLayer(l)) map.removeLayer(l);
  }
  if (map.getSource(SOURCE)) map.removeSource(SOURCE);

  map.addSource(SOURCE, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: [position.longitude, position.latitude] },
        },
      ],
    },
  });

  map.addLayer({
    id: GLOW,
    type: 'circle',
    source: SOURCE,
    paint: { 'circle-radius': 18, 'circle-color': '#3b82f6', 'circle-opacity': 0.15 },
  });

  map.addLayer({
    id: DOT,
    type: 'circle',
    source: SOURCE,
    paint: {
      'circle-radius': 7,
      'circle-color': '#3b82f6',
      'circle-stroke-color': '#fff',
      'circle-stroke-width': 2.5,
    },
  });
}
