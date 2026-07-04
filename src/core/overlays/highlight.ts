import maplibregl from 'maplibre-gl';
import { Feature } from 'geojson';
import { DEFAULTS } from '@/style';
import { sysId } from '../layers/ids';

const SOURCE = sysId('highlight');

export const HIGHLIGHT_LAYER_IDS = [
  sysId('highlight-fill-glow'),
  sysId('highlight-outline'),
  sysId('highlight-line-glow'),
  sysId('highlight-line'),
  sysId('highlight-circle-glow'),
  sysId('highlight-circle'),
];

/** Idempotent: creates the selection-highlight overlay (source + layers). */
export function ensureHighlightOverlay(map: maplibregl.Map) {
  if (map.getSource(SOURCE)) return;

  map.addSource(SOURCE, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });

  const glow = DEFAULTS.highlight.glowColor;
  const stroke = DEFAULTS.highlight.strokeColor;
  const fill = DEFAULTS.highlight.fillColor;
  const round = { 'line-cap': 'round' as const, 'line-join': 'round' as const };

  map.addLayer({
    id: sysId('highlight-fill-glow'),
    type: 'fill',
    source: SOURCE,
    filter: ['==', '$type', 'Polygon'],
    paint: { 'fill-color': glow, 'fill-opacity': 0.25 },
  });
  map.addLayer({
    id: sysId('highlight-outline'),
    type: 'line',
    source: SOURCE,
    filter: ['==', '$type', 'Polygon'],
    layout: round,
    paint: { 'line-color': stroke, 'line-width': 3 },
  });
  map.addLayer({
    id: sysId('highlight-line-glow'),
    type: 'line',
    source: SOURCE,
    filter: ['==', '$type', 'LineString'],
    layout: round,
    paint: { 'line-color': glow, 'line-width': 8, 'line-opacity': 0.4 },
  });
  map.addLayer({
    id: sysId('highlight-line'),
    type: 'line',
    source: SOURCE,
    filter: ['==', '$type', 'LineString'],
    layout: round,
    paint: { 'line-color': stroke, 'line-width': 4 },
  });
  map.addLayer({
    id: sysId('highlight-circle-glow'),
    type: 'circle',
    source: SOURCE,
    filter: ['==', '$type', 'Point'],
    paint: { 'circle-radius': 16, 'circle-color': glow, 'circle-opacity': 0.3 },
  });
  map.addLayer({
    id: sysId('highlight-circle'),
    type: 'circle',
    source: SOURCE,
    filter: ['==', '$type', 'Point'],
    paint: {
      'circle-radius': 7,
      'circle-color': fill,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2.5,
    },
  });
}

/** Show the highlight on a feature, or clear it with null. */
export function setHighlightedFeature(map: maplibregl.Map, feature: Feature | null) {
  const source = map.getSource(SOURCE) as maplibregl.GeoJSONSource | undefined;
  if (!source) return;
  source.setData({
    type: 'FeatureCollection',
    features: feature ? [feature] : [],
  });
}
