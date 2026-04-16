import type { Feature } from 'geojson';
import { area } from '@turf/area';
import { length } from '@turf/length';

/** Custom-event name used to request opening the feature-properties dialog. */
export const VIEW_PROPERTIES_EVENT = 'geojson-view-properties';

export interface ViewPropertiesDetail {
  feature: Feature;
}

/** Dispatch an event asking the PropertiesDialog to open for a feature. */
export function openPropertiesDialog(feature: Feature): void {
  window.dispatchEvent(
    new CustomEvent<ViewPropertiesDetail>(VIEW_PROPERTIES_EVENT, {
      detail: { feature },
    }),
  );
}

export const NAME_KEYS = [
  'name', 'Name', 'NAME',
  'title', 'Title', 'TITLE',
  'label', 'Label', 'LABEL',
  'description',
];

/** Keys the app injects internally — hidden from user-facing property views. */
export const INTERNAL_PROPERTY_KEYS = ['_fid', '_featureIndex'];

export function countCoordinatePoints(geometry: Feature['geometry']): number {
  switch (geometry.type) {
    case 'Point': return 1;
    case 'MultiPoint': return geometry.coordinates.length;
    case 'LineString': return geometry.coordinates.length;
    case 'MultiLineString': return geometry.coordinates.reduce((s, c) => s + c.length, 0);
    case 'Polygon': return geometry.coordinates.reduce((s, c) => s + c.length, 0);
    case 'MultiPolygon':
      return geometry.coordinates.reduce(
        (s, rings) => s + rings.reduce((s2, c) => s2 + c.length, 0),
        0,
      );
    default: return 0;
  }
}

export function formatArea(sqm: number): string {
  if (sqm >= 1e6) return `${(sqm / 1e6).toFixed(2)} km²`;
  return `${sqm.toFixed(0)} m²`;
}

export function formatLength(km: number): string {
  if (km < 1) return `${(km * 1000).toFixed(0)} m`;
  return `${km.toFixed(2)} km`;
}

export interface FeatureDetails {
  name: string | null;
  geomType: string;
  detail: string | null;
  numPoints: number;
}

export function getFeatureDetails(feature: Feature): FeatureDetails {
  const props = feature.properties || {};
  let name: string | null = null;
  for (const key of NAME_KEYS) {
    if (typeof props[key] === 'string' && props[key].length > 0) {
      name = props[key];
      break;
    }
  }

  const geomType = feature.geometry.type;
  const numPoints = countCoordinatePoints(feature.geometry);

  let detail: string | null = null;
  if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
    detail = `${formatArea(area(feature))} · ${numPoints} pts`;
  } else if (geomType === 'LineString' || geomType === 'MultiLineString') {
    detail = `${formatLength(length(feature))} · ${numPoints} pts`;
  } else if (geomType === 'Point') {
    const coords = (feature.geometry as GeoJSON.Point).coordinates;
    if (coords.length >= 3 && coords[2] != null) {
      detail = `alt ${coords[2].toFixed(1)} m`;
    }
  } else if (geomType === 'MultiPoint') {
    const coords = (feature.geometry as GeoJSON.MultiPoint).coordinates;
    const alts = coords.filter(c => c.length >= 3 && c[2] != null);
    if (alts.length > 0) {
      detail = `alt ${alts[0][2].toFixed(1)} m${alts.length > 1 ? ` (+${alts.length - 1})` : ''}`;
    }
  }

  return { name, geomType, detail, numPoints };
}
