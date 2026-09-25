// Population living near each flow path, from Kontur's H3 population grid
// (res 8, ~0.74 km² cells; CC BY 4.0). Cells whose centres fall inside a
// buffer around the path are summed. Res-8 cells are coarse next to a 250 m
// corridor, so the figures are an order-of-magnitude exposure estimate, and
// the story says so.

import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import * as turf from '@turf/turf';
import { cellToBoundary, polygonToCells } from 'h3-js';
import { CACHE_DIR, DATA_DIR, cachedFetch, readDerived, writeDerived, writeGeoJSON } from '../lib.mjs';

const URL = 'https://geodata-eu-central-1-kontur-public.s3.amazonaws.com/kontur_datasets/kontur_population_NP_20231101.gpkg.gz';
const EVENTS = ['rasuwa-2026'];
const BUFFERS_KM = [0.5, 1];

async function loadPopulation() {
  const gpkg = path.join(CACHE_DIR, 'kontur_population_NP_20231101.gpkg');
  try {
    await fs.access(gpkg);
  } catch {
    const gz = await cachedFetch(URL, { type: 'buffer' });
    await fs.writeFile(gpkg, zlib.gunzipSync(gz));
  }
  const db = new DatabaseSync(gpkg, { readOnly: true });
  const table = db.prepare(`SELECT table_name FROM gpkg_contents WHERE data_type = 'features'`).get().table_name;
  const rows = db.prepare(`SELECT h3, population FROM "${table}"`).all();
  db.close();
  return new Map(rows.map((r) => [r.h3, r.population]));
}

export async function buildPopulation() {
  const pop = await loadPopulation();
  const out = {};
  for (const id of EVENTS) {
    const flow = JSON.parse(await fs.readFile(path.join(DATA_DIR, `${id}-flow.geojson`), 'utf8')).features[0];
    out[id] = {};
    for (const km of BUFFERS_KM) {
      const buf = turf.buffer(flow, km, { units: 'kilometers', steps: 6 });
      const polys = buf.geometry.type === 'Polygon' ? [buf.geometry.coordinates] : buf.geometry.coordinates;
      const cells = new Set();
      for (const poly of polys) for (const c of polygonToCells(poly, 8, true)) cells.add(c);
      let total = 0;
      for (const c of cells) total += pop.get(c) ?? 0;
      out[id][`within_${km * 1000}m`] = Math.round(total);
    }
  }
  // Map layer: every populated cell within 2 km of the 2026 path, shaded by people per cell.
  const flow = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'rasuwa-2026-flow.geojson'), 'utf8')).features[0];
  const buf = turf.buffer(flow, 2, { units: 'kilometers', steps: 6 });
  const polys = buf.geometry.type === 'Polygon' ? [buf.geometry.coordinates] : buf.geometry.coordinates;
  const cells = new Set();
  for (const poly of polys) for (const c of polygonToCells(poly, 8, true)) cells.add(c);
  const CLASSES = [
    { max: 50, color: '#fee8c8' },
    { max: 200, color: '#fdbb84' },
    { max: 500, color: '#fc8d59' },
    { max: 1500, color: '#e34a33' },
    { max: Infinity, color: '#b30000' },
  ];
  const hexes = [...cells]
    .map((c) => ({ c, n: pop.get(c) ?? 0 }))
    .filter((h) => h.n >= 5)
    .map(({ c, n }) => ({
      type: 'Feature',
      properties: {
        population: Math.round(n),
        fill: CLASSES.find((k) => n <= k.max).color,
        'fill-opacity': 0.55,
        stroke: '#7f1d1d',
        'stroke-width': 0.3,
        'stroke-opacity': 0.4,
      },
      geometry: { type: 'Polygon', coordinates: [[...cellToBoundary(c, true), cellToBoundary(c, true)[0]]] },
    }));
  await writeGeoJSON('population-2km', { type: 'FeatureCollection', features: hexes }, { digits: 5 });

  const facts = { source: 'Kontur Population (2023-11-01), H3 res 8, CC BY 4.0', nationalTotal: Math.round([...pop.values()].reduce((a, b) => a + b, 0)), events: out, within_2km: Math.round(hexes.reduce((a, h) => a + h.properties.population, 0)) };
  await writeDerived('population', facts);
  // Keep the derived facts next to other event facts.
  for (const id of EVENTS) {
    const f = await readDerived(`event-${id}`).catch(() => null);
    if (!f) continue;
    await writeDerived(`event-${id}`, { ...f, population: out[id] });
  }
  return facts;
}
