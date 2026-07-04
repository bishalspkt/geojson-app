import { FeatureId } from './geojson';

/** One-shot camera focus targets, consumed by the camera engine. */
export type MapFocusTarget =
  | { kind: 'feature'; featureId: FeatureId }
  | { kind: 'bounds'; bounds: [[number, number], [number, number]]; maxZoom?: number }
  | { kind: 'location'; longitude: number; latitude: number; showDot?: boolean };

export type MeasurePoint = {
  lng: number;
  lat: number;
};

export type MapTheme = 'light' | 'dark' | 'white' | 'grayscale' | 'black';
export type MapProjection = 'mercator' | 'globe';

export const MAP_THEMES: MapTheme[] = ['light', 'dark', 'white', 'grayscale', 'black'];

export type MapSettings = {
  theme: MapTheme;
  projection: MapProjection;
};
