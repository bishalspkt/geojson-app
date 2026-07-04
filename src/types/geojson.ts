import { Feature } from 'geojson';

/** Globally unique, stable feature id, e.g. "L1/3". Assigned at ingest. */
export type FeatureId = string;

/** Unique id for a data layer, e.g. "L1". */
export type LayerId = string;

/** Where a layer came from. Drives default naming, analytics, and edit rules. */
export type LayerOrigin = 'upload' | 'url' | 'paste' | 'sample' | 'search' | 'sdk' | 'draw';

export type GeoJsonPrimaryFeatureTypes =
  | 'Point'
  | 'LineString'
  | 'Polygon'
  | 'MultiPoint'
  | 'MultiLineString'
  | 'MultiPolygon';

export type GeometryCategory = 'point' | 'line' | 'polygon';

export interface IdentifiedFeature extends Feature {
  id: FeatureId;
  properties: Feature['properties'] & {
    _fid: FeatureId;
  };
}

/**
 * A data layer: an independently sourced, styled, and toggled dataset.
 * Layers are ordered (index = z-order, later renders on top) and immutable —
 * every mutation produces a new layer object so renderers can diff by identity.
 */
export interface DataLayer {
  id: LayerId;
  name: string;
  origin: LayerOrigin;
  features: IdentifiedFeature[];
  visible: boolean;
  /**
   * Raw MapLibre paint overrides, merged over resolved simplestyle paint.
   * Keys are routed to the matching geometry bucket by prefix
   * (circle-* → points, line-* → lines, fill-* → polygons).
   * Used by the embed SDK's addLayer({ paint }) API.
   */
  paint?: Record<string, unknown>;
  /** Internal: next per-layer feature sequence number. */
  featureSeq: number;
}

export function categorizeGeometry(type: string): GeometryCategory {
  if (type === 'Point' || type === 'MultiPoint') return 'point';
  if (type === 'LineString' || type === 'MultiLineString') return 'line';
  return 'polygon';
}
