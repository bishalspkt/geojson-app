import * as maplibregl from 'maplibre-gl';
import type { Position } from 'geojson';
import type { DataLayer } from '@/types';
import type { TimeFollow } from '@/state/time-store';
import { cameraToCenterPx, terrainTileZoom } from '../camera/metrics';
import { createElevationSampler, type ElevationSampler } from '../basemap/elevation';
import {
  distanceAtTime,
  easeOutCubic,
  fromMercator,
  groundDistance,
  measureTrack,
  paceFor,
  pointAtDistance,
  smoothDamp,
  speedAtTime,
  toMercator,
  type MeasuredTrack,
} from './chase';
import { partialTrack, trackParts, TrackPart } from './temporal';

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** MapLibre's earth radius; with a 512 px tile it fixes metres per pixel at each zoom. */
const EARTH_CIRCUMFERENCE = 2 * Math.PI * 6371008.8;

/** Initial bearing (degrees) from a to b. */
export function bearingBetween(a: Position, b: Position): number {
  const φ1 = toRad(a[1]);
  const φ2 = toRad(b[1]);
  const Δλ = toRad(b[0] - a[0]);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Shortest signed angular difference b − a in degrees, in [−180, 180). */
export function angleDelta(a: number, b: number): number {
  return ((((b - a) % 360) + 540) % 360) - 180;
}

/** Point `meters` from `origin` along `bearing` (local flat-earth; fine below ~50 km). */
export function offsetPosition(origin: Position, meters: number, bearing: number): Position {
  const b = toRad(bearing);
  return [
    origin[0] + (meters * Math.sin(b)) / (111_320 * Math.cos(toRad(origin[1]))),
    origin[1] + (meters * Math.cos(b)) / 111_320,
  ];
}

/** Camera-to-centre distance in metres for a MapLibre view at `zoom` over latitude `lat`. */
export function cameraDistanceMeters(cameraToCenterPx: number, zoom: number, lat: number): number {
  return (cameraToCenterPx / (512 * 2 ** zoom)) * EARTH_CIRCUMFERENCE * Math.cos(toRad(lat));
}

/** Head position and travel direction of the first active track part at `t`. */
export function trackHead(parts: TrackPart[], t: number, lookBackMs: number): { head: Position; bearing: number | null } | null {
  for (const part of parts) {
    const now = partialTrack(part, t);
    if (!now || now.done) continue;
    const before = partialTrack(part, t - lookBackMs);
    const from = before ? before.head : part.coords[0];
    const moved = Math.abs(from[0] - now.head[0]) + Math.abs(from[1] - now.head[1]) > 1e-7;
    return { head: now.head, bearing: moved ? bearingBetween(from, now.head) : null };
  }
  return null;
}

/** Rendered terrain for sight-line checks: heights already include exaggeration. */
export interface ChaseTerrain {
  /** Ground height at `p`, `x` metres (horizontally) from the head; null if unknown. */
  heightAt(p: Position, x: number): number | null;
  /** Required gap between sight line and ground, by horizontal distance from the head. */
  clearance(x: number): number;
}

/** Clearance grows away from the head: the line must meet the ground at the head itself. */
export const chaseClearance = (exaggeration: number) => (x: number) =>
  Math.min(250 * exaggeration, 25 + 0.1 * x);

/**
 * The largest pitch ≤ `pitch` at which a camera `distance` metres from the
 * head (ground height `headHeight`), looking along `bearing`, sees the head
 * over the terrain between them and is itself above ground. Lowering the
 * pitch orbits the camera upward at constant distance, so zoom is unchanged.
 * Unknown heights (tiles still loading) are ignored.
 */
export function clearPitch(
  head: Position,
  headHeight: number,
  bearing: number,
  pitch: number,
  distance: number,
  terrain: ChaseTerrain,
  { samples = 64, minPitch = 0 }: { samples?: number; minPitch?: number } = {},
): number {
  const back = bearing + 180;
  const reach = distance * Math.sin(toRad(pitch));
  // Terrain along the reverse bearing, as heights above the head.
  const obstacles: { x: number; h: number }[] = [];
  for (let i = 1; i <= samples; i++) {
    const x = (reach * i) / samples;
    const ground = terrain.heightAt(offsetPosition(head, x, back), x);
    if (ground === null) continue;
    const h = ground + terrain.clearance(x) - headHeight;
    if (h > 0) obstacles.push({ x, h });
  }
  const clear = (p: number) => {
    const tan = Math.tan(toRad(p));
    const dh = distance * Math.sin(toRad(p));
    // Sight line height at x is x / tan(p).
    for (const o of obstacles) if (o.x <= dh && o.h * tan > o.x) return false;
    const under = terrain.heightAt(offsetPosition(head, dh, back), dh);
    return under === null || under + terrain.clearance(dh) <= headHeight + distance * Math.cos(toRad(p));
  };
  if (clear(pitch)) return pitch;
  let lo = minPitch;
  let hi = pitch;
  for (let k = 0; k < 12; k++) {
    const mid = (lo + hi) / 2;
    if (clear(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** What the chase camera needs from the timeline, refreshed on every time change. */
export interface FollowInput {
  layer: DataLayer | undefined;
  follow: TimeFollow | null;
  /** Timeline instant, epoch ms. */
  t: number;
  /** Event milliseconds per real millisecond at full pace (extent / duration × speed). */
  rate: number;
  playing: boolean;
}

export interface TrackFollowerOptions {
  sampler?: ElevationSampler;
  /** Timeline pace (0–1] while a follow with `maxViewSpeed` plays; 1 otherwise. */
  onPace?: (pace: number) => void;
}

interface Rig {
  x: number;
  y: number;
  zoom: number;
  bearing: number;
  pitch: number;
  /** Terrain-limited pitch goal, itself smoothed before the pitch follows it. */
  pitchGoal: number;
  elevation: number | null;
  vx: number;
  vy: number;
  vZoom: number;
  vBearing: number;
  vPitch: number;
  vPitchGoal: number;
  vElevation: number;
  /** Camera settings when the rig took over (fallbacks for unset follow fields). */
  zoom0: number;
  pitch0: number;
  startedAt: number;
}

/** Seconds each camera channel takes to settle once the rig has blended in. */
const SMOOTH = { position: 0.6, zoom: 1.6, bearing: 1.9, pitchUp: 1.6, pitchDown: 0.6, elevation: 0.35 };
/**
 * Smoothing of the terrain-clearance pitch goal itself. The limit steps when a
 * ridge enters the look-ahead, and a spring fed a step starts with a kick; two
 * springs in series ease in and out instead.
 */
const GOAL_SMOOTH = { down: 0.35, up: 0.9 };
/** The rig eases in from the chapter's camera over this long (ms). */
const BLEND_IN_MS = 3500;

/**
 * Chase camera: while the timeline plays, a camera rig trails an animated
 * track's front like a drone — critically damped springs on position, zoom,
 * heading, pitch and ground height, advanced on its own animation loop, so
 * the motion stays smooth when the front speeds up, turns or stops, and the
 * camera eases in from wherever it was when playback started (and settles
 * gently after it pauses). The heading follows where the track goes over the
 * next few kilometres, with a little lead room ahead of the front.
 *
 * With 3D terrain, the pitch drops whenever a ridge would come between camera
 * and front (see `clearPitch`), checking ahead so the camera rises early.
 * With `maxViewSpeed`, the timeline slows down while the front is fast so it
 * never races across the view. A user drag or zoom suspends following until
 * playback restarts; any other camera move (a chapter flight) stops it.
 */
export function createTrackFollower(map: maplibregl.Map, options: TrackFollowerOptions = {}) {
  const sampler = options.sampler ?? createElevationSampler();
  const onPace = options.onPace ?? (() => {});
  let cachedFeatures: DataLayer['features'] | null = null;
  let cachedTracks: MeasuredTrack[] = [];
  let prefetchedFor: MeasuredTrack[] | null = null;
  let input: FollowInput | null = null;
  let followedLayer: string | null = null;
  let rig: Rig | null = null;
  let raf = 0;
  let lastNow = 0;
  let pace = 1;
  let vPace = 0;
  let driving = false;
  let suspended = false;

  function tracksFor(layer: DataLayer): MeasuredTrack[] {
    if (layer.features === cachedFeatures) return cachedTracks;
    const field = layer.temporal?.coordTimesField;
    cachedFeatures = layer.features;
    cachedTracks = field
      ? layer.features.flatMap((f) => trackParts(f, field) ?? []).filter((p) => p.coords.length > 1).map(measureTrack)
      : [];
    return cachedTracks;
  }

  /** The track the front is on at `t`: the active one, else the next to start, else the last to finish. */
  function trackAt(tracks: MeasuredTrack[], t: number): MeasuredTrack | null {
    let next: MeasuredTrack | null = null;
    let last: MeasuredTrack | null = null;
    for (const tr of tracks) {
      const t0 = tr.times[0];
      const t1 = tr.times[tr.times.length - 1];
      if (t >= t0 && t <= t1) return tr;
      if (t0 > t && (!next || t0 < next.times[0])) next = tr;
      if (t1 < t && (!last || t1 > last.times[last.times.length - 1])) last = tr;
    }
    return next ?? last;
  }

  function distanceFor(zoom: number, lat: number) {
    return cameraDistanceMeters(cameraToCenterPx(map), zoom, lat);
  }

  function setPace(p: number) {
    if (Math.abs(p - pace) < 1e-4 && p !== 1) return;
    pace = p;
    onPace(p);
  }

  /**
   * Near the front (in view) MapLibre's own DEM tiles are loaded and exact;
   * further back, where only coarse ancestors (or nothing) are loaded, take
   * the higher of those and the route sampler.
   */
  function terrainModel(exaggeration: number): ChaseTerrain {
    const zoom = terrainTileZoom(map);
    const fine = (p: Position) => {
      const h = map.terrain?.getElevationForLngLatZoom(new maplibregl.LngLat(p[0], p[1]), zoom) ?? 0;
      return h === 0 ? null : h; // 0 = no tile loaded
    };
    const coarse = (p: Position) => {
      const h = sampler.elevation(p[0], p[1]);
      return h === null ? null : h * exaggeration;
    };
    return {
      heightAt(p, x) {
        const f = fine(p);
        if (x < 2000 && f !== null) return f;
        const c = coarse(p);
        return f === null ? c : c === null ? f : Math.max(f, c);
      },
      clearance: chaseClearance(exaggeration),
    };
  }

  function rigFromMap(now: number): Rig {
    const c = map.getCenter();
    const [x, y] = toMercator([c.lng, c.lat]);
    return {
      x,
      y,
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
      pitchGoal: map.getPitch(),
      elevation: map.getTerrain() ? map.getCenterElevation() : null,
      vx: 0,
      vy: 0,
      vZoom: 0,
      vBearing: 0,
      vPitch: 0,
      vPitchGoal: 0,
      vElevation: 0,
      zoom0: map.getZoom(),
      pitch0: map.getPitch(),
      startedAt: now,
    };
  }

  function halt(resetPace = true) {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    lastNow = 0;
    vPace = 0;
    if (resetPace) setPace(1);
  }

  function ensureRunning() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function frame(now: number) {
    raf = 0;
    const inp = input;
    if (!inp || !inp.follow || !inp.layer || suspended) return halt();
    const track = trackAt(tracksFor(inp.layer), inp.t);
    if (!track) return halt();
    const follow = inp.follow;
    const dt = lastNow ? Math.min(0.1, Math.max(0, (now - lastNow) / 1000)) : 1 / 60;
    lastNow = now;
    const r = (rig ??= rigFromMap(now));
    const blend = 1 + 2.2 * (1 - easeOutCubic((now - r.startedAt) / BLEND_IN_MS));

    // --- Target pose ---
    const zoomTarget = follow.zoom ?? r.zoom0;
    const s = distanceAtTime(track, inp.t);
    const front = pointAtDistance(track, s);
    const D = distanceFor(zoomTarget, front[1]);
    const center = pointAtDistance(track, s + 0.08 * D);
    const [tx, ty] = toMercator(center);
    let bearingTarget = r.bearing;
    if (typeof follow.bearing === 'number') {
      bearingTarget = follow.bearing;
    } else if (follow.bearing === 'track') {
      const reach = Math.min(12_000, Math.max(1_500, 0.5 * D));
      const from = pointAtDistance(track, s - 0.3 * reach);
      const to = pointAtDistance(track, s + reach);
      if (groundDistance(from, to) > 50) bearingTarget = bearingBetween(from, to);
    }
    bearingTarget = r.bearing + angleDelta(r.bearing, bearingTarget);
    const pitchWanted = follow.pitch ?? r.pitch0;

    // --- Advance position, zoom and heading ---
    [r.x, r.vx] = smoothDamp(r.x, tx, r.vx, SMOOTH.position * blend, dt);
    [r.y, r.vy] = smoothDamp(r.y, ty, r.vy, SMOOTH.position * blend, dt);
    [r.zoom, r.vZoom] = smoothDamp(r.zoom, zoomTarget, r.vZoom, SMOOTH.zoom * blend, dt);
    [r.bearing, r.vBearing] = smoothDamp(r.bearing, bearingTarget, r.vBearing, SMOOTH.bearing * blend, dt);
    const camCenter = fromMercator(r.x, r.y);

    // --- Terrain: ground height under the centre and a clear line of sight ---
    let pitchTarget = pitchWanted;
    const terrainSpec = map.getTerrain();
    if (terrainSpec) {
      const terrain = terrainModel(terrainSpec.exaggeration ?? 1);
      const ground = terrain.heightAt(camCenter, 0);
      if (ground !== null) {
        if (r.elevation === null) r.elevation = ground;
        [r.elevation, r.vElevation] = smoothDamp(r.elevation, ground, r.vElevation, SMOOTH.elevation, dt);
        const distance = distanceFor(r.zoom, camCenter[1]);
        let limit = clearPitch(camCenter, r.elevation, r.bearing, pitchWanted, distance, terrain);
        for (const k of [0.3, 0.6, 0.9]) {
          const ahead = pointAtDistance(track, s + k * D);
          const base = terrain.heightAt(ahead, 0);
          if (base !== null) limit = Math.min(limit, clearPitch(ahead, base, r.bearing, pitchWanted, distance, terrain));
        }
        pitchTarget = Math.min(pitchWanted, limit);
      }
    } else {
      r.elevation = null;
    }
    const goalTime = (pitchTarget < r.pitchGoal ? GOAL_SMOOTH.down : GOAL_SMOOTH.up) * blend;
    [r.pitchGoal, r.vPitchGoal] = smoothDamp(r.pitchGoal, pitchTarget, r.vPitchGoal, goalTime, dt);
    const pitchTime = (r.pitchGoal < r.pitch ? SMOOTH.pitchDown : SMOOTH.pitchUp) * blend;
    [r.pitch, r.vPitch] = smoothDamp(r.pitch, r.pitchGoal, r.vPitch, pitchTime, dt);

    const camera: maplibregl.JumpToOptions = {
      center: camCenter,
      zoom: r.zoom,
      bearing: r.bearing,
      pitch: Math.max(0, Math.min(85, r.pitch)),
    };
    // jumpTo looks the centre's ground height up at the *fractional* zoom,
    // which matches no DEM tile and yields 0 — pass the real one.
    if (r.elevation !== null) camera.elevation = r.elevation;
    driving = true;
    try {
      map.jumpTo(camera);
    } finally {
      driving = false;
    }

    // --- Slow motion while the front is fast ---
    if (follow.maxViewSpeed && inp.playing && inp.rate > 0) {
      const fov = (map.getVerticalFieldOfView?.() ?? 36.87) * (Math.PI / 180);
      const viewMeters = 2 * Math.tan(fov / 2) * distanceFor(r.zoom, camCenter[1]);
      // The fastest the front goes over the next ~1.5 s of playback, so the slow-down starts early.
      const horizon = inp.rate * 1500;
      const window = Math.max(1_000, inp.rate * 250);
      let speed = 0;
      for (let k = 0; k <= 4; k++) speed = Math.max(speed, speedAtTime(track, inp.t + (horizon * k) / 4, window));
      const wanted = paceFor(speed * inp.rate * 1000, viewMeters, follow.maxViewSpeed);
      let p = pace;
      [p, vPace] = smoothDamp(p, wanted, vPace, wanted < p ? 0.35 : 1.2, dt);
      setPace(Math.min(1, Math.max(0.02, p)));
    } else if (pace !== 1) {
      setPace(1);
    }

    // Keep animating while playing; after a pause, until the rig comes to rest.
    const settled =
      Math.hypot(tx - r.x, ty - r.y) < 0.002 * D &&
      Math.hypot(r.vx, r.vy) < 0.01 * D &&
      Math.abs(bearingTarget - r.bearing) < 0.1 &&
      Math.abs(pitchTarget - r.pitch) < 0.1 &&
      Math.abs(zoomTarget - r.zoom) < 0.002;
    if (!inp.playing && settled) return halt();
    raf = requestAnimationFrame(frame);
  }

  const onMoveStart = (e: { originalEvent?: unknown }) => {
    if (driving) return;
    // A gesture suspends following until the next play; a flight simply takes over.
    if (e.originalEvent) suspended = true;
    rig = null;
    halt();
  };
  map.on('movestart', onMoveStart);

  return {
    /** Playback (re)started: follow again, easing in from the current view. */
    resume() {
      suspended = false;
      if (!raf) rig = null;
      if (input?.follow && input.layer) ensureRunning();
    },
    /** Latest timeline state; call on every time change. */
    update(next: FollowInput) {
      const layerId = next.follow?.layerId ?? null;
      if (layerId !== followedLayer) {
        followedLayer = layerId;
        rig = null;
      }
      input = next;
      if (!next.follow || !next.layer) {
        if (raf) halt();
        return;
      }
      const tracks = tracksFor(next.layer);
      if (map.getTerrain() && prefetchedFor !== tracks && tracks.length) {
        // Fetch the ground the camera will fly over before playback reaches it.
        prefetchedFor = tracks;
        const lat = tracks[0].coords[0][1];
        const marginKm = distanceFor(next.follow.zoom ?? map.getZoom(), lat) / 1000 + 3;
        sampler.prefetch(tracks.flatMap((tr) => tr.coords), marginKm);
      }
      if (next.playing && !suspended) ensureRunning();
    },
    /** True while the rig is driving the camera. */
    isActive() {
      return raf !== 0;
    },
    destroy() {
      halt(false);
      map.off('movestart', onMoveStart);
      sampler.destroy();
    },
  };
}
