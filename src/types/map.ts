import { FeatureId } from './geojson';

/** One-shot camera focus targets, consumed by the camera engine. */
export type MapFocusTarget =
  | { kind: 'feature'; featureId: FeatureId }
  | { kind: 'bounds'; bounds: [[number, number], [number, number]]; maxZoom?: number }
  | { kind: 'location'; longitude: number; latitude: number; showDot?: boolean }
  | {
      /** A full camera move (story chapters, SDK). Pitch/bearing enable oblique 3D views. */
      kind: 'camera';
      center: [number, number];
      zoom: number;
      pitch?: number;
      bearing?: number;
      /** ms; default scales with distance. */
      duration?: number;
    };

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
  /** 3D terrain from open elevation tiles. */
  terrain: boolean;
  /** Vertical exaggeration applied to 3D terrain (1 = true scale). */
  terrainExaggeration: number;
  /** Shaded relief drawn over the basemap (works with or without 3D). */
  hillshade: boolean;
};
