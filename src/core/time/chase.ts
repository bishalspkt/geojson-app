import type { Position } from 'geojson';
import type { TrackPart } from './temporal';

/**
 * Pure building blocks for the chase camera: critically damped springs (so
 * every camera channel accelerates and decelerates smoothly, whatever the
 * frame rate) and along-track geometry (so heading and look-ahead come from
 * where the river goes next, not from the last few noisy vertices).
 */

/**
 * One step of a critically damped spring toward `target` ("smooth damp").
 * Reaches the target in roughly `smoothTime` seconds without overshoot and
 * keeps velocity continuous when the target jumps. Returns [value, velocity].
 */
export function smoothDamp(current: number, target: number, velocity: number, smoothTime: number, dt: number): [number, number] {
  const omega = 2 / Math.max(1e-4, smoothTime);
  const x = omega * dt;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (velocity + omega * change) * dt;
  return [target + (change + temp) * decay, (velocity - omega * temp) * decay];
}

/** Ease-out cubic on [0, 1]. */
export const easeOutCubic = (k: number) => 1 - (1 - Math.min(1, Math.max(0, k))) ** 3;

const R = 6378137;
const toRad = (d: number) => (d * Math.PI) / 180;

/** Web Mercator metres — locally isotropic, so springs move the camera evenly in x and y. */
export function toMercator([lng, lat]: Position): [number, number] {
  return [R * toRad(lng), R * Math.log(Math.tan(Math.PI / 4 + toRad(lat) / 2))];
}

export function fromMercator(x: number, y: number): [number, number] {
  return [(x / R) * (180 / Math.PI), (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * (180 / Math.PI)];
}

/** Ground distance in metres (equirectangular; exact enough below ~50 km). */
export function groundDistance(a: Position, b: Position): number {
  const k = Math.cos(toRad((a[1] + b[1]) / 2));
  return Math.hypot((b[0] - a[0]) * k, b[1] - a[1]) * 111_320;
}

/** A track part with cumulative along-track distances (metres) per vertex. */
export interface MeasuredTrack {
  coords: Position[];
  times: number[];
  cum: number[];
  length: number;
}

export function measureTrack(part: TrackPart): MeasuredTrack {
  const cum = [0];
  for (let i = 1; i < part.coords.length; i++) cum.push(cum[i - 1] + groundDistance(part.coords[i - 1], part.coords[i]));
  return { coords: part.coords, times: part.times, cum, length: cum[cum.length - 1] };
}

/** Along-track distance reached at time `t`, clamped to the track (start before, end after). */
export function distanceAtTime(track: MeasuredTrack, t: number): number {
  const { times, cum } = track;
  const n = times.length;
  if (t <= times[0]) return 0;
  if (t >= times[n - 1]) return track.length;
  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (times[mid] <= t) lo = mid;
    else hi = mid - 1;
  }
  const span = times[lo + 1] - times[lo];
  const f = span > 0 ? (t - times[lo]) / span : 1;
  return cum[lo] + (cum[lo + 1] - cum[lo]) * f;
}

/** Position at along-track distance `s` (clamped to the track). */
export function pointAtDistance(track: MeasuredTrack, s: number): Position {
  const { coords, cum } = track;
  if (s <= 0) return coords[0];
  if (s >= track.length) return coords[coords.length - 1];
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cum[mid] <= s) lo = mid;
    else hi = mid - 1;
  }
  const seg = cum[lo + 1] - cum[lo];
  const f = seg > 0 ? (s - cum[lo]) / seg : 0;
  const a = coords[lo];
  const b = coords[lo + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

/** Front speed in metres per event-millisecond around `t` (central difference over `windowMs`). */
export function speedAtTime(track: MeasuredTrack, t: number, windowMs: number): number {
  const w = Math.max(1, windowMs);
  return (distanceAtTime(track, t + w / 2) - distanceAtTime(track, t - w / 2)) / w;
}

/**
 * Timeline pace (0–1] that keeps the followed front from crossing more than
 * `maxViewSpeed` of the view per second: `groundSpeed` is metres per real
 * second at full pace, `viewMeters` the ground span of the view.
 */
export function paceFor(groundSpeed: number, viewMeters: number, maxViewSpeed: number, minPace = 0.05): number {
  if (!(groundSpeed > 0) || !(viewMeters > 0) || !(maxViewSpeed > 0)) return 1;
  return Math.min(1, Math.max(minPace, (maxViewSpeed * viewMeters) / groundSpeed));
}
