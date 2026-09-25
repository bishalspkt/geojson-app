// Read a window of a very-high-resolution RGB COG (Vantor visual assets in
// EPSG:4326, Planet visual assets in UTM) resampled onto a Web Mercator grid.
// Only the needed overview level and window are fetched (HTTP range requests).

import { fromUrl } from 'geotiff';
import proj4 from 'proj4';
import { mercatorGrid } from './sentinel.mjs';

const tiffs = new Map();
/** Cached GeoTIFF handle per URL; failed opens are evicted so they can be retried. */
export function openTiff(url) {
  if (!tiffs.has(url)) {
    const p = fromUrl(url, { cacheSize: 4096, headers: { 'User-Agent': 'geojson.app-story-pipeline' } });
    p.catch(() => tiffs.delete(url));
    tiffs.set(url, p);
  }
  return tiffs.get(url);
}

export async function retry(fn, label, attempts = 4) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      console.warn(`    retry ${label}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw last;
}

/** EPSG code of an image from its GeoKeys (projected first, then geographic). */
function epsgOfImage(image) {
  const keys = image.getGeoKeys() ?? {};
  return keys.ProjectedCSTypeGeoKey ?? keys.GeographicTypeGeoKey ?? 4326;
}

function projFor(epsg) {
  if (epsg === 4326) return null;
  if (epsg >= 32601 && epsg <= 32660) return `+proj=utm +zone=${epsg - 32600} +datum=WGS84 +units=m +no_defs`;
  if (epsg >= 32701 && epsg <= 32760) return `+proj=utm +zone=${epsg - 32700} +south +datum=WGS84 +units=m +no_defs`;
  throw new Error(`unsupported CRS EPSG:${epsg}`);
}

/**
 * RGBA pixels of `bbox` at ~`meters` resolution. Pixels outside the scene
 * (or black no-data) are transparent. Returns { grid, rgba, level, sourceMeters, coverage }.
 */
export async function readRgbWindow(url, bbox, meters) {
  const tiff = await retry(() => openTiff(url), `${url} open`);
  const im0 = await tiff.getImage(0);
  const epsg = epsgOfImage(im0);
  const def = projFor(epsg);
  const toSrc = def ? proj4('EPSG:4326', def) : null;
  const [ox, oy] = im0.getOrigin();
  const [rx0, ry0] = im0.getResolution();
  const W0 = im0.getWidth();
  const latC = (bbox[1] + bbox[3]) / 2;
  // Source pixel size in metres at full resolution.
  const srcMeters0 = def ? Math.abs(rx0) : Math.abs(rx0) * 111320 * Math.cos((latC * Math.PI) / 180);
  // Coarsest overview still at least as fine as the target.
  const count = await tiff.getImageCount();
  let level = 0;
  for (let i = 1; i < count; i++) {
    const im = await tiff.getImage(i);
    if (srcMeters0 * (W0 / im.getWidth()) <= meters) level = i;
  }
  const im = await tiff.getImage(level);
  const k = W0 / im.getWidth();
  const rx = rx0 * k;
  const ry = ry0 * k;

  const grid = mercatorGrid(bbox, meters);
  const n = grid.width * grid.height;
  // Source pixel coordinates of every output pixel centre.
  const cs = new Float64Array(n);
  const rs = new Float64Array(n);
  let cmin = Infinity;
  let cmax = -Infinity;
  let rmin = Infinity;
  let rmax = -Infinity;
  for (let j = 0; j < grid.height; j++) {
    for (let i = 0; i < grid.width; i++) {
      const ll = grid.lonLat(i, j);
      const [X, Y] = toSrc ? toSrc.forward(ll) : ll;
      const c = (X - ox) / rx;
      const r = (Y - oy) / ry;
      const p = j * grid.width + i;
      cs[p] = c;
      rs[p] = r;
      if (c < cmin) cmin = c;
      if (c > cmax) cmax = c;
      if (r < rmin) rmin = r;
      if (r > rmax) rmax = r;
    }
  }
  const c0 = Math.max(0, Math.floor(cmin) - 2);
  const r0 = Math.max(0, Math.floor(rmin) - 2);
  const c1 = Math.min(im.getWidth(), Math.ceil(cmax) + 3);
  const r1 = Math.min(im.getHeight(), Math.ceil(rmax) + 3);
  const rgba = Buffer.alloc(n * 4);
  if (c1 - c0 < 2 || r1 - r0 < 2) return { grid, rgba, level, sourceMeters: srcMeters0 * k, coverage: 0 };
  // readRGB converts JPEG-in-YCbCr storage (common in visual COGs) to RGB.
  const bands = await retry(
    () => im.readRGB({ window: [c0, r0, c1, r1], interleave: false, enableAlpha: false }),
    `${url} read`,
  );
  const ww = c1 - c0;
  const wh = r1 - r0;
  let valid = 0;
  for (let p = 0; p < n; p++) {
    const c = cs[p] - c0 - 0.5;
    const r = rs[p] - r0 - 0.5;
    if (c < 0 || r < 0 || c >= ww - 1 || r >= wh - 1) continue;
    const cx = Math.floor(c);
    const cy = Math.floor(r);
    const fx = c - cx;
    const fy = r - cy;
    const q = cy * ww + cx;
    let dark = 0;
    for (let b = 0; b < 3; b++) {
      const a = bands[b];
      const v = (a[q] * (1 - fx) + a[q + 1] * fx) * (1 - fy) + (a[q + ww] * (1 - fx) + a[q + ww + 1] * fx) * fy;
      rgba[p * 4 + b] = Math.round(v);
      if (v < 1) dark++;
    }
    if (dark < 3) {
      rgba[p * 4 + 3] = 255;
      valid++;
    }
  }
  return { grid, rgba, level, sourceMeters: srcMeters0 * k, coverage: valid / n };
}

/** Share of valid pixels that look like cloud or haze: bright and grey. */
export function cloudFraction(rgba) {
  let n = 0;
  let cloud = 0;
  for (let o = 0; o < rgba.length; o += 4) {
    if (!rgba[o + 3]) continue;
    n++;
    const r = rgba[o];
    const g = rgba[o + 1];
    const b = rgba[o + 2];
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    if (mn > 135 && mx - mn < 45) cloud++;
  }
  return n ? cloud / n : 1;
}
