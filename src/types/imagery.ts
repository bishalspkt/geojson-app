import type { LayerOrigin } from './geojson';
import type { LegendSpec } from './legend';

/** Unique id for an imagery (raster) layer, e.g. "R1" or a story-supplied id. */
export type ImageryId = string;

export type LngLatPair = [number, number];

/** Slippy-map raster tiles. `{time}` in a template is filled from the timeline. */
export interface XyzImagerySource {
  type: 'xyz';
  tiles: string[];
  tileSize?: number;
  minzoom?: number;
  maxzoom?: number;
  /** [west, south, east, north] — tiles outside are never requested. */
  bounds?: [number, number, number, number];
  scheme?: 'xyz' | 'tms';
}

/** A single georeferenced image (e.g. a pre-rendered satellite chip). */
export interface ImageImagerySource {
  type: 'image';
  url: string;
  /** Corners as [lng, lat]: top-left, top-right, bottom-right, bottom-left. */
  coordinates: [LngLatPair, LngLatPair, LngLatPair, LngLatPair];
}

/**
 * A cloud-optimised GeoTIFF streamed from its host (CORS + range requests):
 * RGB "visual" scenes from open satellite archives, read at full resolution
 * tile by tile. EPSG:4326, UTM and Web Mercator COGs are supported.
 */
export interface CogImagerySource {
  type: 'cog';
  url: string;
  /** [west, south, east, north] — only this area is drawn (clipped exactly). */
  bounds?: [number, number, number, number];
  /** Zoom range to draw (default 8–20; above maxzoom tiles are upscaled). */
  minzoom?: number;
  maxzoom?: number;
}

export type ImagerySource = XyzImagerySource | ImageImagerySource | CogImagerySource;

/** How `{time}` in an XYZ template is resolved. */
export interface ImageryTimeConfig {
  /** 'date' → 2024-09-28, 'datetime' → 2024-09-28T13:30:00Z, 'month' → 2024-09. */
  format: 'date' | 'datetime' | 'month';
  /** Quantization step in minutes (30 = half-hourly, 1440 = daily). Default: per format. */
  stepMinutes?: number;
  /** Value used while the timeline is off (anything parseable as a time). */
  default: string;
  /** Optional availability window; timeline values are clamped into it. */
  range?: [string, string];
}

export interface ImageryAdjustments {
  saturation?: number;
  contrast?: number;
  brightnessMin?: number;
  brightnessMax?: number;
  hueRotate?: number;
}

/**
 * An imagery layer: satellite scenes, rainfall rasters, water masks…
 * Rendered beneath all data layers; ordered like data layers (later = on top).
 */
export interface ImageryLayer {
  id: ImageryId;
  name: string;
  source: ImagerySource;
  visible: boolean;
  /** 0–1. */
  opacity: number;
  origin: LayerOrigin;
  attribution?: string;
  description?: string;
  time?: ImageryTimeConfig;
  legend?: LegendSpec;
  /**
   * 'below-labels' (default): under basemap labels so place names stay
   * readable. 'top': above the whole basemap (still under data layers).
   */
  placement?: 'below-labels' | 'top';
  adjust?: ImageryAdjustments;
}
