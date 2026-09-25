// Major rivers of Nepal from OpenStreetMap (ODbL): named waterway=river ways,
// merged by name, kept when the named river is ≥ minKm long, simplified.

import * as turf from '@turf/turf';
import { overpass, writeGeoJSON } from '../lib.mjs';

export async function buildRivers({ minKm = 45 } = {}) {
  const q = `[out:json][timeout:300];area["ISO3166-1"="NP"][admin_level=2]->.np;way["waterway"="river"]["name"](area.np);out geom;`;
  const res = await overpass(q);
  const byName = new Map();
  for (const el of res.elements) {
    if (el.type !== 'way' || !el.geometry || el.geometry.length < 2) continue;
    const name = el.tags['name:en'] || el.tags.name;
    const coords = el.geometry.map((g) => [g.lon, g.lat]);
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(coords);
  }
  const features = [];
  const lengths = [];
  for (const [name, lines] of byName) {
    const ml = turf.multiLineString(lines);
    const km = turf.length(ml);
    if (km < minKm) continue;
    const simplified = turf.simplify(ml, { tolerance: 0.0015, highQuality: false });
    lengths.push([name, Math.round(km)]);
    features.push({
      type: 'Feature',
      properties: { name, length_km: Math.round(km), stroke: '#3b82f6', 'stroke-width': km > 250 ? 2.2 : km > 120 ? 1.6 : 1.1, 'stroke-opacity': 0.85 },
      geometry: simplified.geometry,
    });
  }
  features.sort((a, b) => b.properties.length_km - a.properties.length_km);
  await writeGeoJSON('rivers-major', { type: 'FeatureCollection', features }, { digits: 4 });
  lengths.sort((a, b) => b[1] - a[1]);
  return { rivers: features.length, osmWays: res.elements.length, longest: lengths.slice(0, 12) };
}
