// Shared helpers for the Nepal floods story pipeline.
// Every network response is cached under .cache/ so rebuilds are offline,
// deterministic, and polite to the public APIs we depend on.

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const PIPELINE_DIR = import.meta.dirname;
export const REPO_ROOT = path.resolve(PIPELINE_DIR, '..', '..', '..');
export const OUT_DIR = path.join(REPO_ROOT, 'public', 'stories', 'bhotekoshi-2026');
export const DATA_DIR = path.join(OUT_DIR, 'data');
export const IMG_DIR = path.join(OUT_DIR, 'img');
export const CACHE_DIR = path.join(PIPELINE_DIR, '.cache');

const USER_AGENT = 'geojson.app-bhotekoshi-2026-pipeline/1.0 (+https://geojson.app; open-data story build)';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cacheFile(key, ext) {
  const hash = crypto.createHash('sha1').update(key).digest('hex').slice(0, 16);
  const safe = key.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 80);
  return path.join(CACHE_DIR, `${safe}-${hash}.${ext}`);
}

/**
 * fetch() with an on-disk cache and retries. `type`: 'json' | 'text' | 'buffer'.
 * `key` overrides the cache key (e.g. for POST bodies).
 */
export async function cachedFetch(url, { init = {}, type = 'json', key, retries = 3, refresh = false } = {}) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const file = cacheFile(key ?? url, type === 'buffer' ? 'bin' : type === 'json' ? 'json' : 'txt');
  if (!refresh) {
    try {
      const raw = await fs.readFile(file);
      if (type === 'buffer') return raw;
      const text = raw.toString('utf8');
      return type === 'json' ? JSON.parse(text) : text;
    } catch {
      /* cache miss */
    }
  }
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { 'User-Agent': USER_AGENT, ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(180_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url.slice(0, 160)}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(file, buf);
      if (type === 'buffer') return buf;
      const text = buf.toString('utf8');
      return type === 'json' ? JSON.parse(text) : text;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(2000 * (attempt + 1) ** 2);
    }
  }
  throw lastErr;
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

/** Run an Overpass QL query (JSON output), cached by query text, with mirror fallback. */
export async function overpass(query) {
  const body = new URLSearchParams({ data: query }).toString();
  let lastErr;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      return await cachedFetch(endpoint, {
        key: `overpass:${query}`,
        init: {
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        },
        retries: 1,
      });
    } catch (err) {
      lastErr = err;
      console.warn(`  overpass ${endpoint} failed: ${err.message}`);
    }
  }
  throw lastErr;
}

/** Round coordinates in place-copy to `digits` decimals (5 ≈ 1 m) and drop duplicates. */
export function roundGeometry(geom, digits = 5) {
  if (!geom) return geom;
  const f = 10 ** digits;
  const r = (c) => [Math.round(c[0] * f) / f, Math.round(c[1] * f) / f];
  const line = (cs) => {
    const out = [];
    for (const c of cs) {
      const p = r(c);
      const prev = out[out.length - 1];
      if (!prev || prev[0] !== p[0] || prev[1] !== p[1]) out.push(p);
    }
    return out;
  };
  switch (geom.type) {
    case 'Point':
      return { type: 'Point', coordinates: r(geom.coordinates) };
    case 'MultiPoint':
      return { type: 'MultiPoint', coordinates: geom.coordinates.map(r) };
    case 'LineString':
      return { type: 'LineString', coordinates: line(geom.coordinates) };
    case 'MultiLineString':
      return { type: 'MultiLineString', coordinates: geom.coordinates.map(line) };
    case 'Polygon':
      return { type: 'Polygon', coordinates: geom.coordinates.map(line) };
    case 'MultiPolygon':
      return { type: 'MultiPolygon', coordinates: geom.coordinates.map((p) => p.map(line)) };
    default:
      return geom;
  }
}

/** Write a FeatureCollection to public/stories/bhotekoshi-2026/data/<name>.geojson. */
export async function writeGeoJSON(name, fc, { digits = 5 } = {}) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const out = {
    type: 'FeatureCollection',
    features: fc.features
      .filter((f) => f.geometry && f.geometry.coordinates)
      .map((f) => ({ type: 'Feature', properties: f.properties ?? {}, geometry: roundGeometry(f.geometry, digits) })),
  };
  const file = path.join(DATA_DIR, `${name}.geojson`);
  const text = JSON.stringify(out);
  await fs.writeFile(file, text);
  console.log(`  wrote data/${name}.geojson — ${out.features.length} features, ${(text.length / 1024).toFixed(0)} KB`);
  return file;
}

export async function writeJSON(relPath, value) {
  const file = path.join(OUT_DIR, relPath);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const text = JSON.stringify(value, null, 1);
  await fs.writeFile(file, text);
  console.log(`  wrote ${relPath} — ${(text.length / 1024).toFixed(0)} KB`);
  return file;
}

/** Intermediate results (stats, facts) other steps and the story builder read. */
export const DERIVED_DIR = path.join(CACHE_DIR, 'derived');

export async function writeDerived(name, value) {
  await fs.mkdir(DERIVED_DIR, { recursive: true });
  await fs.writeFile(path.join(DERIVED_DIR, `${name}.json`), JSON.stringify(value, null, 1));
}

export async function readDerived(name) {
  return JSON.parse(await fs.readFile(path.join(DERIVED_DIR, `${name}.json`), 'utf8'));
}

export async function readJSON(relPath) {
  return JSON.parse(await fs.readFile(path.join(OUT_DIR, relPath), 'utf8'));
}

/** Osm element → GeoJSON Feature for `out geom` results (nodes and ways only). */
export function osmToFeature(el, extraProps = {}) {
  const tags = el.tags ?? {};
  const props = { osm_id: `${el.type}/${el.id}`, ...extraProps };
  if (tags.name) props.name = tags['name:en'] || tags.name;
  if (tags['name:ne']) props.name_ne = tags['name:ne'];
  if (el.type === 'node') {
    return { type: 'Feature', properties: { ...props, ...pickTags(tags) }, geometry: { type: 'Point', coordinates: [el.lon, el.lat] } };
  }
  if (el.type === 'way' && el.geometry) {
    const coords = el.geometry.map((g) => [g.lon, g.lat]);
    const closed = coords.length > 3 && coords[0][0] === coords.at(-1)[0] && coords[0][1] === coords.at(-1)[1];
    const isArea = closed && (tags.building || tags.landuse || tags.natural === 'water' || tags.area === 'yes' || tags.amenity || tags.leisure);
    return {
      type: 'Feature',
      properties: { ...props, ...pickTags(tags) },
      geometry: isArea ? { type: 'Polygon', coordinates: [coords] } : { type: 'LineString', coordinates: coords },
    };
  }
  if (el.type === 'way' && el.center) {
    return { type: 'Feature', properties: { ...props, ...pickTags(tags) }, geometry: { type: 'Point', coordinates: [el.center.lon, el.center.lat] } };
  }
  return null;
}

const KEEP_TAGS = ['place', 'population', 'waterway', 'highway', 'bridge', 'building', 'amenity', 'power', 'plant:source', 'plant:output:electricity', 'natural', 'water', 'ele', 'operator', 'healthcare'];

function pickTags(tags) {
  const out = {};
  for (const k of KEEP_TAGS) if (tags[k] !== undefined) out[k.replace(/:/g, '_')] = tags[k];
  return out;
}

export function fmtInt(n) {
  return Math.round(n).toLocaleString('en-US');
}
