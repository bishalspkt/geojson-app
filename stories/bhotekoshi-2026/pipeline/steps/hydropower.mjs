// Hydropower on the Bhote Koshi–Trishuli corridor.
//
// The affected projects come from inputs/official-2026/hydropower_affected_2026.geojson:
// one point per mapped component (headworks, powerhouse, project area) with
// coordinates from OpenStreetMap or DoED licence points, and per-project
// status, damage, missing workers (Energy Minister's list to Parliament,
// Kathmandu Post 23 Sep) and bodies recovered (NDRRMA sitreps). Projects on the
// corridor with no damage report are added from the Humanitarian OpenStreetMap
// Team's "exposed hydropowers" layer (HDX, ODbL).

import fs from 'node:fs/promises';
import path from 'node:path';
import * as turf from '@turf/turf';
import { DATA_DIR, PIPELINE_DIR, cachedFetch, writeDerived, writeGeoJSON } from '../lib.mjs';

const HOT_URL = 'https://production-raw-data-api.s3.amazonaws.com/ISO3/NPL/combined/hot_flood_npl_exposed_hydropowers.geojson';
const CURATED = path.join(PIPELINE_DIR, 'inputs', 'official-2026', 'hydropower_affected_2026.geojson');

/** Workers missing per project, 23 Sep (Energy Minister to Parliament, via the Kathmandu Post). */
export const MISSING_WORKERS = [
  ['Upper Trishuli-1', 439],
  ['Upper Trishuli-3B', 178],
  ['Rasuwagadhi', 93],
  ['Langtang Khola', 39],
  ['Upper Trishuli-3A', 39],
  ['Mailung Khola', 7],
  ['Rasuwa Bhotekoshi', 3],
  ['Trishuli', 3],
  ['Middle Trishuli Ganga', 2],
  ['Chilime', 1],
];

/** Which component carries the label, per project (the rest are drawn small). */
const PRIMARY = {
  'Rasuwagadhi HEP': 'headworks/dam',
  'Chilime HEP': 'powerhouse',
  'Upper Trishuli-1 HEP (UT-1)': 'project area (Mailung)',
  'Upper Trishuli-3A HEP': 'headworks/dam area',
  'Upper Trishuli-3B HEP': 'powerhouse',
  'Trishuli HEP': 'dam',
  'Devighat HEP': 'powerhouse/substation',
};

const STATUS = { Operation: 'operating', 'Under Construction': 'under construction', Survey: 'survey licence' };
const key = (name) =>
  name
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\bhep\b|hydropower project|hydroelectric project/g, '')
    .replace(/[^a-z0-9]/g, '');
const short = (name) =>
  /solar/i.test(name) ? 'NEA solar plant, Nuwakot' : name.replace(/\s*\((UT-\d\w?)\)/, '').replace(/ HEP$/, '');

export async function buildHydropower() {
  const flow = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'rasuwa-2026-flow.geojson'), 'utf8')).features[0];
  const line = turf.lineString(flow.geometry.coordinates);
  const dist = (coords) => Math.round(turf.pointToLineDistance(turf.point(coords), line, { units: 'kilometers' }) * 1000);
  const curated = JSON.parse(await fs.readFile(CURATED, 'utf8')).features;

  const features = [];
  const seen = new Set();
  const byProject = new Map();
  for (const f of curated) {
    const list = byProject.get(f.properties.project) ?? [];
    list.push(f);
    byProject.set(f.properties.project, list);
  }
  for (const [project, parts] of byProject) {
    const p = parts[0].properties;
    const name = short(project);
    const primaryRole = PRIMARY[project] ?? parts.find((x) => !/licence point/.test(x.properties.point_role))?.properties.point_role ?? parts[0].properties.point_role;
    const missing = Number.isFinite(p.missing_workers_23sep) ? p.missing_workers_23sep : null;
    const solar = /solar/i.test(project);
    seen.add(key(project));
    const primaryIndex = Math.max(0, parts.findIndex((x) => x.properties.point_role === primaryRole));
    parts.forEach((part, i) => {
      const primary = i === primaryIndex;
      features.push({
        type: 'Feature',
        properties: {
          name,
          part: part.properties.point_role,
          capacity_mw: p.capacity_mw ?? null,
          status: String(p.status_pre_event ?? '').replace(/\s*\(.*\)$/, '') || null,
          damage: p.damage || 'reported damaged',
          missing_workers: missing,
          bodies_recovered: p.bodies_recovered || null,
          note: p.notes || null,
          distance_to_flow_m: dist(part.geometry.coordinates),
          source: `Curated from NEA, NDRRMA and press reports; location ${part.properties.coord_source}`,
          label: primary ? `${name} · ${p.capacity_mw} MW${missing ? ` · ${missing} missing` : ''}` : null,
          'marker-color': solar ? '#b45309' : '#b91c1c',
          'marker-size': primary ? ((p.capacity_mw ?? 0) >= 100 ? 'large' : 'medium') : 'small',
          'marker-symbol': solar ? undefined : 'dam',
        },
        geometry: { type: 'Point', coordinates: part.geometry.coordinates.map((c) => Math.round(c * 1e5) / 1e5) },
      });
    });
  }

  // Corridor projects with no damage report (HOT; statuses as HOT lists them).
  const hot = await cachedFetch(HOT_URL);
  for (const f of hot.features) {
    const pr = f.properties;
    if (seen.has(key(pr.name))) continue;
    features.push({
      type: 'Feature',
      properties: {
        name: pr.name,
        part: 'licence point (approx.)',
        capacity_mw: pr.capacity_mw ?? null,
        status: STATUS[pr.status] ?? pr.status ?? null,
        damage: 'no damage report found',
        missing_workers: null,
        bodies_recovered: null,
        note: null,
        distance_to_flow_m: dist(f.geometry.coordinates),
        source: 'HOT exposed hydropower (HDX, ODbL)',
        label: pr.capacity_mw ? `${pr.name} · ${pr.capacity_mw} MW` : pr.name,
        'marker-color': '#64748b',
        'marker-size': 'small',
        'marker-symbol': 'dam',
      },
      geometry: { type: 'Point', coordinates: f.geometry.coordinates.map((c) => Math.round(c * 1e5) / 1e5) },
    });
  }
  await writeGeoJSON('hydropower', { type: 'FeatureCollection', features });

  const projects = [...new Map(features.map((f) => [f.properties.name, f.properties])).values()];
  const facts = {
    projects: projects.map((p) => ({ name: p.name, mw: p.capacity_mw, status: p.status, damage: p.damage, missing: p.missing_workers })),
    missingWorkers: MISSING_WORKERS.map(([name, n]) => ({ name, n })),
    missingTotal: MISSING_WORKERS.reduce((a, [, n]) => a + n, 0),
  };
  await writeDerived('hydropower', facts);
  return { missingTotal: facts.missingTotal, projects: projects.length };
}
