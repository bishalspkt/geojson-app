import { DataLayer, GeometryCategory, LayerId } from '@/types';

/**
 * Every MapLibre source/layer id in the app is minted here.
 * Namespaces guarantee no collisions between data layers, system overlays,
 * and the basemap:
 *
 *   gj:<layerId>:<bucket>          data-layer sources
 *   gj:<layerId>:<bucket>:<role>   data-layer style layers
 *   gj:<layerId>:pulse[:<role>]    timeline "just appeared" emphasis
 *   gj:<layerId>:track[:<role>]    timeline animated tracks (coordTimes lines)
 *   img:<imageryId>[:raster]       imagery (raster) layers
 *   sys:<name>                     system overlays (highlight, measure, locate, terrain)
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
  /** Text labels (LayerDisplay.labelField). */
  label: string;
  /** Density heatmap (LayerDisplay.heatmap, points only). */
  heat: string;
}

export function dataLayerIds(layerId: LayerId, bucket: GeometryBucket): BucketLayerIds {
  const base = dataSourceId(layerId, bucket);
  return {
    main: `${base}:main`,
    glow: `${base}:glow`,
    casing: `${base}:casing`,
    outline: `${base}:outline`,
    symbol: `${base}:symbol`,
    label: `${base}:label`,
    heat: `${base}:heat`,
  };
}

/** Timeline emphasis for features that just appeared (one small source per layer). */
export function pulseIds(layerId: LayerId) {
  const source = `gj:${layerId}:pulse`;
  return { source, halo: `${source}:halo`, core: `${source}:core` };
}

/** Animated tracks for lines with per-vertex times. */
export function trackIds(layerId: LayerId) {
  const source = `gj:${layerId}:track`;
  const headSource = `${source}-head`;
  return {
    source,
    headSource,
    trail: `${source}:trail`,
    trailGlow: `${source}:trail-glow`,
    headGlow: `${source}:head-glow`,
    head: `${source}:head`,
  };
}

/**
 * Every style-layer id a data layer can own, in draw order (bottom → top):
 * fills, lines, animated trails, markers, pulses, track heads, then labels.
 * Roles a bucket never uses are appended so cleanup stays exhaustive.
 */
export function allDataLayerIds(layerId: LayerId): string[] {
  const poly = dataLayerIds(layerId, 'polygon');
  const line = dataLayerIds(layerId, 'line');
  const pt = dataLayerIds(layerId, 'point');
  const pulse = pulseIds(layerId);
  const track = trackIds(layerId);
  return [
    poly.main,
    poly.outline,
    line.casing,
    line.main,
    track.trailGlow,
    track.trail,
    pt.heat,
    pt.glow,
    pt.main,
    pt.symbol,
    pulse.halo,
    pulse.core,
    track.headGlow,
    track.head,
    poly.label,
    line.label,
    pt.label,
    // Unused bucket/role combinations (never added, listed for cleanup).
    poly.glow,
    poly.casing,
    poly.symbol,
    poly.heat,
    line.glow,
    line.outline,
    line.symbol,
    line.heat,
    pt.casing,
    pt.outline,
  ];
}

/** Imagery (raster) layer ids: `img:<id>` source, `img:<id>:raster` style layer. */
export function imagerySourceId(imageryId: string): string {
  return `img:${imageryId}`;
}

export function imageryLayerId(imageryId: string): string {
  return `${imagerySourceId(imageryId)}:raster`;
}

/** True for ids the app owns (data, imagery, system) — i.e. not basemap layers. */
export function isAppLayerId(id: string): boolean {
  return id.startsWith('gj:') || id.startsWith('img:') || id.startsWith('sys:');
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
