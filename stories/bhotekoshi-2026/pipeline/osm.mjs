// OpenStreetMap extracts for an event area (ODbL — "© OpenStreetMap contributors").

import * as turf from '@turf/turf';
import { overpass, osmToFeature } from './lib.mjs';

const bb = ([w, s, e, n]) => `${s},${w},${n},${e}`;

/** Settlements: towns, villages, hamlets and named localities. */
export async function fetchPlaces(bbox, { date } = {}) {
  const q = `${header(120, date)}node["place"~"^(city|town|village|hamlet|suburb|neighbourhood|locality|isolated_dwelling)$"](${bb(bbox)});out;`;
  const res = await overpass(q);
  return res.elements.map((el) => osmToFeature(el)).filter((f) => f && f.properties.name);
}

/** `[date:…]` makes Overpass answer from OSM's history (the map as it was then). */
const header = (timeout, date) => `[out:json][timeout:${timeout}]${date ? `[date:"${date}"]` : ''};`;

/** Building footprints (polygons). `date` = OSM as of that instant (pre-event state). */
export async function fetchBuildings(bbox, { date } = {}) {
  const q = `${header(180, date)}way["building"](${bb(bbox)});out geom;`;
  const res = await overpass(q);
  return res.elements
    .map((el) => osmToFeature(el))
    .filter((f) => f && f.geometry.type === 'Polygon' && f.geometry.coordinates[0].length >= 4)
    .map((f) => ({ ...f, properties: { osm_id: f.properties.osm_id, building: f.properties.building ?? 'yes', ...(f.properties.name ? { name: f.properties.name } : {}) } }));
}

/** Ids of buildings that exist in OSM today (to spot footprints deleted since an event). */
export async function currentBuildingIds(bbox) {
  const q = `[out:json][timeout:180];way["building"](${bb(bbox)});out ids;`;
  const res = await overpass(q);
  return new Set(res.elements.map((el) => `way/${el.id}`));
}

/** Infrastructure the flows hit: bridges, hydropower, dams, schools, health facilities. */
export async function fetchInfrastructure(bbox, { date } = {}) {
  const b = bb(bbox);
  const q = `${header(180, date)}
(
  way["bridge"="yes"]["highway"](${b});
  nwr["power"="plant"]["plant:source"="hydro"](${b});
  nwr["power"="generator"]["generator:source"="hydro"](${b});
  nwr["waterway"~"^(dam|weir)$"](${b});
  nwr["amenity"~"^(school|college|hospital|clinic|doctors)$"](${b});
  nwr["healthcare"](${b});
);
out center tags;`;
  const res = await overpass(q);
  const out = [];
  for (const el of res.elements) {
    const t = el.tags ?? {};
    let kind = null;
    if (t.bridge === 'yes' && t.highway) kind = 'bridge';
    else if (t.power === 'plant' || t.power === 'generator') kind = 'hydropower';
    else if (t.waterway === 'dam' || t.waterway === 'weir') kind = 'headworks';
    else if (/^(school|college)$/.test(t.amenity ?? '')) kind = 'school';
    else if (t.amenity || t.healthcare) kind = 'health';
    if (!kind) continue;
    const coords = el.type === 'node' ? [el.lon, el.lat] : el.center ? [el.center.lon, el.center.lat] : null;
    if (!coords) continue;
    out.push({
      type: 'Feature',
      properties: {
        kind,
        name: t['name:en'] || t.name || (kind === 'bridge' ? `${t.highway} bridge` : kind),
        ...(t['plant:output:electricity'] ? { capacity: t['plant:output:electricity'] } : {}),
        ...(t.operator ? { operator: t.operator } : {}),
        osm_id: `${el.type}/${el.id}`,
      },
      geometry: { type: 'Point', coordinates: coords },
    });
  }
  return out;
}

/** Main roads (trunk → tertiary) as lines. */
export async function fetchRoads(bbox) {
  const q = `[out:json][timeout:180];way["highway"~"^(trunk|primary|secondary|tertiary)$"](${bb(bbox)});out geom;`;
  const res = await overpass(q);
  return res.elements
    .map((el) => osmToFeature(el))
    .filter((f) => f && f.geometry.type === 'LineString')
    .map((f) => ({ ...f, properties: { name: f.properties.name ?? null, highway: f.properties.highway } }));
}

/** Features whose centroid lies within `km` of a line. Adds `dist_m`. */
export function nearLine(features, lineCoords, km) {
  const line = turf.lineString(lineCoords);
  const [w, s, e, n] = turf.bbox(turf.buffer(line, km, { units: 'kilometers' }));
  const out = [];
  for (const f of features) {
    const c = f.geometry.type === 'Point' ? f.geometry.coordinates : turf.centroid(f).geometry.coordinates;
    if (c[0] < w || c[0] > e || c[1] < s || c[1] > n) continue;
    const d = turf.pointToLineDistance(c, line, { units: 'kilometers' });
    if (d <= km) out.push({ ...f, properties: { ...f.properties, dist_m: Math.round(d * 1000) } });
  }
  return out;
}

/** Features whose centroid falls inside any of the polygons. */
export function insideAny(features, polygons) {
  const boxes = polygons.map((p) => ({ p, b: turf.bbox(p) }));
  return features.filter((f) => {
    const c = f.geometry.type === 'Point' ? f.geometry.coordinates : turf.centroid(f).geometry.coordinates;
    return boxes.some(({ p, b }) => c[0] >= b[0] && c[0] <= b[2] && c[1] >= b[1] && c[1] <= b[3] && turf.booleanPointInPolygon(c, p));
  });
}
