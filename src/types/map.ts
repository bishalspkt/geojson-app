import { FeatureId } from './geojson';

export type MapFeatureTypeAndId = {
  type: string;
  idx: number;
};

export type MapFeatureFocus = {
  featureId: FeatureId;
};

export type MapFocus = MapFeatureTypeAndId | MapFeatureFocus | GeolocationCoordinates;

export type MeasurePoint = {
  lng: number;
  lat: number;
};

export type MapTheme = 'light' | 'dark' | 'white' | 'grayscale' | 'black';
export type MapProjection = 'mercator' | 'globe';

export type MapSettings = {
  theme: MapTheme;
  projection: MapProjection;
};
