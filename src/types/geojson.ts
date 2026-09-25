import { Feature } from 'geojson';
import type { LegendSpec } from './legend';
import type { TemporalConfig } from './time';

/** Globally unique, stable feature id, e.g. "L1/3". Assigned at ingest. */
export type FeatureId = string;

/** Unique id for a data layer, e.g. "L1". */
export type LayerId = string;

/** Where a layer came from. Drives default naming, analytics, and edit rules. */
export type LayerOrigin = 'upload' | 'url' | 'paste' | 'sample' | 'search' | 'sdk' | 'draw' | 'story';

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
  /** Timeline participation (auto-detected at ingest or set by a story/SDK caller). */
  temporal?: TemporalConfig;
  /** Alternate renderings: labels, heatmap. */
  display?: LayerDisplay;
  /** Legend shown in the layers/story panels. */
  legend?: LegendSpec;
  /** One-line provenance shown in the layers panel (e.g. "BIPAD, Govt. of Nepal"). */
  attribution?: string;
  /** Internal: next per-layer feature sequence number. */
  featureSeq: number;
}

export interface HeatmapDisplay {
  /** Pixel radius at low zoom (default 14). */
  radius?: number;
  /** Numeric property weighting each point (default: every point weighs 1). */
  weightField?: string;
  /** Weight value that saturates the ramp (default 1). */
  maxWeight?: number;
  /** Zoom at which the heatmap hands over to individual markers (default 11). */
  handoverZoom?: number;
  /** Density multiplier; lower it for dense datasets that saturate the ramp (default 1). */
  intensity?: number;
}

/** Layer-level rendering options beyond per-feature simplestyle. */
export interface LayerDisplay {
  /** Property rendered as a text label beside each feature. */
  labelField?: string;
  /** Minimum zoom for labels (default 0). */
  labelMinZoom?: number;
  /** Render points as a density heatmap that fades into markers when zoomed in. */
  heatmap?: boolean | HeatmapDisplay;
  /** Properties shown (in order) in the hover tooltip; default: the first few non-style properties. */
  tooltipFields?: string[];
}

export function categorizeGeometry(type: string): GeometryCategory {
  if (type === 'Point' || type === 'MultiPoint') return 'point';
  if (type === 'LineString' || type === 'MultiLineString') return 'line';
  return 'polygon';
}
