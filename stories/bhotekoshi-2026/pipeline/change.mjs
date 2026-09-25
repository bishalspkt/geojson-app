// Before/after change detection on Sentinel-2 reflectance, restricted to a
// corridor around a flow path. Produces polygons of "ground stripped or
// buried by the flow": vegetated/water surfaces that became bare sediment.
//
// Method (per 10 m pixel, both scenes cloud/shadow/snow-free per SCL):
//   NDVI = (NIR − Red) / (NIR + Red),  NDWI = (Green − NIR) / (Green + NIR)
//   vegetation loss : NDVI_before − NDVI_after ≥ 0.20, NDVI_after < 0.25, and the
//                     surface brightened (fresh debris is brighter than canopy —
//                     this rejects shadow/illumination artefacts on slopes)
//   channel burial  : NDWI_before > 0 (water)  and  NDVI_after < 0.15, NDWI_after < 0, bright after
// then 3×3 opening to drop speckle, components < minPixels removed,
// and polygonized with marching squares (d3-contour).

import { contours } from 'd3-contour';
import * as turf from '@turf/turf';
import { SCL_CLOUDY } from './sentinel.mjs';

const R = 6378137;
const invX = (x) => (x / R) * (180 / Math.PI);
const invY = (y) => (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * (180 / Math.PI);
const mercX = (lon) => (R * lon * Math.PI) / 180;
const mercY = (lat) => R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

/**
 * Distance (in ground meters) from each grid pixel to the nearest point of the
 * given lines, via a chamfer distance transform (fast, ~3% error).
 */
export function corridorDistance(grid, lines) {
  const { width: w, height: h, px } = grid;
  const INF = 1e12;
  const d = new Float64Array(w * h).fill(INF);
  // Seed: densify each segment at half-pixel steps.
  for (const coords of lines) {
    for (let k = 0; k + 1 < coords.length; k++) {
      const ax = (mercX(coords[k][0]) - grid.x0) / px;
      const ay = (grid.y1 - mercY(coords[k][1])) / px;
      const bx = (mercX(coords[k + 1][0]) - grid.x0) / px;
      const by = (grid.y1 - mercY(coords[k + 1][1])) / px;
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 2));
      for (let s = 0; s <= steps; s++) {
        const x = Math.round(ax + ((bx - ax) * s) / steps - 0.5);
        const y = Math.round(ay + ((by - ay) * s) / steps - 0.5);
        if (x >= 0 && y >= 0 && x < w && y < h) d[y * w + x] = 0;
      }
    }
  }
  const a = 1;
  const b = Math.SQRT2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + a);
      if (y > 0) {
        v = Math.min(v, d[i - w] + a);
        if (x > 0) v = Math.min(v, d[i - w - 1] + b);
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + b);
      }
      d[i] = v;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      let v = d[i];
      if (x < w - 1) v = Math.min(v, d[i + 1] + a);
      if (y < h - 1) {
        v = Math.min(v, d[i + w] + a);
        if (x < w - 1) v = Math.min(v, d[i + w + 1] + b);
        if (x > 0) v = Math.min(v, d[i + w - 1] + b);
      }
      d[i] = v;
    }
  }
  // Pixel units → ground meters (mercator px scaled by cos(lat)).
  const latC = (grid.bbox[1] + grid.bbox[3]) / 2;
  const groundPx = px * Math.cos((latC * Math.PI) / 180);
  for (let i = 0; i < d.length; i++) d[i] *= groundPx;
  return d;
}

function morph(mask, w, h, erode) {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = erode ? 1 : 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          const v = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : mask[yy * w + xx];
          if (erode) acc &= v;
          else acc |= v;
        }
      }
      out[y * w + x] = acc;
    }
  }
  return out;
}

/** Remove 4-connected components smaller than minPixels (in place). Returns kept count. */
function dropSmall(mask, w, h, minPixels) {
  const seen = new Uint8Array(mask.length);
  const stack = [];
  let kept = 0;
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    const comp = [];
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop();
      comp.push(i);
      const x = i % w;
      const y = (i - x) / w;
      const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
      for (const j of nb) {
        if (j >= 0 && mask[j] && !seen[j]) {
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
    if (comp.length < minPixels) for (const i of comp) mask[i] = 0;
    else kept += comp.length;
  }
  return kept;
}

/**
 * Classify change within `maxDistance` meters of the flow path.
 * `before`/`after` = { red, green, nir, scl } Float32Arrays on the same grid.
 */
export function detectChange(grid, before, after, pathLines, { maxDistance = 500, minPixels = 10 } = {}) {
  const { width: w, height: h } = grid;
  const n = w * h;
  const dist = corridorDistance(grid, pathLines);
  const mask = new Uint8Array(n);
  let evaluated = 0;
  let masked = 0;
  for (let k = 0; k < n; k++) {
    if (dist[k] > maxDistance) continue;
    const sb = before.scl[k];
    const sa = after.scl[k];
    if (Number.isNaN(sb) || Number.isNaN(sa) || SCL_CLOUDY.has(sb) || SCL_CLOUDY.has(sa) || sb === 11 || sa === 11 || sb === 2 || sa === 2) {
      masked++;
      continue;
    }
    const rb = before.red[k];
    const nb = before.nir[k];
    const gb = before.green[k];
    const ra = after.red[k];
    const na = after.nir[k];
    const ga = after.green[k];
    if ([rb, nb, gb, ra, na, ga].some(Number.isNaN)) continue;
    evaluated++;
    const ndviB = (nb - rb) / (nb + rb + 1e-6);
    const ndviA = (na - ra) / (na + ra + 1e-6);
    const ndwiB = (gb - nb) / (gb + nb + 1e-6);
    const ndwiA = (ga - na) / (ga + na + 1e-6);
    const brightA = (ra + ga) / 2;
    const brightB = (rb + gb) / 2;
    const vegLoss = ndviB - ndviA >= 0.2 && ndviA < 0.25 && brightA - brightB > 0.02;
    const burial = ndwiB > 0 && ndviA < 0.15 && ndwiA < 0 && brightA > 0.08;
    if (vegLoss || burial) mask[k] = 1;
  }
  const opened = morph(morph(mask, w, h, true), w, h, false);
  // Opening erases thin features entirely; keep original pixels adjacent to survivors.
  const grown = morph(opened, w, h, false);
  for (let k = 0; k < n; k++) grown[k] = grown[k] & mask[k];
  const keptPixels = dropSmall(grown, w, h, minPixels);

  const latC = (grid.bbox[1] + grid.bbox[3]) / 2;
  const pixelArea = (grid.px * Math.cos((latC * Math.PI) / 180)) ** 2;
  const values = Array.from(grown, (v) => v);
  const [mp] = contours().size([w, h]).thresholds([0.5])(values);
  const toLonLat = ([x, y]) => [invX(grid.x0 + x * grid.px), invY(grid.y1 - y * grid.px)];
  const polygons = mp.coordinates
    .map((poly) => poly.map((ring) => ring.map(toLonLat)))
    .map((coords) => turf.polygon(coords))
    .map((p) => turf.simplify(p, { tolerance: 0.00004, highQuality: true }))
    .filter((p) => turf.area(p) >= pixelArea * minPixels * 0.5);

  return {
    polygons,
    areaM2: keptPixels * pixelArea,
    evaluatedM2: evaluated * pixelArea,
    maskedM2: masked * pixelArea,
    dist,
  };
}
