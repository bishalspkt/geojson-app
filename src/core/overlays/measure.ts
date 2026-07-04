import maplibregl from 'maplibre-gl';
import { FeatureCollection } from 'geojson';
import { MeasurePoint } from '@/types';
import { sysId } from '../layers/ids';

const SOURCE = sysId('measure');

export const MEASURE_LAYER_IDS = [sysId('measure-line'), sysId('measure-points')];

/** Idempotent: creates the distance-measurement overlay. */
export function ensureMeasureOverlay(map: maplibregl.Map) {
  if (!map.getSource(SOURCE)) {
    map.addSource(SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }
  if (!map.getLayer(sysId('measure-line'))) {
    map.addLayer({
      id: sysId('measure-line'),
      type: 'line',
      source: SOURCE,
      filter: ['==', '$type', 'LineString'],
      paint: { 'line-color': '#d97706', 'line-width': 2.5, 'line-dasharray': [3, 2] },
    });
  }
  if (!map.getLayer(sysId('measure-points'))) {
    map.addLayer({
      id: sysId('measure-points'),
      type: 'circle',
      source: SOURCE,
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': 5,
        'circle-color': '#1e3a5f',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });
  }
}

export function setMeasurePoints(map: maplibregl.Map, points: MeasurePoint[]) {
  const data: FeatureCollection = { type: 'FeatureCollection', features: [] };

  points.forEach((pt, i) => {
    data.features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [pt.lng, pt.lat] },
      properties: { index: i },
    });
  });

  if (points.length >= 2) {
    data.features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: points.map((p) => [p.lng, p.lat]) },
      properties: {},
    });
  }

  const source = map.getSource(SOURCE) as maplibregl.GeoJSONSource | undefined;
  source?.setData(data);
}
