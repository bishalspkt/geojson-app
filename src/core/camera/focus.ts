import type * as maplibregl from 'maplibre-gl';
import { bbox } from '@turf/bbox';
import { Feature, GeoJSON } from 'geojson';
import { MapFocusTarget } from '@/types';
import { showLocateDot } from '../overlays/locate';
import { easeInOutQuad, flightDurationMs } from './flight';

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
  /** Room around fitted features/bounds, on top of the map's own padding. */
  padding?: FocusPadding;
  maxZoom?: number;
  maxDuration?: number;
  /**
   * The map's padding (UI covering its edges) to animate to during the move, so
   * the target lands in the middle of what's visible. Fits use the current one.
   */
  viewPadding?: maplibregl.PaddingOptions;
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
      map.flyTo({ center: [target.longitude, target.latitude], zoom: 15, maxDuration, padding: options.viewPadding });
      if (target.showDot !== false) {
        showLocateDot(map, target);
      }
      return;
    }
    case 'camera': {
      // Constant perceived speed: long flights take longer instead of rushing;
      // `duration` is the shortest a flight may take.
      const from = map.getCenter();
      const canvas = map.getCanvas();
      const duration = flightDurationMs(
        {
          from: { lng: from.lng, lat: from.lat, zoom: map.getZoom() },
          to: { lng: target.center[0], lat: target.center[1], zoom: target.zoom },
          width: canvas.clientWidth || 800,
          height: canvas.clientHeight || 600,
        },
        { minMs: target.duration ?? 1800 },
      );
      map.flyTo({
        center: target.center,
        zoom: target.zoom,
        pitch: target.pitch ?? 0,
        bearing: target.bearing ?? 0,
        padding: options.viewPadding,
        essential: true,
        duration,
        easing: easeInOutQuad,
      });
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
