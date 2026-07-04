import { DataLayer, GeometryCategory, LayerId } from '@/types';

/**
 * Every MapLibre source/layer id in the app is minted here.
 * Namespaces guarantee no collisions between data layers, system overlays,
 * and the basemap:
 *
 *   gj:<layerId>:<bucket>          data-layer sources
 *   gj:<layerId>:<bucket>:<role>   data-layer style layers
 *   sys:<name>                     system overlays (highlight, measure, locate)
 *
 * Never hand-write one of these strings outside this module.
 */

export type GeometryBucket = GeometryCategory; // 'point' | 'line' | 'polygon'

export const BUCKETS: GeometryBucket[] = ['polygon', 'line', 'point'];

export function dataSourceId(layerId: LayerId, bucket: GeometryBucket): string {
  return `gj:${layerId}:${bucket}`;
}

export interface BucketLayerIds {
  main: string;
  glow: string;
  casing: string;
  outline: string;
  symbol: string;
}

export function dataLayerIds(layerId: LayerId, bucket: GeometryBucket): BucketLayerIds {
  const base = dataSourceId(layerId, bucket);
  return {
    main: `${base}:main`,
    glow: `${base}:glow`,
    casing: `${base}:casing`,
    outline: `${base}:outline`,
    symbol: `${base}:symbol`,
  };
}

/** All style-layer ids a data layer can own (whether or not currently added). */
export function allDataLayerIds(layerId: LayerId): string[] {
  return BUCKETS.flatMap((b) => Object.values(dataLayerIds(layerId, b)));
}

/** Style-layer ids that respond to pointer events, for the given layers. */
export function interactiveLayerIds(layers: DataLayer[]): string[] {
  return layers.flatMap((l) => [
    dataLayerIds(l.id, 'polygon').main,
    dataLayerIds(l.id, 'line').main,
    dataLayerIds(l.id, 'point').main,
    dataLayerIds(l.id, 'point').symbol,
  ]);
}

export function sysId(name: string): string {
  return `sys:${name}`;
}

/** Sanitize a caller-supplied id (embed SDK) into a safe LayerId. */
export function sanitizeExternalLayerId(raw: string): LayerId {
  return `sdk-${raw.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}
