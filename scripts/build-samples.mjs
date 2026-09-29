#!/usr/bin/env node
/**
 * Rebuilds the "Try a demo" datasets in public/samples/ from open data.
 *
 *   node scripts/build-samples.mjs            # all
 *   node scripts/build-samples.mjs quakes     # one (quakes | storms | plates | fires)
 *
 * No dependencies (Node ≥ 22 fetch). Every output is plain GeoJSON styled with
 * simplestyle properties; time fields use names the app auto-detects
 * (`time`, `start`, `coordTimes`) so the timeline lights up on load.
 *
 * Sources (all public domain or open licence — credited in each file's
 * `source` property and in docs/architecture.md):
 * - Earthquakes: USGS ComCat FDSN event service
 * - Storms: NOAA NCEI IBTrACS v04r01 (last3years CSV)
 * - Plates: Bird (2003) PB2002 via github.com/fraxen/tectonicplates (ODC-BY)
 * - Fires: NIFC WFIGS Interagency Fire Perimeters (Los Angeles, January 2025)
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../public/samples/', import.meta.url));
const YEAR = 2025;

// ---------------------------------------------------------------- helpers

async function get(url, as = 'json') {
  const res = await fetch(url, { headers: { 'user-agent': 'geojson.app sample builder' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return as === 'json' ? res.json() : res.text();
}

const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d;
const roundCoords = (c, d) => (typeof c[0] === 'number' ? c.map((n) => round(n, d)) : c.map((x) => roundCoords(x, d)));
const isoDate = (ms) => new Date(ms).toISOString().slice(0, 10);
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s-])\S/g, (m) => m.toUpperCase());

/** Douglas–Peucker on one ring/line (planar degrees — fine at sample scale). */
function simplify(points, tolerance) {
  if (points.length <= 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [x1, y1] = points[a];
    const [x2, y2] = points[b];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1e-12;
    let maxD = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * points[i][0] - dx * points[i][1] + x2 * y1 - y2 * x1) / len;
      if (d > maxD) (maxD = d), (idx = i);
    }
    if (maxD > tolerance) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Planar ring area in square degrees (for dropping slivers). */
function ringArea(ring) {
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) s += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  return Math.abs(s / 2);
}

/** Spherical polygon area in km² (outer rings minus holes). */
function sphericalAreaKm2(geometry) {
  const R = 6371.0088;
  const rad = Math.PI / 180;
  const ring = (r) => {
    let s = 0;
    for (let i = 0; i < r.length - 1; i++) {
      const [l1, p1] = r[i];
      const [l2, p2] = r[i + 1];
      s += (l2 - l1) * rad * (2 + Math.sin(p1 * rad) + Math.sin(p2 * rad));
    }
    return Math.abs((s * R * R) / 2);
  };
  const poly = (p) => ring(p[0]) - p.slice(1).reduce((t, h) => t + ring(h), 0);
  return geometry.type === 'Polygon' ? poly(geometry.coordinates) : geometry.coordinates.reduce((t, p) => t + poly(p), 0);
}

/** Closed rings start and end on the same point, so split at the farthest vertex first. */
function simplifyRing(ring, tolerance) {
  const [x0, y0] = ring[0];
  let far = 1;
  for (let i = 1; i < ring.length; i++) {
    if (Math.hypot(ring[i][0] - x0, ring[i][1] - y0) > Math.hypot(ring[far][0] - x0, ring[far][1] - y0)) far = i;
  }
  return [...simplify(ring.slice(0, far + 1), tolerance), ...simplify(ring.slice(far), tolerance).slice(1)];
}

function simplifyPolygons(geometry, tolerance, minArea) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const out = [];
  for (const p of polys) {
    if (ringArea(p[0]) < minArea) continue;
    const rings = [simplifyRing(p[0], tolerance)];
    for (const hole of p.slice(1)) if (ringArea(hole) >= minArea) rings.push(simplifyRing(hole, tolerance));
    if (rings[0].length >= 4) out.push(rings);
  }
  return out.length === 1 ? { type: 'Polygon', coordinates: out[0] } : { type: 'MultiPolygon', coordinates: out };
}

async function save(name, features, source) {
  const fc = { type: 'FeatureCollection', features };
  // `source` is ignored by renderers but keeps attribution with the file.
  const json = JSON.stringify({ ...fc, source });
  await writeFile(`${OUT}${name}.geojson`, json + '\n');
  console.log(`${name}.geojson  ${features.length} features  ${(json.length / 1024).toFixed(0)} KB`);
}

// ---------------------------------------------------------------- earthquakes

async function quakes() {
  const url =
    `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&orderby=time-asc&minmagnitude=5.5` +
    `&starttime=${YEAR}-01-01&endtime=${YEAR + 1}-01-01`;
  const data = await get(url);
  const depthClass = (km) => (km < 70 ? ['Shallow', '#ef4444'] : km < 300 ? ['Intermediate', '#f59e0b'] : ['Deep', '#8b5cf6']);
  const features = data.features
    .filter((f) => f.properties.type === 'earthquake')
    .map((f) => {
      const p = f.properties;
      const [lon, lat, depth] = f.geometry.coordinates;
      const [depthName, color] = depthClass(depth);
      const mag = round(p.mag, 1);
      return {
        type: 'Feature',
        properties: {
          name: `M${mag.toFixed(1)} · ${p.place ?? 'Unknown location'}`,
          magnitude: mag,
          depth_km: round(depth, 1),
          depth_class: depthName,
          time: new Date(p.time).toISOString().replace('.000Z', 'Z'),
          ...(p.alert ? { pager_alert: p.alert } : {}),
          ...(p.tsunami ? { tsunami_flag: true } : {}),
          ...(p.felt ? { felt_reports: p.felt } : {}),
          url: p.url,
          'marker-color': color,
          'marker-size': mag >= 7 ? 'large' : mag >= 6.3 ? 'medium' : 'small',
        },
        geometry: { type: 'Point', coordinates: [round(lon, 3), round(lat, 3)] },
      };
    });
  await save('earthquakes-2025', features, `USGS ComCat, M5.5+ earthquakes in ${YEAR} (public domain)`);
}

// ---------------------------------------------------------------- tropical cyclones

const BASINS = { NA: 'North Atlantic', EP: 'East Pacific', WP: 'West Pacific', NI: 'North Indian', SI: 'South Indian', SP: 'South Pacific', SA: 'South Atlantic' };
const CATEGORIES = [
  // [min 1-min sustained wind (kt), label, colour, width]
  [137, 'Category 5', '#d946ef', 4],
  [113, 'Category 4', '#ef4444', 3.5],
  [96, 'Category 3', '#f97316', 3],
  [83, 'Category 2', '#fb923c', 2.5],
  [64, 'Category 1', '#facc15', 2.2],
  [34, 'Tropical storm', '#38bdf8', 1.6],
];

async function storms() {
  const csv = await get(
    'https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/ibtracs.last3years.list.v04r01.csv',
    'text',
  );
  const lines = csv.split('\n');
  const head = lines[0].split(',');
  const col = Object.fromEntries(head.map((h, i) => [h, i]));
  const num = (v) => (v && v.trim() ? Number(v) : NaN);
  const bySid = new Map();
  for (const line of lines.slice(2)) {
    if (!line) continue;
    const r = line.split(',');
    // 'main' or 'PROVISIONAL' (recent storms); skip the 'spur' branches.
    if (r[col.TRACK_TYPE].includes('spur')) continue;
    const iso = r[col.ISO_TIME]; // "2025-10-28 12:00:00"
    // Synoptic 6-hourly fixes only; the 3-hourly rows are interpolated.
    if (!/ (00|06|12|18):00:00$/.test(iso)) continue;
    let rows = bySid.get(r[col.SID]);
    if (!rows) bySid.set(r[col.SID], (rows = []));
    rows.push({
      name: r[col.NAME],
      basin: r[col.BASIN],
      t: `${iso.replace(' ', 'T').slice(0, 16)}Z`, // 2025-10-28T12:00Z
      lat: num(r[col.LAT]),
      lon: num(r[col.LON]),
      wind: Number.isFinite(num(r[col.USA_WIND])) ? num(r[col.USA_WIND]) : num(r[col.WMO_WIND]),
      pres: Number.isFinite(num(r[col.USA_PRES])) ? num(r[col.USA_PRES]) : num(r[col.WMO_PRES]),
    });
  }

  const features = [];
  for (const rows of bySid.values()) {
    if (rows.length < 3 || !rows[0].t.startsWith(String(YEAR))) continue;
    const name = rows[0].name;
    if (!name || name === 'NOT_NAMED' || name === 'UNNAMED') continue;
    const peak = Math.max(...rows.map((r) => r.wind).filter(Number.isFinite));
    if (!(peak >= 34)) continue;
    const pressures = rows.map((r) => r.pres).filter(Number.isFinite);
    const [, category, color, width] = CATEGORIES.find(([min]) => peak >= min);
    // Unwrap longitudes so antimeridian crossers stay one continuous line.
    const coords = [];
    let prev = null;
    for (const r of rows) {
      let lon = r.lon;
      if (prev !== null) while (lon - prev > 180) lon -= 360;
      if (prev !== null) while (prev - lon > 180) lon += 360;
      coords.push([round(lon, 2), round(r.lat, 2)]);
      prev = lon;
    }
    const peakRow = rows.find((r) => r.wind === peak);
    features.push({
      type: 'Feature',
      properties: {
        name: titleCase(name),
        category,
        basin: BASINS[rows[0].basin] ?? rows[0].basin,
        peak_wind_kt: peak,
        peak_wind_kmh: Math.round(peak * 1.852),
        ...(pressures.length ? { min_pressure_hpa: Math.min(...pressures) } : {}),
        formed: rows[0].t.slice(0, 10),
        peaked: peakRow.t.slice(0, 10),
        dissipated: rows.at(-1).t.slice(0, 10),
        coordTimes: rows.map((r) => r.t),
        stroke: color,
        'stroke-width': width,
        'stroke-opacity': 0.9,
      },
      geometry: { type: 'LineString', coordinates: coords },
    });
  }
  // Strongest last so they draw on top.
  features.sort((a, b) => a.properties.peak_wind_kt - b.properties.peak_wind_kt);
  await save('storms-2025', features, `NOAA NCEI IBTrACS v04r01, named tropical cyclones forming in ${YEAR} (public domain)`);
}

// ---------------------------------------------------------------- tectonic plates

async function plates() {
  const base = 'https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/';
  const [plateData, boundaryData] = await Promise.all([get(base + 'PB2002_plates.json'), get(base + 'PB2002_boundaries.json')]);
  const names = Object.fromEntries(plateData.features.map((f) => [f.properties.Code, f.properties.PlateName]));
  const areas = new Map();
  for (const f of plateData.features) {
    const code = f.properties.Code;
    areas.set(code, (areas.get(code) ?? 0) + sphericalAreaKm2(f.geometry));
  }
  // Earthy palette, cycled; big plates get stronger fills.
  const PALETTE = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#a855f7', '#14b8a6', '#ec4899', '#84cc16', '#6366f1', '#f43f5e'];
  const plateFeatures = plateData.features.map((f, i) => {
    const code = f.properties.Code;
    const area = areas.get(code);
    const kind = area > 2e7 ? 'Major plate' : area > 1e6 ? 'Minor plate' : 'Microplate';
    return {
      type: 'Feature',
      properties: {
        name: `${f.properties.PlateName} Plate`,
        code,
        kind,
        area_km2: Math.round(area / 1000) * 1000,
        fill: PALETTE[i % PALETTE.length],
        'fill-opacity': kind === 'Major plate' ? 0.14 : 0.26,
        stroke: PALETTE[i % PALETTE.length],
        'stroke-width': 0,
      },
      geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates, 3) },
    };
  });
  const boundaryFeatures = boundaryData.features.map((f) => {
    const { PlateA, PlateB, Type } = f.properties;
    const subduction = Type === 'subduction';
    return {
      type: 'Feature',
      properties: {
        name: `${names[PlateA] ?? PlateA} – ${names[PlateB] ?? PlateB}`,
        boundary: subduction ? 'Subduction zone' : 'Ridge or transform',
        stroke: subduction ? '#dc2626' : '#f59e0b',
        'stroke-width': subduction ? 2.6 : 1.6,
        'stroke-opacity': 0.95,
      },
      geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates, 3) },
    };
  });
  await save('tectonic-plates', [...plateFeatures, ...boundaryFeatures], 'Bird (2003) PB2002 plate model via github.com/fraxen/tectonicplates (ODC-BY 1.0)');
}

// ---------------------------------------------------------------- wildfires

/** The fires that burned around Los Angeles in January 2025. */
async function fires() {
  const q = new URLSearchParams({
    where:
      "attr_IncidentTypeCategory = 'WF' AND attr_POOState = 'US-CA' AND poly_GISAcres >= 40 " +
      "AND attr_FireDiscoveryDateTime >= DATE '2025-01-06' AND attr_FireDiscoveryDateTime < DATE '2025-02-01'",
    geometry: '-119.6,33.6,-117.4,34.9',
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    outFields: 'poly_IncidentName,poly_GISAcres,attr_FireDiscoveryDateTime,attr_ContainmentDateTime,attr_POOCounty,attr_FireCause',
    outSR: '4326',
    f: 'geojson',
  });
  const data = await get(
    `https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters/FeatureServer/0/query?${q}`,
  );
  const color = (acres) => (acres >= 10000 ? '#dc2626' : acres >= 500 ? '#f97316' : '#f59e0b');
  const features = data.features
    .filter((f) => f.geometry)
    .sort((a, b) => b.properties.poly_GISAcres - a.properties.poly_GISAcres) // small fires on top
    .map((f) => {
      const p = f.properties;
      const acres = Math.round(p.poly_GISAcres);
      const end = p.attr_ContainmentDateTime;
      const geometry = simplifyPolygons(f.geometry, 0.00012, 1e-8);
      return {
        type: 'Feature',
        properties: {
          name: `${titleCase(p.poly_IncidentName.trim())} Fire`,
          county: p.attr_POOCounty,
          acres,
          area_km2: round(acres * 0.00404686, 1),
          cause: p.attr_FireCause === 'Human' ? 'Human-caused' : p.attr_FireCause || 'Undetermined',
          start: new Date(p.attr_FireDiscoveryDateTime).toISOString().slice(0, 16) + 'Z',
          ...(end && end > p.attr_FireDiscoveryDateTime ? { contained: isoDate(end) } : {}),
          fill: color(acres),
          'fill-opacity': 0.4,
          stroke: color(acres),
          'stroke-width': 1.5,
        },
        geometry: { type: geometry.type, coordinates: roundCoords(geometry.coordinates, 5) },
      };
    });
  await save('la-fires-2025', features, 'NIFC WFIGS Interagency Fire Perimeters, Los Angeles-area wildfires of January 2025 (public domain)');
}

// ---------------------------------------------------------------- main

const BUILDERS = { quakes, storms, plates, fires };
const only = process.argv.slice(2);
for (const [name, build] of Object.entries(BUILDERS)) {
  if (only.length && !only.includes(name)) continue;
  await build();
}
