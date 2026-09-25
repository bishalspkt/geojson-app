// UNOSAT rapid mapping for activation FL20260826NPL (CC BY-SA 4.0, via HDX):
// the detachment zone on Langtang Lirung (Landsat 9, 26 Aug), the two barrier
// lakes (Cartosat-3, 28 Aug), the mudflow/rockflow extent from the source to
// below Devghat (26–27 Aug) and damaged cultural heritage sites. Read from
// UNOSAT's public ArcGIS map service; the extent is generalised server-side to
// ~3 m so the layer stays small.

import * as turf from '@turf/turf';
import { cachedFetch, writeDerived, writeGeoJSON } from '../lib.mjs';

const BASE = 'https://unosatgis.cern.ch/rapidmapping/rest/services/FL20260826NPL';
const ATTRIBUTION = 'UNOSAT (FL20260826NPL), CC BY-SA 4.0';

const query = (service, layer, { offset } = {}) =>
  cachedFetch(
    `${BASE}/${service}/MapServer/${layer}/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326` +
      `${offset ? `&maxAllowableOffset=${offset}` : ''}&f=geojson`,
  );

const km2 = (f) => Math.round((turf.area(f) / 1e6) * 100) / 100;
const ha = (f) => Math.round((turf.area(f) / 1e4) * 10) / 10;

export async function buildUnosat() {
  // Detachment zone: where the slab of rock and ice left the north face.
  const det = await query('UNOSAT_Analysis_V2', 7);
  const detachment = det.features.map((f) => ({
    type: 'Feature',
    properties: {
      name: 'Detachment zone (UNOSAT, Landsat 9, 26 Aug)',
      area_km2: km2(f),
      source: ATTRIBUTION,
      fill: '#7c2d12',
      'fill-opacity': 0.45,
      stroke: '#431407',
      'stroke-width': 1.6,
    },
    geometry: f.geometry,
  }));
  await writeGeoJSON('unosat-detachment', { type: 'FeatureCollection', features: detachment });

  // Barrier lakes: the northern one (at the Chhochen–Purepu confluence in
  // Tibet) is the ~2 Mm³ lake that overflowed on 28 Aug; the other sits just
  // below the source.
  const lakes = (await query('UNOSAT_Analysis_V2', 33)).features
    .map((f) => ({ f, lat: turf.centroid(f).geometry.coordinates[1] }))
    .sort((a, b) => b.lat - a.lat)
    .map(({ f }, i) => ({
      type: 'Feature',
      properties: {
        name: i === 0 ? 'Barrier lake at the Chhochen–Purepu confluence (Tibet)' : 'Barrier lake below the source',
        area_ha: ha(f),
        observed: '2026-08-28 (Cartosat-3)',
        note: i === 0 ? '≈2–2.5 Mm³ (China MWR); overflowed 28 Aug ~15:35 NPT, drained 29–30 Aug' : 'Assessed as low risk',
        source: ATTRIBUTION,
        fill: '#0369a1',
        'fill-opacity': 0.6,
        stroke: '#0c4a6e',
        'stroke-width': 1.4,
      },
      geometry: f.geometry,
    }));
  await writeGeoJSON('unosat-lakes', { type: 'FeatureCollection', features: lakes });

  // Mudflow / rockflow extent, 26–27 Aug.
  const ext = await query('UNOSAT_Analysis_V2', 41, { offset: 0.00003 });
  const extent = ext.features.map((f) => ({
    type: 'Feature',
    properties: {
      name: 'Mudflow / rockflow extent, 26–27 Aug (UNOSAT)',
      area_km2: km2(f),
      source: ATTRIBUTION,
      fill: '#9a3412',
      'fill-opacity': 0.4,
      stroke: '#7c2d12',
      'stroke-width': 0.8,
    },
    geometry: f.geometry,
  }));
  await writeGeoJSON('unosat-extent', { type: 'FeatureCollection', features: extent });

  // Cultural heritage sites with damage seen from space.
  const her = await query('UNOSAT_Analysis_V2', 8);
  const heritage = her.features.map((f) => {
    const p = f.properties;
    const destroyed = /destroyed/i.test(p.Main_Dmg ?? '');
    return {
      type: 'Feature',
      properties: {
        name: String(p.Site_Name ?? '').trim(),
        damage: p.Main_Dmg,
        confidence: p.Confidence,
        observed: p.SensorDate ? new Date(p.SensorDate).toISOString().slice(0, 10) : null,
        note: p.Notes,
        source: ATTRIBUTION,
        'marker-color': destroyed ? '#7f1d1d' : '#d97706',
        'marker-size': 'small',
      },
      geometry: f.geometry,
    };
  });
  await writeGeoJSON('heritage', { type: 'FeatureCollection', features: heritage });

  // UNOSAT's "possible triggering location" point.
  const trig = (await query('Baseline_Data_v2', 3)).features[0]?.geometry?.coordinates ?? null;

  const facts = {
    detachment_km2: detachment[0]?.properties.area_km2 ?? null,
    lakes: lakes.map((l) => ({ name: l.properties.name, area_ha: l.properties.area_ha, center: turf.centroid(l).geometry.coordinates.map((c) => Math.round(c * 1e5) / 1e5) })),
    extent_km2: Math.round(extent.reduce((a, f) => a + f.properties.area_km2, 0) * 10) / 10,
    heritage: { total: heritage.length, destroyed: heritage.filter((f) => /destroyed/i.test(f.properties.damage ?? '')).length },
    trigger_point: trig ? trig.map((c) => Math.round(c * 1e5) / 1e5) : null,
  };
  await writeDerived('unosat', facts);
  return facts;
}
