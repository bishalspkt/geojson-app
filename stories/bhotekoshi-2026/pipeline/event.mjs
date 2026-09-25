// One debris-flow / GLOF event → map layers, imagery and statistics.
//
//   flow path      a researched centreline (inputs/flowpaths) or OSM waterways
//                  routed source → end; per-vertex arrival times interpolated
//                  between reported anchor times (km chainage or points)
//   profile        elevation along the path (Terrarium DEM)
//   places         OSM settlements in the corridor as they were before the event,
//                  with modelled arrival times
//   buildings      OSM footprints near the channel (pre-event, via Overpass
//                  attic data); flagged when inside Sentinel-2 change polygons or
//                  deleted from OSM since the event
//   infrastructure bridges, hydropower, headworks, schools, health facilities
//   imagery        per area of interest: Sentinel-2 L2A before/after chips and
//                  change polygons (ground stripped or buried)

import fs from 'node:fs/promises';
import path from 'node:path';
import * as turf from '@turf/turf';
import { PIPELINE_DIR, overpass, osmToFeature, writeDerived, writeGeoJSON } from './lib.mjs';
import { fetchWaterways, buildGraph, routeAlong, timeVertices, cumulative, arrivalAt, simplifyPath, locate } from './flowpath.mjs';
import { elevations } from './dem.mjs';
import { nearLine, insideAny } from './osm.mjs';
import { mercatorGrid, searchS2, pickClearest, readRGB, sharedStretch, writeTrueColor, reflectanceOnGrid } from './sentinel.mjs';
import { detectChange } from './change.mjs';

const iso = (ms) => new Date(Math.round(ms / 1000) * 1000).toISOString().replace('.000Z', 'Z');

/** Route through ordered waypoints (source → … → end) and concatenate legs. */
function routeVia(graph, points) {
  const coords = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const leg = routeAlong(graph, points[i], points[i + 1]);
    coords.push(...(i === 0 ? leg.coords : leg.coords.slice(1)));
  }
  return coords;
}

async function loadPath(cfg) {
  if (cfg.pathFile) {
    const fc = JSON.parse(await fs.readFile(path.join(PIPELINE_DIR, cfg.pathFile), 'utf8'));
    const g = (fc.features?.[0] ?? fc).geometry;
    let coords = g.type === 'MultiLineString' ? g.coordinates.flat() : g.coordinates;
    if (cfg.pathEndKm) {
      coords = turf.lineSliceAlong(turf.lineString(coords), 0, cfg.pathEndKm).geometry.coordinates;
    }
    return coords;
  }
  const ways = await fetchWaterways(cfg.routeBbox, { streams: true });
  const coords = routeVia(buildGraph(ways), [cfg.source, ...(cfg.waypoints ?? []), cfg.end]);
  return turf.distance(cfg.source, coords[0]) > 0.02 ? [cfg.source, ...coords] : coords;
}

/** Overpass `poly:` filter for a buffer around the path (simplified to keep the query short). */
function corridorPoly(coords, km) {
  let buf = turf.buffer(turf.lineString(coords), km, { units: 'kilometers', steps: 4 });
  buf = turf.simplify(buf, { tolerance: Math.max(0.0008, km / 400), highQuality: false });
  const g = buf.geometry;
  const ring = g.type === 'Polygon' ? g.coordinates[0] : g.coordinates.sort((a, b) => b[0].length - a[0].length)[0][0];
  return `poly:"${ring.map(([x, y]) => `${y.toFixed(5)} ${x.toFixed(5)}`).join(' ')}"`;
}

const header = (timeout, date) => `[out:json][timeout:${timeout}][maxsize:536870912]${date ? `[date:"${date}"]` : ''};`;

async function corridorPlaces(coords, km, date) {
  const q = `${header(180, date)}node["place"~"^(city|town|village|hamlet|suburb|neighbourhood|locality|isolated_dwelling)$"](${corridorPoly(coords, km)});out;`;
  return (await overpass(q)).elements.map((el) => osmToFeature(el)).filter((f) => f?.properties.name);
}

async function corridorBuildings(coords, km, date) {
  const q = `${header(300, date)}way["building"](${corridorPoly(coords, km)});out geom;`;
  return (await overpass(q)).elements
    .map((el) => osmToFeature(el))
    .filter((f) => f && f.geometry.type === 'Polygon' && f.geometry.coordinates[0].length >= 4)
    .map((f) => ({ ...f, properties: { osm_id: f.properties.osm_id, building: f.properties.building ?? 'yes' } }));
}

/**
 * Buildings present at `date` (default: today): ids plus a coarse spatial
 * index of their footprints, so a pre-event building whose id disappeared can
 * be told apart from one that was merely redrawn (post-disaster remapping
 * replaces footprints with new ids).
 */
async function corridorBuildingsAt(coords, km, date) {
  const q = `${header(300, date)}way["building"](${corridorPoly(coords, km)});out geom;`;
  const els = (await overpass(q)).elements.filter((el) => el.geometry?.length >= 4);
  const ids = new Set(els.map((el) => `way/${el.id}`));
  const CELL = 0.0005; // ~50 m
  const index = new Map();
  for (const el of els) {
    const ring = el.geometry.map((g) => [g.lon, g.lat]);
    const poly = turf.polygon([ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1] ? ring : [...ring, ring[0]]]);
    const [w, s, e, n] = turf.bbox(poly);
    for (let x = Math.floor(w / CELL); x <= Math.floor(e / CELL); x++) {
      for (let y = Math.floor(s / CELL); y <= Math.floor(n / CELL); y++) {
        const key = `${x}:${y}`;
        if (!index.has(key)) index.set(key, []);
        index.get(key).push(poly);
      }
    }
  }
  const covered = (pt) => (index.get(`${Math.floor(pt[0] / CELL)}:${Math.floor(pt[1] / CELL)}`) ?? []).some((p) => turf.booleanPointInPolygon(pt, p));
  return { ids, covered };
}

async function corridorInfrastructure(coords, km, date) {
  const p = corridorPoly(coords, km);
  const q = `${header(240, date)}
(
  way["bridge"="yes"]["highway"](${p});
  nwr["power"="plant"]["plant:source"="hydro"](${p});
  nwr["power"="generator"]["generator:source"="hydro"](${p});
  nwr["waterway"~"^(dam|weir)$"](${p});
  nwr["amenity"~"^(school|college|hospital|clinic|doctors)$"](${p});
  nwr["healthcare"](${p});
);
out center tags;`;
  const out = [];
  for (const el of (await overpass(q)).elements) {
    const t = el.tags ?? {};
    let kind = null;
    if (t.bridge === 'yes' && t.highway) kind = 'bridge';
    else if (t.power === 'plant' || t.power === 'generator') kind = 'hydropower';
    else if (t.waterway === 'dam' || t.waterway === 'weir') kind = 'headworks';
    else if (/^(school|college)$/.test(t.amenity ?? '')) kind = 'school';
    else if (t.amenity || t.healthcare) kind = 'health';
    const c = el.type === 'node' ? [el.lon, el.lat] : el.center ? [el.center.lon, el.center.lat] : null;
    if (!kind || !c) continue;
    // Footbridges and farm tracks crowd the map; keep vehicle bridges and named crossings.
    if (kind === 'bridge' && !t.name && !/^(trunk|primary|secondary|tertiary|unclassified|residential)$/.test(t.highway)) continue;
    out.push({
      type: 'Feature',
      properties: {
        kind,
        name: t['name:en'] || t.name || (kind === 'bridge' ? `Bridge (${t.highway})` : kind === 'hydropower' ? 'Hydropower' : kind),
        ...(t['plant:output:electricity'] ? { capacity: t['plant:output:electricity'] } : {}),
        osm_id: `${el.type}/${el.id}`,
      },
      geometry: { type: 'Point', coordinates: c },
    });
  }
  return out;
}

/** Sentinel-2 before/after for one area of interest; returns chips + change polygons. */
async function imageryFor(event, aoi, coords) {
  const grid = mercatorGrid(aoi.bbox, aoi.meters ?? 10);
  const pick = async (which) => {
    const w = aoi[which];
    const items = await searchS2({ bbox: aoi.bbox, datetime: w.datetime, maxCloud: w.maxCloud ?? 40 });
    console.log(`   [${event.id}/${aoi.id}] ${which}: ${items.length} candidate items`);
    const best = await pickClearest(items, grid, { maxCandidates: w.maxCandidates ?? 10, prefer: w.prefer });
    if (!best) throw new Error(`no ${which} scene for ${event.id}/${aoi.id}`);
    return best;
  };
  const before = await pick('before');
  const after = await pick('after');
  const rgbBefore = await readRGB(before.items, grid);
  const rgbAfter = await readRGB(after.items, grid);
  const stretch = { ...sharedStretch([rgbBefore, rgbAfter]), ...(aoi.tone ?? {}) };
  const base = `${event.id}-${aoi.id}`;
  await writeTrueColor(rgbBefore, grid, `${base}-before.webp`, stretch);
  await writeTrueColor(rgbAfter, grid, `${base}-after.webp`, stretch);
  // Corridor mask: only the part of the path inside this AOI.
  const clip = turf.bboxClip(turf.lineString(coords), aoi.bbox).geometry;
  const lines = (clip.type === 'MultiLineString' ? clip.coordinates : [clip.coordinates]).filter((l) => l.length >= 2);
  const nirB = await reflectanceOnGrid(before.items, 'nir', grid);
  const nirA = await reflectanceOnGrid(after.items, 'nir', grid);
  const change = detectChange(
    grid,
    { red: rgbBefore.red, green: rgbBefore.green, nir: nirB, scl: before.scl },
    { red: rgbAfter.red, green: rgbAfter.green, nir: nirA, scl: after.scl },
    lines,
    { maxDistance: aoi.corridorM ?? event.corridorM ?? 500, minPixels: aoi.minPixels ?? 10 },
  );
  console.log(`   [${event.id}/${aoi.id}] change ${(change.areaM2 / 1e6).toFixed(2)} km² (${change.polygons.length} polygons), masked ${(change.maskedM2 / 1e6).toFixed(2)} km²`);
  return {
    id: aoi.id,
    name: aoi.name,
    coordinates: grid.coordinates,
    size: [grid.width, grid.height],
    before: { date: before.day, platform: before.platform, cloud: Math.round(before.stats.cloud * 1000) / 10, items: before.items.map((i) => i.id) },
    after: { date: after.day, platform: after.platform, cloud: Math.round(after.stats.cloud * 1000) / 10, items: after.items.map((i) => i.id) },
    change_km2: Math.round((change.areaM2 / 1e6) * 100) / 100,
    masked_km2: Math.round((change.maskedM2 / 1e6) * 100) / 100,
    polygons: change.polygons.map((p) => ({ ...p, properties: { aoi: aoi.id } })),
  };
}

export async function buildEvent(cfg) {
  const id = cfg.id;
  console.log(`  [${id}] path…`);
  const coords = simplifyPath(await loadPath(cfg), 0.00004);
  const lengthKm = cumulative(coords).at(-1);

  // ---- Timing ----
  const anchors = cfg.anchors.map((a) => ({ ...a }));
  const times = timeVertices(coords, anchors, { tailSpeedMs: cfg.tailSpeedMs });
  const t0 = times[0];
  const t1 = times.at(-1);
  console.log(`  [${id}] ${lengthKm.toFixed(1)} km, ${coords.length} vertices, ${iso(t0)} → ${iso(t1)}`);

  // ---- Elevation profile ----
  const line = turf.lineString(coords);
  const step = Math.max(0.1, lengthKm / 180);
  const samples = [];
  for (let d = 0; d <= lengthKm + 1e-9; d += step) samples.push(turf.along(line, Math.min(d, lengthKm)).geometry.coordinates);
  const elev = await elevations(samples, 12);
  const profile = samples.map((_, i) => [Math.round(i * step * 10) / 10, Math.round(elev[i])]);

  // ---- OSM (as it stood the day before the event) ----
  const date = cfg.osmDate;
  console.log(`  [${id}] OSM corridor (as of ${date ?? 'today'})…`);
  const placesKm = cfg.placeKm ?? 1.0;
  const places = nearLine(await corridorPlaces(coords, placesKm, date), coords, placesKm)
    .map((f) => {
      const a = arrivalAt(coords, times, f.geometry.coordinates);
      return {
        ...f,
        properties: { name: f.properties.name, place: f.properties.place, arrival: iso(a.time), km_downstream: Math.round(a.along * 10) / 10, dist_m: f.properties.dist_m },
      };
    })
    .sort((a, b) => a.properties.km_downstream - b.properties.km_downstream);

  const buildingKm = cfg.buildingKm ?? 0.25;
  const buildingsNear = nearLine(await corridorBuildings(coords, buildingKm, date), coords, buildingKm);
  // Compare with OSM some time after the event (default: today). A later
  // disaster in the same valley must not be counted, so events can pin it.
  const later = date ? await corridorBuildingsAt(coords, buildingKm, cfg.osmCompareDate) : null;
  const infraKm = cfg.infraKm ?? 0.3;
  const infra = nearLine(await corridorInfrastructure(coords, infraKm, date), coords, infraKm).map((f) => {
    const a = arrivalAt(coords, times, f.geometry.coordinates);
    return { ...f, properties: { ...f.properties, arrival: iso(a.time), km_downstream: Math.round(a.along * 10) / 10 } };
  });
  console.log(`  [${id}] ${places.length} places, ${buildingsNear.length} buildings ≤${buildingKm * 1000} m, ${infra.length} infrastructure`);

  // ---- Imagery + change detection per AOI ----
  const imagery = [];
  for (const aoi of cfg.imagery ?? []) {
    try {
      imagery.push(await imageryFor(cfg, aoi, coords));
    } catch (err) {
      console.warn(`   [${id}/${aoi.id}] imagery failed: ${err.message}`);
    }
  }
  const changePolys = imagery.flatMap((i) => i.polygons);

  // ---- Building impact ----
  const inChange = new Set(insideAny(buildingsNear, changePolys).map((b) => b.properties.osm_id));
  const buildings = buildingsNear.map((b) => {
    const a = arrivalAt(coords, times, turf.centroid(b).geometry.coordinates);
    const changed = inChange.has(b.properties.osm_id);
    // Gone = its id disappeared AND nothing is mapped at its location now.
    const deleted = later
      ? !later.ids.has(b.properties.osm_id) && !later.covered(turf.centroid(b).geometry.coordinates)
      : false;
    const hit = changed || deleted;
    return {
      type: 'Feature',
      properties: {
        name: hit ? 'Building in the flow’s footprint' : 'Building near the channel',
        status: changed
          ? 'inside Sentinel-2 change area'
          : deleted
            ? `deleted from OpenStreetMap after the event${cfg.osmCompareDate ? ` (by ${cfg.osmCompareDate.slice(0, 10)})` : ''}`
            : `within ${buildingKm * 1000} m of the channel`,
        hit,
        arrival: iso(a.time),
        dist_m: b.properties.dist_m,
        fill: hit ? '#b91c1c' : '#f59e0b',
        'fill-opacity': hit ? 0.9 : 0.6,
        stroke: hit ? '#450a0a' : '#92400e',
        'stroke-width': 0.6,
      },
      geometry: b.geometry,
    };
  });

  // ---- Write layers ----
  await writeGeoJSON(`${id}-flow`, {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          name: cfg.flowName,
          length_km: Math.round(lengthKm * 10) / 10,
          start: iso(t0),
          end: iso(t1),
          coordTimes: times.map(iso),
          stroke: cfg.color ?? '#92400e',
          'stroke-width': 2,
          'stroke-opacity': 0.5,
        },
        geometry: { type: 'LineString', coordinates: coords },
      },
    ],
  });
  await writeGeoJSON(`${id}-places`, {
    type: 'FeatureCollection',
    features: places.map((f) => ({ ...f, properties: { ...f.properties, 'marker-color': '#dc2626', 'marker-size': 'small' } })),
  });
  await writeGeoJSON(`${id}-buildings`, { type: 'FeatureCollection', features: buildings }, { digits: 6 });
  await writeGeoJSON(`${id}-infra`, {
    type: 'FeatureCollection',
    features: infra.map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        'marker-color': { bridge: '#0f172a', hydropower: '#7c3aed', headworks: '#7c3aed', school: '#0369a1', health: '#be123c' }[f.properties.kind] ?? '#334155',
        'marker-symbol': { bridge: 'bridge', hydropower: 'dam', headworks: 'dam', school: 'school', health: 'hospital' }[f.properties.kind],
      },
    })),
  });
  if (changePolys.length) {
    await writeGeoJSON(`${id}-change`, {
      type: 'FeatureCollection',
      features: changePolys.map((p) => ({
        ...p,
        properties: {
          name: 'Ground stripped or buried (Sentinel-2 change)',
          area_m2: Math.round(turf.area(p)),
          aoi: p.properties.aoi,
          fill: '#f97316',
          'fill-opacity': 0.5,
          stroke: '#c2410c',
          'stroke-width': 1.1,
        },
      })),
    });
  }
  if (cfg.keyPoints?.length) {
    await writeGeoJSON(`${id}-keypoints`, {
      type: 'FeatureCollection',
      features: cfg.keyPoints.map((k) => {
        const loc = locate(coords, k.point);
        const onPath = k.onPath !== false && loc.offset < 3;
        const a = onPath ? arrivalAt(coords, times, k.point) : null;
        return {
          type: 'Feature',
          properties: {
            name: k.name,
            role: k.role,
            note: k.note ?? null,
            km: onPath ? Math.round(loc.along * 10) / 10 : null,
            arrival: a ? iso(a.time) : null,
            reported: k.reported ?? null,
            'marker-color': k.color ?? ({ origin: '#7c2d12', gauge: '#0369a1', dam: '#1d4ed8', town: '#111827' }[k.role] ?? '#111827'),
            'marker-size': k.role === 'origin' ? 'large' : 'medium',
          },
          geometry: { type: 'Point', coordinates: k.point },
        };
      }),
    });
  }

  const facts = {
    id,
    title: cfg.title,
    length_km: Math.round(lengthKm * 10) / 10,
    start_elev_m: Math.round(elev[0]),
    end_elev_m: Math.round(elev.at(-1)),
    drop_m: Math.round(elev[0] - elev.at(-1)),
    start: iso(t0),
    end: iso(t1),
    duration_min: Math.round((t1 - t0) / 60000),
    mean_speed_ms: Math.round(((lengthKm * 1000) / ((t1 - t0) / 1000)) * 10) / 10,
    anchors: anchors.map((a) => ({ label: a.label, time: a.time, km: a.alongKm ?? null })),
    places: places.map((p) => ({ name: p.properties.name, place: p.properties.place, km: p.properties.km_downstream, arrival: p.properties.arrival, dist_m: p.properties.dist_m })),
    buildings_within_m: buildingKm * 1000,
    corridor_m: cfg.corridorM ?? 500,
    buildings_near: buildings.length,
    buildings_in_change: buildings.filter((b) => b.properties.status.startsWith('inside')).length,
    buildings_deleted_since: buildings.filter((b) => b.properties.status.startsWith('deleted')).length,
    buildings_hit: buildings.filter((b) => b.properties.hit).length,
    osm_date: date ?? null,
    osm_compare_date: cfg.osmCompareDate ?? 'current',
    infrastructure: infra.map((f) => ({ kind: f.properties.kind, name: f.properties.name, km: f.properties.km_downstream, dist_m: f.properties.dist_m, capacity: f.properties.capacity ?? null })),
    imagery: imagery.map(({ polygons, ...rest }) => rest),
    change_km2: Math.round(imagery.reduce((s, i) => s + i.change_km2, 0) * 100) / 100,
    profile,
  };
  await writeDerived(`event-${id}`, facts);
  return {
    length_km: facts.length_km,
    duration_min: facts.duration_min,
    places: places.length,
    buildings_near: facts.buildings_near,
    buildings_hit: facts.buildings_hit,
    infra: infra.length,
    change_km2: facts.change_km2,
    imagery: facts.imagery.map((i) => `${i.id}: ${i.before.date} → ${i.after.date}`),
  };
}
