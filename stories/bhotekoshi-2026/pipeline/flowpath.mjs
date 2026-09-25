// Flow paths for debris flows / GLOFs: route along OpenStreetMap waterways
// from a source (glacial lake, landslide dam) to the end of the affected
// reach, then give every vertex an arrival time interpolated between timed
// anchors (reported arrival times at places along the valley).

import * as turf from '@turf/turf';
import { overpass } from './lib.mjs';

const key = (c) => `${c[0].toFixed(7)},${c[1].toFixed(7)}`;

/** OSM waterways (rivers, streams, canals excluded) inside bbox [w, s, e, n]. */
export async function fetchWaterways(bbox, { streams = true } = {}) {
  const [w, s, e, n] = bbox;
  const types = streams ? 'river|stream' : 'river';
  const q = `[out:json][timeout:180];way["waterway"~"^(${types})$"](${s},${w},${n},${e});out geom;`;
  const res = await overpass(q);
  return res.elements
    .filter((el) => el.type === 'way' && el.geometry?.length >= 2)
    .map((el) => ({
      id: el.id,
      name: el.tags?.['name:en'] || el.tags?.name || null,
      waterway: el.tags?.waterway,
      coords: el.geometry.map((g) => [g.lon, g.lat]),
    }));
}

/** Undirected graph over waterway vertices; edges weighted by length (km). */
export function buildGraph(ways) {
  const adj = new Map();
  const coordOf = new Map();
  const add = (a, b, w, meta) => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a).push({ to: b, w, meta });
  };
  for (const way of ways) {
    for (let i = 0; i + 1 < way.coords.length; i++) {
      const a = key(way.coords[i]);
      const b = key(way.coords[i + 1]);
      coordOf.set(a, way.coords[i]);
      coordOf.set(b, way.coords[i + 1]);
      const w = turf.distance(way.coords[i], way.coords[i + 1]);
      // Rivers are cheaper than streams so routes prefer the main channel.
      const factor = way.waterway === 'river' ? 1 : 1.35;
      add(a, b, w * factor, way);
      add(b, a, w * factor, way);
    }
  }
  return { adj, coordOf };
}

function nearestVertex(graph, point) {
  let best = null;
  let bestD = Infinity;
  for (const [k, c] of graph.coordOf) {
    const d = (c[0] - point[0]) ** 2 + ((c[1] - point[1]) * 1.1) ** 2;
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  }
  return { key: best, km: best ? turf.distance(graph.coordOf.get(best), point) : Infinity };
}

/** Shortest path (Dijkstra) between the vertices nearest to `from` and `to`. */
export function routeAlong(graph, from, to) {
  const s = nearestVertex(graph, from);
  const t = nearestVertex(graph, to);
  if (!s.key || !t.key) throw new Error('empty waterway graph');
  const dist = new Map([[s.key, 0]]);
  const prev = new Map();
  const done = new Set();
  // Binary heap of [dist, key].
  const heap = [[0, s.key]];
  const push = (item) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  while (heap.length) {
    const [d, u] = pop();
    if (done.has(u)) continue;
    done.add(u);
    if (u === t.key) break;
    for (const e of graph.adj.get(u) ?? []) {
      const nd = d + e.w;
      if (nd < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, nd);
        prev.set(e.to, u);
        push([nd, e.to]);
      }
    }
  }
  if (!dist.has(t.key)) throw new Error('no waterway route between source and end (disconnected network)');
  const path = [];
  for (let k = t.key; k; k = prev.get(k)) path.push(graph.coordOf.get(k));
  path.reverse();
  return { coords: path, snapKm: { from: s.km, to: t.km } };
}

/** Cumulative distance (km) at each vertex. */
export function cumulative(coords) {
  const out = [0];
  for (let i = 1; i < coords.length; i++) out.push(out[i - 1] + turf.distance(coords[i - 1], coords[i]));
  return out;
}

/** Distance along the path (km) of the point on it nearest to `pt`, and the offset (km). */
export function locate(coords, pt) {
  const line = turf.lineString(coords);
  const snapped = turf.nearestPointOnLine(line, turf.point(pt));
  return { along: snapped.properties.location, offset: snapped.properties.dist, point: snapped.geometry.coordinates };
}

/**
 * Per-vertex times (epoch ms) from timed anchors [{ point | alongKm, time }].
 * Piecewise-linear in distance between anchors; beyond the ends, extrapolates
 * with `tailSpeedMs` (m/s) or the nearest segment's speed.
 */
/**
 * Per-vertex front arrival times from reported/gauged anchors.
 *
 * The front moves at constant speed between anchors (the reported average),
 * but instead of changing speed instantly at each anchor it eases from one
 * speed to the next over a short stretch around it (a C1 "rounded corner",
 * at most ±3 km or 35% of the shorter neighbouring leg). The eased time at an
 * anchor differs from the reported one by (Δpace × w)/4, capped at 20 s — well
 * inside the reports' own uncertainty — and the front never goes backwards.
 * Beyond the first/last anchor it continues at the end speed (`tailSpeedMs`
 * downstream when given).
 */
export function timeVertices(coords, anchors, { tailSpeedMs, blendKm = 3, maxShiftMs = 20_000 } = {}) {
  const cum = cumulative(coords);
  const pts = anchors
    .map((a) => ({ along: a.alongKm ?? locate(coords, a.point).along, t: Date.parse(a.time), label: a.label }))
    .sort((a, b) => a.along - b.along);
  if (pts.length === 0) throw new Error('need at least one anchor');
  // x in metres, y in ms; pace = ms per metre (> 0).
  const x = pts.map((p) => p.along * 1000);
  const y = pts.map((p) => p.t);
  const n = pts.length;
  const fallbackPace = 1000 / (tailSpeedMs ?? 5);
  if (n === 1) return cum.map((d) => y[0] + (d * 1000 - x[0]) * fallbackPace);
  const pace = [];
  for (let i = 0; i + 1 < n; i++) pace.push((y[i + 1] - y[i]) / Math.max(1e-6, x[i + 1] - x[i]));
  const headPace = pace[0];
  const tailPace = tailSpeedMs ? 1000 / tailSpeedMs : pace[n - 2];
  // Piecewise-linear time, extended beyond the ends.
  const linear = (d) => {
    if (d <= x[0]) return y[0] - (x[0] - d) * headPace;
    if (d >= x[n - 1]) return y[n - 1] + (d - x[n - 1]) * tailPace;
    let i = 0;
    while (i + 1 < n - 1 && d > x[i + 1]) i++;
    return y[i] + (d - x[i]) * pace[i];
  };
  // Blend windows around interior anchors (and the last one when the tail speed differs).
  const paceBefore = (i) => (i === 0 ? headPace : pace[i - 1]);
  const paceAfter = (i) => (i === n - 1 ? tailPace : pace[i]);
  const windows = [];
  for (let i = 1; i < n; i++) {
    const shorter = Math.min(x[i] - x[i - 1], i + 1 < n ? x[i + 1] - x[i] : Infinity);
    // The eased curve misses the anchor by w·Δpace/4; keep that under maxShiftMs.
    const dPace = Math.abs(paceAfter(i) - paceBefore(i));
    const w = Math.min(blendKm * 1000, 0.35 * shorter, dPace > 0 ? (4 * maxShiftMs) / dPace : Infinity);
    if (w > 0 && paceBefore(i) !== paceAfter(i)) windows.push({ x: x[i], w, i });
  }
  return cum.map((dKm) => {
    const d = dKm * 1000;
    for (const { x: xi, w, i } of windows) {
      if (d > xi - w && d < xi + w) {
        // Quadratic Bézier between the two lines: pace changes linearly across the window.
        const t0 = linear(xi - w);
        const t2 = linear(xi + w);
        const s = (d - (xi - w)) / (2 * w);
        return (1 - s) * (1 - s) * t0 + 2 * s * (1 - s) * y[i] + s * s * t2;
      }
    }
    return linear(d);
  });
}

/** Thin a dense path (keeps topology; tolerance in degrees) while keeping endpoints. */
export function simplifyPath(coords, tolerance = 0.00008) {
  return turf.simplify(turf.lineString(coords), { tolerance, highQuality: true }).geometry.coordinates;
}

/** Arrival time at a point: time at its nearest location on the path. */
export function arrivalAt(coords, times, pt) {
  const cum = cumulative(coords);
  const { along, offset } = locate(coords, pt);
  let i = cum.findIndex((c) => c >= along);
  if (i <= 0) i = 1;
  const f = (along - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]);
  return { time: times[i - 1] + f * (times[i] - times[i - 1]), along, offset };
}
