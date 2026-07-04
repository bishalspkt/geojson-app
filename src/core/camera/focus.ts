import maplibregl from 'maplibre-gl';
import { bbox } from '@turf/bbox';
import { Feature, GeoJSON } from 'geojson';
import { MapFocusTarget } from '@/types';
import { showLocateDot } from '../overlays/locate';

export type LngLatBounds = [[number, number], [number, number]];

export function getBoundingBox(geoJson: GeoJSON | Feature): LngLatBounds {
  const b = bbox(geoJson as Parameters<typeof bbox>[0]);
  return [
    [b[0], b[1]],
    [b[2], b[3]],
  ];
}

export type FocusPadding = number | { top: number; right: number; bottom: number; left: number };

export interface FocusOptions {
  padding?: FocusPadding;
  maxZoom?: number;
  maxDuration?: number;
}

/** Execute a one-shot focus request. `resolveFeature` maps a FeatureId to its feature. */
export function executeFocus(
  map: maplibregl.Map,
  target: MapFocusTarget,
  resolveFeature: (featureId: string) => Feature | null,
  options: FocusOptions = {},
) {
  const { padding = 60, maxZoom = 15, maxDuration = 5000 } = options;

  switch (target.kind) {
    case 'feature': {
      const feature = resolveFeature(target.featureId);
      if (!feature) return;
      map.fitBounds(getBoundingBox(feature), { padding, maxZoom, maxDuration });
      return;
    }
    case 'bounds': {
      map.fitBounds(target.bounds, { padding, maxZoom: target.maxZoom ?? maxZoom, maxDuration });
      return;
    }
    case 'location': {
      map.flyTo({ center: [target.longitude, target.latitude], zoom: 15, maxDuration });
      if (target.showDot !== false) {
        showLocateDot(map, target);
      }
      return;
    }
  }
}

export async function getCurrentPosition(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      (error) => reject(error),
    );
  });
}
