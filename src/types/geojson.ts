import { Feature } from 'geojson';

export type FeatureId = string;

export type GeoJsonPrimaryFeatureTypes =
  | 'Point'
  | 'LineString'
  | 'Polygon'
  | 'MultiPoint'
  | 'MultiLineString'
  | 'MultiPolygon';

/** @deprecated Use GeoJsonPrimaryFeatureTypes instead */
export type GeoJsonPrimaryFetureTypes = GeoJsonPrimaryFeatureTypes;

export type GeometryCategory = 'point' | 'line' | 'polygon';

export interface IdentifiedFeature extends Feature {
  id: FeatureId;
  properties: Feature['properties'] & {
    _fid: FeatureId;
  };
}

export function categorizeGeometry(type: string): GeometryCategory {
  if (type === 'Point' || type === 'MultiPoint') return 'point';
  if (type === 'LineString' || type === 'MultiLineString') return 'line';
  return 'polygon';
}
