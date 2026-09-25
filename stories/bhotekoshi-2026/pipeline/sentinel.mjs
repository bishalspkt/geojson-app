// Sentinel-2 L2A access for the Nepal floods story: STAC search (Element84
// Earth Search, keyless), per-AOI cloud assessment from the scene
// classification layer, and COG window reads resampled onto a Web Mercator
// grid so chips drop straight into MapLibre image sources.
//
// Data: Copernicus Sentinel-2 (ESA), distributed as COGs on AWS Open Data.
// Attribution: "Contains modified Copernicus Sentinel data <year>".

import fs from 'node:fs/promises';
import path from 'node:path';
import { fromUrl } from 'geotiff';
import proj4 from 'proj4';
import sharp from 'sharp';
import { cachedFetch, IMG_DIR } from './lib.mjs';

const STAC = 'https://earth-search.aws.element84.com/v1/search';
const R = 6378137;

// ---------- Web Mercator grid ----------

const mercX = (lon) => (R * lon * Math.PI) / 180;
const mercY = (lat) => R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const invX = (x) => (x / R) * (180 / Math.PI);
const invY = (y) => (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * (180 / Math.PI);

/**
 * A pixel grid in Web Mercator covering bbox [w, s, e, n] at ~`meters`
 * ground resolution. `coordinates` are the MapLibre image-source corners.
 */
export function mercatorGrid(bbox, meters = 10) {
  const [w, s, e, n] = bbox;
  const x0 = mercX(w);
  const x1 = mercX(e);
  const y0 = mercY(s);
  const y1 = mercY(n);
  const latC = (s + n) / 2;
  const px = meters / Math.cos((latC * Math.PI) / 180);
  const width = Math.round((x1 - x0) / px);
  const height = Math.round((y1 - y0) / px);
  // Snap the far edges to whole pixels so corners match the raster exactly.
  const X1 = x0 + width * px;
  const Y0 = y1 - height * px;
  const east = invX(X1);
  const south = invY(Y0);
  return {
    bbox: [w, south, east, n],
    width,
    height,
    px,
    x0,
    y1,
    coordinates: [
      [w, n],
      [east, n],
      [east, south],
      [w, south],
    ],
    /** lon/lat at the center of output pixel (i, j). */
    lonLat(i, j) {
      return [invX(x0 + (i + 0.5) * px), invY(y1 - (j + 0.5) * px)];
    },
  };
}

// ---------- STAC ----------

/** Search Sentinel-2 L2A items intersecting bbox within a datetime range, lowest cloud first. */
export async function searchS2({ bbox, datetime, maxCloud = 40, collection = 'sentinel-2-l2a', limit = 100 }) {
  const body = {
    collections: [collection],
    bbox,
    datetime,
    limit,
    query: { 'eo:cloud_cover': { lt: maxCloud } },
    sortby: [{ field: 'properties.eo:cloud_cover', direction: 'asc' }],
  };
  const res = await cachedFetch(STAC, {
    key: `stac:${JSON.stringify(body)}`,
    init: { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } },
  });
  return res.features ?? [];
}

function epsgOf(item) {
  const p = item.properties;
  const code = p['proj:epsg'] ?? (typeof p['proj:code'] === 'string' ? Number(p['proj:code'].split(':')[1]) : null);
  if (!code) throw new Error(`no projection on ${item.id}`);
  return code;
}

function utmProj(epsg) {
  const zone = epsg % 100;
  const south = Math.floor(epsg / 100) === 327;
  return `+proj=utm +zone=${zone} ${south ? '+south ' : ''}+datum=WGS84 +units=m +no_defs`;
}

/** Scale/offset for a reflectance asset (processing baseline ≥ 04.00 adds −0.1 offset). */
function bandScaling(asset) {
  const rb = asset['raster:bands']?.[0] ?? {};
  return { scale: rb.scale ?? 0.0001, offset: rb.offset ?? 0, nodata: rb.nodata ?? 0 };
}

const tiffCache = new Map();
async function openCog(href) {
  if (!tiffCache.has(href)) tiffCache.set(href, fromUrl(href, { cacheSize: 2048 }));
  try {
    const tiff = await tiffCache.get(href);
    return await tiff.getImage();
  } catch (err) {
    tiffCache.delete(href); // never cache a failed open
    throw err;
  }
}

/** Retry flaky range requests (S3 throttling, dropped sockets) with backoff. */
async function withRetry(label, fn, attempts = 4) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const wait = 1500 * (i + 1) ** 2;
      console.warn(`    retry ${label} in ${wait} ms (${err?.message ?? err})`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw last;
}

/**
 * Read a single-asset COG window covering the grid and resample it onto the
 * grid (nearest for categorical, bilinear otherwise). Returns Float32Array
 * per sample, NaN where nodata/outside.
 */
export async function readOnGrid(item, assetKey, grid, { categorical = false, samples = [0] } = {}) {
  const asset = item.assets[assetKey];
  if (!asset) throw new Error(`${item.id} has no asset ${assetKey}`);
  const image = await withRetry(`${item.id}/${assetKey} open`, () => openCog(asset.href));
  const [originX, originY] = image.getOrigin();
  const [resX, resY] = image.getResolution();
  const epsg = epsgOf(item);
  const toUtm = proj4('EPSG:4326', utmProj(epsg));

  // Project every output pixel center once (cached per grid+epsg).
  const key = `${epsg}`;
  grid._utm ??= {};
  if (!grid._utm[key]) {
    const xs = new Float64Array(grid.width * grid.height);
    const ys = new Float64Array(grid.width * grid.height);
    for (let j = 0; j < grid.height; j++) {
      for (let i = 0; i < grid.width; i++) {
        const [E, N] = toUtm.forward(grid.lonLat(i, j));
        xs[j * grid.width + i] = E;
        ys[j * grid.width + i] = N;
      }
    }
    grid._utm[key] = { xs, ys };
  }
  const { xs, ys } = grid._utm[key];

  // Source window (pixel space) covering all projected points + margin.
  let cmin = Infinity;
  let cmax = -Infinity;
  let rmin = Infinity;
  let rmax = -Infinity;
  for (let k = 0; k < xs.length; k++) {
    const c = (xs[k] - originX) / resX;
    const r = (ys[k] - originY) / resY;
    if (c < cmin) cmin = c;
    if (c > cmax) cmax = c;
    if (r < rmin) rmin = r;
    if (r > rmax) rmax = r;
  }
  const W = image.getWidth();
  const H = image.getHeight();
  const wx0 = Math.max(0, Math.floor(cmin) - 2);
  const wy0 = Math.max(0, Math.floor(rmin) - 2);
  const wx1 = Math.min(W, Math.ceil(cmax) + 3);
  const wy1 = Math.min(H, Math.ceil(rmax) + 3);
  const out = samples.map(() => new Float32Array(grid.width * grid.height).fill(NaN));
  if (wx1 <= wx0 || wy1 <= wy0) return out; // AOI outside this tile

  const rasters = await withRetry(`${item.id}/${assetKey} read`, () =>
    image.readRasters({ window: [wx0, wy0, wx1, wy1], samples, interleave: false }),
  );
  const ww = wx1 - wx0;
  const wh = wy1 - wy0;
  const nodata = bandScaling(asset).nodata;

  for (let k = 0; k < xs.length; k++) {
    const c = (xs[k] - originX) / resX - wx0 - 0.5;
    const r = (ys[k] - originY) / resY - wy0 - 0.5;
    if (c < 0 || r < 0 || c > ww - 1 || r > wh - 1) continue;
    for (let s = 0; s < samples.length; s++) {
      const band = rasters[s];
      if (categorical) {
        const v = band[Math.round(r) * ww + Math.round(c)];
        if (v !== nodata) out[s][k] = v;
        continue;
      }
      const c0 = Math.floor(c);
      const r0 = Math.floor(r);
      const fc = c - c0;
      const fr = r - r0;
      const c1 = Math.min(c0 + 1, ww - 1);
      const r1 = Math.min(r0 + 1, wh - 1);
      const v00 = band[r0 * ww + c0];
      const v10 = band[r0 * ww + c1];
      const v01 = band[r1 * ww + c0];
      const v11 = band[r1 * ww + c1];
      if (v00 === nodata || v10 === nodata || v01 === nodata || v11 === nodata) continue;
      out[s][k] = (v00 * (1 - fc) + v10 * fc) * (1 - fr) + (v01 * (1 - fc) + v11 * fc) * fr;
    }
  }
  return out;
}

/** Reflectance (0–1) for a band asset on the grid, applying the item's scale/offset. */
export async function reflectanceOnGrid(items, assetKey, grid) {
  const acc = new Float32Array(grid.width * grid.height).fill(NaN);
  for (const item of items) {
    const { scale } = bandScaling(item.assets[assetKey]);
    let { offset } = bandScaling(item.assets[assetKey]);
    const [raw] = await readOnGrid(item, assetKey, grid);
    // Baseline ≥ 04.00 products carry a +1000 DN offset (metadata: offset −0.1),
    // but the COGs served here have it removed while the metadata still declares
    // it. If the offset were really present no valid pixel could be < 1000 DN,
    // so test the data rather than trust the metadata.
    if (offset < 0) {
      let valid = 0;
      let below = 0;
      for (let k = 0; k < raw.length; k += 5) {
        if (Number.isNaN(raw[k])) continue;
        valid++;
        if (raw[k] < -offset / scale) below++;
      }
      if (valid > 0 && below / valid > 0.05) offset = 0;
    }
    for (let k = 0; k < acc.length; k++) {
      if (Number.isNaN(acc[k]) && !Number.isNaN(raw[k])) acc[k] = raw[k] * scale + offset;
    }
  }
  return acc;
}

// SCL classes: 0 nodata, 1 saturated, 2 dark/shadow, 3 cloud shadow, 4 vegetation, 5 bare,
// 6 water, 7 unclassified, 8 cloud medium, 9 cloud high, 10 thin cirrus, 11 snow/ice.
export const SCL_CLOUDY = new Set([3, 8, 9, 10]);

/** Scene classification (20 m) on the grid; mosaics several same-day items. */
export async function sclOnGrid(items, grid) {
  const acc = new Float32Array(grid.width * grid.height).fill(NaN);
  for (const item of items) {
    const [scl] = await readOnGrid(item, 'scl', grid, { categorical: true });
    for (let k = 0; k < acc.length; k++) if (Number.isNaN(acc[k]) && !Number.isNaN(scl[k]) && scl[k] !== 0) acc[k] = scl[k];
  }
  return acc;
}

/** Fractions of cloud / snow / valid pixels inside the grid. */
export function sclStats(scl) {
  let valid = 0;
  let cloud = 0;
  let snow = 0;
  let dark = 0;
  let missing = 0;
  for (const v of scl) {
    if (Number.isNaN(v)) {
      missing++;
      continue;
    }
    valid++;
    if (SCL_CLOUDY.has(v)) cloud++;
    if (v === 11) snow++;
    if (v === 2) dark++;
  }
  const n = scl.length;
  const div = Math.max(1, valid);
  return { cloud: cloud / div, snow: snow / div, dark: dark / div, coverage: valid / n, missing: missing / n };
}

/** MGRS tile and processing version from an Earth Search id (S2B_45RUL_20201113_0_L2A). */
function tileAndVersion(item) {
  const parts = item.id.split('_');
  return { tile: parts[1], version: Number(parts[3]) || 0 };
}

/**
 * One item per MGRS tile and day. Earth Search can hold both the original
 * processing (…_0_L2A) and a reprocessed copy (…_1_L2A) of older scenes;
 * mosaicking both mixes radiometric conventions, so prefer the original.
 */
export function dedupeItems(items) {
  const best = new Map();
  for (const item of items) {
    const { tile, version } = tileAndVersion(item);
    const key = `${tile}|${item.properties.datetime.slice(0, 10)}`;
    const prev = best.get(key);
    if (!prev || version < tileAndVersion(prev).version) best.set(key, item);
  }
  return [...best.values()];
}

/** Group items by acquisition date + orbit so same-day MGRS tiles mosaic together. */
export function groupByDay(rawItems) {
  const items = dedupeItems(rawItems);
  const groups = new Map();
  for (const item of items) {
    const day = item.properties.datetime.slice(0, 10);
    const orbit = item.properties['sat:relative_orbit'] ?? '';
    const key = `${day}|${item.properties.platform}|${orbit}`;
    if (!groups.has(key)) groups.set(key, { day, platform: item.properties.platform, items: [] });
    groups.get(key).items.push(item);
  }
  return [...groups.values()];
}

/**
 * Pick the clearest acquisition for a grid: evaluates SCL for up to
 * `maxCandidates` day-groups (lowest scene cloud first) and returns the one
 * with full coverage and least AOI cloud/snow.
 */
export async function pickClearest(items, grid, { maxCandidates = 8, prefer = null } = {}) {
  const groups = groupByDay(items);
  const scored = [];
  for (const g of groups.slice(0, maxCandidates)) {
    try {
      const scl = await sclOnGrid(g.items, grid);
      const st = sclStats(scl);
      // Cloud hides the ground; deep winter shadow (SCL "dark area") in the gorges does too.
      const score = st.cloud * 2 + st.dark * 1.5 + st.snow * 0.5 + st.missing * 3 + (prefer ? Math.abs(Date.parse(g.day) - Date.parse(prefer)) / (86400e3 * 365) : 0);
      scored.push({ ...g, stats: st, score, scl });
      console.log(`    ${g.day} ${g.platform} tiles=${g.items.length} cloud=${(st.cloud * 100).toFixed(1)}% shadow=${(st.dark * 100).toFixed(1)}% snow=${(st.snow * 100).toFixed(1)}% missing=${(st.missing * 100).toFixed(1)}%`);
    } catch (err) {
      console.warn(`    ${g.day}: ${err.message}`);
    }
  }
  scored.sort((a, b) => a.score - b.score);
  return scored[0] ?? null;
}

// ---------- True-colour chips ----------

/** Red/green/blue reflectance for a (mosaicked) acquisition on the grid. */
export async function readRGB(items, grid) {
  return {
    red: await reflectanceOnGrid(items, 'red', grid),
    green: await reflectanceOnGrid(items, 'green', grid),
    blue: await reflectanceOnGrid(items, 'blue', grid),
  };
}

/**
 * One stretch for several scenes (so before/after stay comparable):
 * low/high reflectance at the given brightness percentiles.
 */
export function sharedStretch(scenes, { low = 0.005, high = 0.97, brightCap = 0.35 } = {}) {
  const values = [];
  for (const sc of scenes) {
    const n = sc.red.length;
    const step = Math.max(1, Math.floor(n / 200_000));
    for (let k = 0; k < n; k += step) {
      const v = (sc.red[k] + sc.green[k] + sc.blue[k]) / 3;
      // Snow and cloud would dominate the top percentiles and darken the land; let them clip.
      if (!Number.isNaN(v) && v < brightCap) values.push(v);
    }
  }
  values.sort((a, b) => a - b);
  const q = (p) => values[Math.min(values.length - 1, Math.max(0, Math.floor(p * values.length)))];
  return { lo: Math.max(0, q(low)), hi: Math.max(q(high), q(low) + 0.02) };
}

/** Write a WebP true-colour chip with a linear stretch + gamma (brightens valley shadows). */
export async function writeTrueColor(rgb, grid, file, { lo, hi, gamma = 2.3, quality = 82 }) {
  const n = grid.width * grid.height;
  const out = Buffer.alloc(n * 3);
  const tone = (v) => {
    if (Number.isNaN(v)) return 0;
    const x = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
    return Math.round(255 * x ** (1 / gamma));
  };
  for (let k = 0; k < n; k++) {
    out[k * 3] = tone(rgb.red[k]);
    out[k * 3 + 1] = tone(rgb.green[k]);
    out[k * 3 + 2] = tone(rgb.blue[k]);
  }
  await fs.mkdir(IMG_DIR, { recursive: true });
  const target = path.join(IMG_DIR, file);
  await sharp(out, { raw: { width: grid.width, height: grid.height, channels: 3 } })
    .modulate({ saturation: 1.12 })
    .webp({ quality })
    .toFile(target);
  const size = (await fs.stat(target)).size;
  console.log(`  wrote img/${file} — ${grid.width}×${grid.height}, ${(size / 1024).toFixed(0)} KB`);
}
