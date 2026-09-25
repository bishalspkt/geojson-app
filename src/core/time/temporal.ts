import type { Feature, Position } from 'geojson';
import type { DataLayer, ImageryTimeConfig, TemporalConfig, TimeExtent } from '@/types';

/**
 * Pure time helpers shared by the renderer, the timeline, stories, and the
 * SDK. No MapLibre, no stores — everything here is unit-testable in Node.
 */

const YEAR_RE = /^\d{4}$/;
const MONTH_RE = /^(\d{4})-(\d{2})$/;
const ISO_PREFIX_RE = /^\d{4}-\d{2}-\d{2}/;
const SPACE_DATETIME_RE = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}.*)$/;

/** Epoch-seconds values are accepted between these bounds (1973 → 5138). */
const MIN_EPOCH_SECONDS = 1e8;
const MAX_EPOCH_SECONDS = 1e11;

/**
 * Parse a property value into epoch milliseconds.
 * Accepts ISO-8601 strings (date or date-time, `T` or space separator),
 * `YYYY`, `YYYY-MM`, 4-digit year numbers, epoch ms, and epoch seconds.
 * Returns null for anything that isn't a plausible instant.
 */
export function parseTime(value: unknown): number | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    if (Number.isInteger(value) && value >= 1000 && value <= 9999) return Date.UTC(value, 0, 1);
    if (Math.abs(value) >= MAX_EPOCH_SECONDS) return value;
    if (value >= MIN_EPOCH_SECONDS) return value * 1000;
    return null;
  }
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (YEAR_RE.test(s)) return Date.UTC(Number(s), 0, 1);
  const month = MONTH_RE.exec(s);
  if (month) {
    const m = Number(month[2]);
    return m >= 1 && m <= 12 ? Date.UTC(Number(month[1]), m - 1, 1) : null;
  }
  const normalized = s.replace(SPACE_DATETIME_RE, '$1T$2');
  if (!ISO_PREFIX_RE.test(normalized)) return null;
  const t = Date.parse(normalized);
  return Number.isNaN(t) ? null : t;
}

/** Read a possibly dotted property path (`coordinateProperties.times`). */
export function getPropertyPath(props: Record<string, unknown> | null | undefined, path: string): unknown {
  if (!props) return undefined;
  if (path in props) return props[path];
  let cur: unknown = props;
  for (const part of path.split('.')) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export interface TrackPart {
  coords: Position[];
  /** Epoch ms per vertex, non-decreasing, same length as coords. */
  times: number[];
}

function parseTimeArray(raw: unknown, expectedLength: number): number[] | null {
  if (!Array.isArray(raw) || raw.length !== expectedLength || expectedLength < 2) return null;
  const out: number[] = new Array(raw.length);
  let prev = -Infinity;
  for (let i = 0; i < raw.length; i++) {
    const t = parseTime(raw[i]);
    if (t === null) return null;
    // Enforce monotonic time so interpolation is always well-defined.
    prev = Math.max(prev, t);
    out[i] = prev;
  }
  return out;
}

/**
 * Per-vertex times for an animated line. LineString expects a flat array;
 * MultiLineString expects one array per part. Null when absent/misaligned.
 */
export function trackParts(feature: Feature, field: string): TrackPart[] | null {
  const raw = getPropertyPath(feature.properties, field);
  const g = feature.geometry;
  if (!g || raw == null) return null;
  if (g.type === 'LineString') {
    const times = parseTimeArray(raw, g.coordinates.length);
    return times ? [{ coords: g.coordinates, times }] : null;
  }
  if (g.type === 'MultiLineString') {
    if (!Array.isArray(raw) || raw.length !== g.coordinates.length) return null;
    const parts: TrackPart[] = [];
    for (let i = 0; i < g.coordinates.length; i++) {
      const times = parseTimeArray(raw[i], g.coordinates[i].length);
      if (!times) return null;
      parts.push({ coords: g.coordinates[i], times });
    }
    return parts;
  }
  return null;
}

/** [start, end] of one feature under a temporal config, or null if it has no time. */
export function featureInterval(feature: Feature, cfg: TemporalConfig): TimeExtent | null {
  const props = feature.properties;
  let t0 = cfg.startField ? parseTime(getPropertyPath(props, cfg.startField)) : null;
  let t1 = cfg.endField ? parseTime(getPropertyPath(props, cfg.endField)) : null;
  if (cfg.coordTimesField) {
    const parts = trackParts(feature, cfg.coordTimesField);
    if (parts) {
      let lo = Infinity;
      let hi = -Infinity;
      for (const p of parts) {
        lo = Math.min(lo, p.times[0]);
        hi = Math.max(hi, p.times[p.times.length - 1]);
      }
      t0 ??= lo;
      t1 ??= hi;
    }
  }
  if (t0 === null) return null;
  if (t1 === null || t1 < t0) t1 = t0;
  return [t0, t1];
}

/** Union of all feature intervals in a layer, or null if nothing is timed. */
export function layerTimeExtent(layer: {
  features: Feature[];
  temporal?: DataLayer['temporal'];
}): TimeExtent | null {
  if (!layer.temporal) return null;
  let lo = Infinity;
  let hi = -Infinity;
  for (const f of layer.features) {
    const iv = featureInterval(f, layer.temporal);
    if (!iv) continue;
    if (iv[0] < lo) lo = iv[0];
    if (iv[1] > hi) hi = iv[1];
  }
  return lo <= hi ? [lo, hi] : null;
}

/** Union of extents; null entries are ignored. */
export function unionExtents(extents: (TimeExtent | null)[]): TimeExtent | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (const e of extents) {
    if (!e) continue;
    lo = Math.min(lo, e[0]);
    hi = Math.max(hi, e[1]);
  }
  return lo <= hi ? [lo, hi] : null;
}

const START_KEYS = ['time', 'timestamp', 'datetime', 'date', 'start', 'starttime', 'start_time', 'begin', 'when'];
const END_KEYS = ['end', 'endtime', 'end_time', 'until', 'stop'];
const COORD_TIME_KEYS = ['coordTimes', 'coordinateProperties.times'];
const DETECT_SAMPLE = 300;

function findKey(sample: Feature[], candidates: string[]): string | undefined {
  // Map lower-case → actual key, from whatever keys the sample uses.
  const actual = new Map<string, string>();
  for (const f of sample) {
    for (const key of Object.keys(f.properties ?? {})) {
      const lower = key.toLowerCase();
      if (!actual.has(lower)) actual.set(lower, key);
    }
  }
  for (const candidate of candidates) {
    const key = actual.get(candidate);
    if (!key) continue;
    let present = 0;
    let parsed = 0;
    for (const f of sample) {
      const v = f.properties?.[key];
      if (v == null || v === '') continue;
      present++;
      if (parseTime(v) !== null) parsed++;
    }
    if (present >= sample.length * 0.5 && parsed >= present * 0.9) return key;
  }
  return undefined;
}

/**
 * Guess a temporal config from common property names. Returns undefined when
 * the data has no usable time, or when every feature shares one instant
 * (a timeline over a single moment isn't useful).
 */
export function detectTemporalConfig(features: Feature[]): TemporalConfig | undefined {
  if (features.length === 0) return undefined;
  const sample = features.length <= DETECT_SAMPLE
    ? features
    : Array.from({ length: DETECT_SAMPLE }, (_, i) => features[Math.floor((i * features.length) / DETECT_SAMPLE)]);

  const cfg: TemporalConfig = {};
  const lines = sample.filter((f) => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString');
  for (const key of COORD_TIME_KEYS) {
    if (lines.some((f) => trackParts(f, key) !== null)) {
      cfg.coordTimesField = key;
      break;
    }
  }
  const start = findKey(sample, START_KEYS);
  if (start) {
    cfg.startField = start;
    const end = findKey(sample, END_KEYS);
    if (end) cfg.endField = end;
  }
  if (!cfg.startField && !cfg.coordTimesField) return undefined;

  const extent = layerTimeExtent({ features, temporal: cfg });
  if (!extent || extent[1] <= extent[0]) return undefined;
  return cfg;
}

/**
 * The visible prefix of a track at time `t`: every vertex already reached plus
 * an interpolated head. Null before the track starts.
 */
export function partialTrack(part: TrackPart, t: number): { coords: Position[]; head: Position; done: boolean } | null {
  const { coords, times } = part;
  const n = coords.length;
  if (n === 0 || t < times[0]) return null;
  if (t >= times[n - 1]) return { coords, head: coords[n - 1], done: true };
  // Last vertex with time <= t.
  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (times[mid] <= t) lo = mid;
    else hi = mid - 1;
  }
  const a = coords[lo];
  const b = coords[lo + 1];
  const span = times[lo + 1] - times[lo];
  const f = span > 0 ? (t - times[lo]) / span : 1;
  const head: Position = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  return { coords: [...coords.slice(0, lo + 1), head], head, done: false };
}

/** True when a feature interval should be drawn at time `t` (cumulative or sliding window). */
export function isActiveAt(interval: TimeExtent, t: number, windowMs: number | null): boolean {
  if (interval[0] > t) return false;
  if (windowMs === null) return true;
  return interval[1] >= t - windowMs;
}

const DEFAULT_STEP_MINUTES: Record<ImageryTimeConfig['format'], number> = {
  datetime: 30,
  date: 1440,
  month: 0,
};

/**
 * Resolve an imagery layer's `{time}` value for timeline time `t`
 * (null = timeline off → the layer's default). Quantized in UTC.
 */
export function imageryTimeParam(cfg: ImageryTimeConfig, t: number | null): string {
  let value = t ?? parseTime(cfg.default) ?? Date.now();
  if (cfg.range) {
    const lo = parseTime(cfg.range[0]);
    const hi = parseTime(cfg.range[1]);
    if (lo !== null) value = Math.max(value, lo);
    if (hi !== null) value = Math.min(value, hi);
  }
  const iso = (ms: number) => new Date(ms).toISOString();
  if (cfg.format === 'month') return iso(value).slice(0, 7);
  const stepMs = (cfg.stepMinutes ?? DEFAULT_STEP_MINUTES[cfg.format]) * 60_000;
  const q = stepMs > 0 ? Math.floor(value / stepMs) * stepMs : value;
  return cfg.format === 'date' ? iso(q).slice(0, 10) : `${iso(q).slice(0, 19)}Z`;
}

/** Substitute `{time}` in tile URL templates. */
export function resolveTimeTemplate(tiles: string[], timeParam: string | null): string[] {
  if (timeParam === null) return tiles;
  return tiles.map((t) => t.split('{time}').join(timeParam));
}

export function hasTimeTemplate(tiles: string[]): boolean {
  return tiles.some((t) => t.includes('{time}'));
}
