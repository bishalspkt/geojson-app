import type { Feature, FeatureCollection, Point } from 'geojson';
import type * as maplibregl from 'maplibre-gl';
import type { IdentifiedFeature, TemporalConfig, TimeExtent } from '@/types';
import { featureInterval, partialTrack, trackParts, TrackPart } from '../time/temporal';

/**
 * Pure helpers that turn temporal layer data into MapLibre-ready structures.
 * The renderer owns the map calls; everything here is testable in Node.
 *
 * Source-only properties (never stored, never leave the app):
 *   _t0 / _t1  start / end instant, epoch ms
 *   _trk       1 for lines animated as tracks (per-vertex times)
 *   _age       0–1 pulse progress (pulse source only)
 */

/** What the renderer needs to know about the timeline right now. */
export interface RenderTime {
  t: number;
  /** Sliding window in ms; null = cumulative. */
  window: number | null;
  extent: TimeExtent;
}

/** Copy features for a map source, adding `_t0/_t1/_trk` when the layer is temporal. */
export function withTimeProperties(features: IdentifiedFeature[], cfg: TemporalConfig | undefined): Feature[] {
  if (!cfg) return features;
  return features.map((f) => {
    const iv = featureInterval(f, cfg);
    if (!iv) return f;
    const isTrack = !!cfg.coordTimesField && trackParts(f, cfg.coordTimesField) !== null;
    return {
      ...f,
      properties: { ...f.properties, _t0: iv[0], _t1: iv[1], ...(isTrack ? { _trk: 1 } : {}) },
    };
  });
}

/**
 * Filter showing features active at `t`. Untimed features always show;
 * tracks show in full only once complete (the animated trail covers the rest).
 */
export function timeFilter(time: RenderTime): maplibregl.ExpressionSpecification {
  const { t, window } = time;
  const started: maplibregl.ExpressionSpecification = ['<=', ['get', '_t0'], t];
  const inWindow: maplibregl.ExpressionSpecification | null =
    window !== null ? ['>=', ['get', '_t1'], t - window] : null;
  return [
    'any',
    ['!', ['has', '_t0']],
    [
      'case',
      ['has', '_trk'],
      ['<=', ['get', '_t1'], t],
      inWindow ? ['all', started, inWindow] : started,
    ],
  ];
}

/** Combine optional filters with `all`, dropping nulls. */
export function combineFilters(
  ...filters: (maplibregl.FilterSpecification | null | undefined)[]
): maplibregl.FilterSpecification | null {
  const present = filters.filter((f): f is maplibregl.FilterSpecification => !!f);
  if (present.length === 0) return null;
  if (present.length === 1) return present[0];
  return ['all', ...(present as maplibregl.ExpressionSpecification[])];
}

/**
 * Quantize a time for filter updates: at most ~`steps` distinct filters across
 * the extent, so playback re-filters large layers a few times per second
 * instead of every frame.
 */
export function quantizeForFilter(time: RenderTime, steps = 400): number {
  const span = Math.max(1, time.extent[1] - time.extent[0]);
  const step = span / steps;
  return time.extent[0] + Math.floor((time.t - time.extent[0]) / step) * step;
}

export function defaultPulseMs(extent: TimeExtent): number {
  return Math.max(1, (extent[1] - extent[0]) * 0.04);
}

/** Point instants sorted by start time, for fast "what just appeared" lookups. */
export interface PulseIndex {
  times: number[];
  features: Feature<Point>[];
}

export function buildPulseIndex(features: IdentifiedFeature[], cfg: TemporalConfig): PulseIndex {
  const entries: { t: number; f: Feature<Point> }[] = [];
  for (const f of features) {
    if (f.geometry?.type !== 'Point') continue;
    const iv = featureInterval(f, cfg);
    if (!iv) continue;
    entries.push({
      t: iv[0],
      f: {
        type: 'Feature',
        geometry: f.geometry,
        properties: { _fid: f.id, 'marker-color': f.properties?.['marker-color'] ?? null },
      },
    });
  }
  entries.sort((a, b) => a.t - b.t);
  return { times: entries.map((e) => e.t), features: entries.map((e) => e.f) };
}

function lowerBound(sorted: number[], value: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Features that appeared within the last `pulseMs`, with `_age` 0 (new) → 1 (fading out). */
export function pulseCollection(
  index: PulseIndex,
  t: number,
  pulseMs: number,
  hidden: Set<string>,
  maxFeatures = 400,
): FeatureCollection {
  const from = lowerBound(index.times, t - pulseMs);
  const to = lowerBound(index.times, t + 1e-9);
  const features: Feature[] = [];
  for (let i = Math.max(from, to - maxFeatures); i < to; i++) {
    const f = index.features[i];
    if (hidden.has(f.properties!._fid as string)) continue;
    const age = Math.min(1, Math.max(0, (t - index.times[i]) / pulseMs));
    features.push({ ...f, properties: { ...f.properties, _age: age } });
  }
  return { type: 'FeatureCollection', features };
}

export interface TrackEntry {
  fid: string;
  parts: TrackPart[];
  width: number | null;
}

export function buildTrackEntries(features: IdentifiedFeature[], cfg: TemporalConfig): TrackEntry[] {
  if (!cfg.coordTimesField) return [];
  const out: TrackEntry[] = [];
  for (const f of features) {
    const parts = trackParts(f, cfg.coordTimesField);
    if (!parts) continue;
    const w = Number(f.properties?.['stroke-width']);
    out.push({ fid: f.id, parts, width: Number.isFinite(w) && w > 0 ? w : null });
  }
  return out;
}

/** Visible trails (one LineString per started part) and moving heads at time `t`. */
export function trackCollections(
  entries: TrackEntry[],
  t: number,
  hidden: Set<string>,
): { trails: FeatureCollection; heads: FeatureCollection } {
  const trails: Feature[] = [];
  const heads: Feature[] = [];
  for (const entry of entries) {
    if (hidden.has(entry.fid)) continue;
    for (const part of entry.parts) {
      const p = partialTrack(part, t);
      if (!p) continue;
      if (p.coords.length >= 2) {
        trails.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: p.coords },
          properties: { _fid: entry.fid, w: entry.width },
        });
      }
      if (!p.done) {
        heads.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: p.head },
          properties: { _fid: entry.fid },
        });
      }
    }
  }
  return {
    trails: { type: 'FeatureCollection', features: trails },
    heads: { type: 'FeatureCollection', features: heads },
  };
}

/** '#f97316' → 'rgba(249,115,22,0.3)'. Non-hex colors pass through unchanged. */
export function withAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return color;
  const hex = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  const n = parseInt(hex, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
