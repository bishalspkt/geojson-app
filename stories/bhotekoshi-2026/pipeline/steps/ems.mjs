// Copernicus Emergency Management Service rapid-mapping damage grading for an
// activation (e.g. EMSR927, the 26 Aug 2026 Bhote Koshi–Trishuli disaster):
// graded buildings, observed event extent, damaged roads and bridges.
// Vector products only — "© European Union, Copernicus Emergency Management
// Service". (The VHR orthoimagery in the packages is provider-licensed and is
// not redistributed.)

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import * as turf from '@turf/turf';
import { CACHE_DIR, cachedFetch, writeDerived, writeGeoJSON } from '../lib.mjs';

const API = 'https://rapidmapping.emergency.copernicus.eu/backend/dashboard-api/public-activations/?code=';

// `weight` drives the zoomed-out heatmap: destruction counts fully.
const DAMAGE_STYLE = {
  Destroyed: { color: '#7f1d1d', size: 'small', weight: 1 },
  Damaged: { color: '#dc2626', size: 'small', weight: 0.5 },
  'Possibly damaged': { color: '#f59e0b', size: 'small', weight: 0.25 },
  'No visible damage': { color: '#64748b', size: 'small', weight: 0 },
};

/** Latest delivered grading product per AOI. */
function latestProducts(activation) {
  const out = [];
  for (const aoi of activation.aois ?? []) {
    const done = (aoi.products ?? []).filter((p) => p.downloadPath && p.version?.statusCode === 'F');
    done.sort((a, b) => (b.version?.deliveryTime ?? '').localeCompare(a.version?.deliveryTime ?? ''));
    if (done[0]) out.push({ aoi: aoi.name, number: aoi.number, product: done[0] });
  }
  return out;
}

async function extract(url, dir) {
  const zip = await cachedFetch(url, { type: 'buffer' });
  await fs.mkdir(dir, { recursive: true });
  const zipFile = path.join(dir, 'product.zip');
  await fs.writeFile(zipFile, zip);
  execFileSync('unzip', ['-o', '-q', zipFile, '-d', dir]);
  const files = await fs.readdir(dir);
  const read = async (suffix) => {
    const f = files.find((n) => n.includes(`_${suffix}_`) && n.endsWith('.json'));
    return f ? JSON.parse(await fs.readFile(path.join(dir, f), 'utf8')).features : [];
  };
  return {
    builtUp: await read('builtUpP'),
    observed: await read('observedEventA'),
    roads: await read('transportationL'),
    transportPoints: await read('transportationP'),
    aoiPolygon: (await read('areaOfInterestA'))[0] ?? null,
  };
}

export async function buildEms({ code = 'EMSR927', prefix = 'rasuwa-2026' } = {}) {
  const res = await cachedFetch(`${API}${code}`);
  const activation = res.results?.[0] ?? res;
  const products = latestProducts(activation);
  const buildings = [];
  const extent = [];
  const transport = [];
  const aois = [];
  const perAoi = [];
  for (const { aoi, product } of products) {
    const dir = path.join(CACHE_DIR, 'ems', code, aoi.replace(/\W+/g, '_'));
    const url = product.downloadPath.startsWith('http')
      ? product.downloadPath
      : `https://rapidmapping.emergency.copernicus.eu/backend/${product.downloadPath}`;
    const layers = await extract(url, dir);
    const counts = {};
    for (const f of layers.builtUp) {
      const grade = f.properties.damage_gra ?? 'Unknown';
      counts[grade] = (counts[grade] ?? 0) + 1;
      const style = DAMAGE_STYLE[grade] ?? DAMAGE_STYLE['No visible damage'];
      buildings.push({
        type: 'Feature',
        properties: {
          name: `Building — ${grade.toLowerCase()}`,
          damage: grade,
          area: aoi,
          'marker-color': style.color,
          'marker-size': style.size,
          damage_weight: style.weight,
        },
        geometry: f.geometry,
      });
    }
    for (const f of layers.observed) {
      if (!f.geometry) continue;
      extent.push({
        type: 'Feature',
        properties: {
          name: `Observed ${f.properties.obj_desc?.toLowerCase() ?? 'event'} extent (${aoi})`,
          area_ha: Math.round(f.properties.area ?? 0),
          type: f.properties.obj_desc,
          fill: '#78350f',
          'fill-opacity': 0.35,
          stroke: '#451a03',
          'stroke-width': 1.4,
        },
        // ~3 m tolerance: EMS digitises at VHR scale; the story views at 10 m+.
        geometry: turf.simplify(f, { tolerance: 0.00003, highQuality: false }).geometry,
      });
    }
    for (const f of [...layers.roads, ...layers.transportPoints]) {
      if (!['Destroyed', 'Damaged'].includes(f.properties.damage_gra)) continue;
      transport.push({
        type: 'Feature',
        properties: {
          name: `${/Bridge/i.test(f.properties.obj_type ?? '') ? 'Bridge' : 'Road'} — ${f.properties.damage_gra.toLowerCase()}`,
          damage: f.properties.damage_gra,
          area: aoi,
          stroke: '#111827',
          'stroke-width': 3,
          'marker-color': '#111827',
          'marker-symbol': /Bridge/i.test(f.properties.obj_type ?? '') ? 'bridge' : undefined,
        },
        geometry: f.geometry,
      });
    }
    if (layers.aoiPolygon) {
      aois.push({
        type: 'Feature',
        properties: { name: `Copernicus EMS mapped area: ${aoi}`, fill: '#ffffff', 'fill-opacity': 0, stroke: '#0f172a', 'stroke-width': 1.2 },
        geometry: layers.aoiPolygon.geometry,
      });
    }
    perAoi.push({
      aoi,
      delivered: product.version?.deliveryTime?.slice(0, 10),
      imagery: (product.layers ?? []).filter((l) => /ORTHO/.test(l.name ?? '')).map((l) => l.name?.split('_').slice(-4, -2).join(' ')),
      buildings: counts,
      extent_ha: Math.round(layers.observed.reduce((s, f) => s + (f.properties.area ?? 0), 0)),
      bridges_destroyed: layers.transportPoints.filter((f) => f.properties.damage_gra === 'Destroyed').length,
    });
  }
  await writeGeoJSON(`${prefix}-ems-buildings`, { type: 'FeatureCollection', features: buildings }, { digits: 6 });
  await writeGeoJSON(`${prefix}-ems-extent`, { type: 'FeatureCollection', features: extent });
  await writeGeoJSON(`${prefix}-ems-transport`, { type: 'FeatureCollection', features: transport });
  await writeGeoJSON(`${prefix}-ems-aois`, { type: 'FeatureCollection', features: aois });
  const totals = perAoi.reduce((t, a) => {
    for (const [k, v] of Object.entries(a.buildings)) t[k] = (t[k] ?? 0) + v;
    return t;
  }, {});
  const facts = { code, title: activation.name, activated: activation.activationTime, aois: perAoi, totals };
  await writeDerived(`ems-${code}`, facts);
  return facts;
}
