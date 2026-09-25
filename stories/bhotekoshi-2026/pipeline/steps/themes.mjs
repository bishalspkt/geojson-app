// 2026 context layers that aren't the flow path itself: the DHM gauge
// network with warning lead times, and the HOT flood extent.

import fs from 'node:fs/promises';
import path from 'node:path';
import * as turf from '@turf/turf';
import { PIPELINE_DIR, cachedFetch, readDerived, writeDerived, writeGeoJSON } from '../lib.mjs';

const readInput = async (rel) => JSON.parse(await fs.readFile(path.join(PIPELINE_DIR, 'inputs', rel), 'utf8'));

/** 2026 gauges (DHM via Acharya & Paudel 2026, CC BY 4.0) and warning lead times. */
export async function buildGauges2026() {
  const g = await readInput('acharya-paudel-2026/gauges.json');
  const event = await readDerived('event-rasuwa-2026').catch(() => null);
  const features = g.stations.map((s) => {
    const bracket = s.front_arrival_bracket_npt ?? null;
    const destroyed = /destroy|swept|lost/i.test(`${s.fate ?? ''}`) || (!!s.telemetry_ceased_npt && !s.event_peak_npt);
    return {
      type: 'Feature',
      properties: {
        name: s.name,
        station: s.station_id,
        warning_m: s.warning_m,
        danger_m: s.danger_m ?? null,
        last_reading: s.last_observation_npt ? `${s.last_level_m ?? ''} m at ${s.last_observation_npt.slice(11, 16)}` : null,
        telemetry_ceased: s.telemetry_ceased_npt ? s.telemetry_ceased_npt.slice(11, 16) : null,
        arrival_window: bracket ? `${bracket[0]}–${bracket[1]}` : null,
        peak: s.event_peak_m ? `${s.event_peak_m} m at ${s.event_peak_npt?.slice(11, 16)}` : null,
        fate: s.fate ?? (destroyed ? 'went silent' : 'survived'),
        'marker-color': destroyed ? '#7f1d1d' : '#0369a1',
        'marker-symbol': 'water',
      },
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
    };
  });
  await writeGeoJSON('rasuwa-2026-gauges', { type: 'FeatureCollection', features });

  // Warning lead time = front arrival − mass SMS (09:15 NPT, 38.8 min after t0).
  const sms = Date.parse('2026-08-26T09:15:00+05:45');
  const towns = [
    ['Rasuwagadhi', '08:44'],
    ['Timure', '08:45'],
    ['Syabrubesi', '08:55'],
    ['Betrawati', '09:25'],
    ['Trishuli / Bidur', '09:37'],
    ['Galchhi', '10:25'],
    ['Malekhu', '11:46'],
    ['Mugling', '12:55'],
    ['Devghat', '14:35'],
  ].map(([name, hhmm]) => ({ name, arrival: hhmm, lead_min: Math.round((Date.parse(`2026-08-26T${hhmm}:00+05:45`) - sms) / 60000) }));
  await writeDerived('warning-2026', { sms_npt: '09:15', t0_npt: '08:37:10', towns, path_km: event?.length_km ?? null });
  return { stations: features.length, towns };
}

/** Humanitarian OpenStreetMap Team flood extent observed 27 Aug 2026 (HDX). */
export async function buildHot2026() {
  const fc = await cachedFetch('https://production-raw-data-api.s3.amazonaws.com/ISO3/NPL/combined/hot_flood_npl_flood_extent.geojson');
  const features = fc.features
    .filter((f) => f.geometry)
    .map((f) => ({
      type: 'Feature',
      properties: {
        name: f.properties.name ?? 'Flood extent (HOT)',
        area_km2: f.properties.area_sq_km ?? null,
        fill: '#92400e',
        'fill-opacity': 0.4,
        stroke: '#78350f',
        'stroke-width': 0.8,
      },
      geometry: turf.simplify(f, { tolerance: 0.00003 }).geometry,
    }));
  await writeGeoJSON('rasuwa-2026-hot-extent', { type: 'FeatureCollection', features });

  // HOT's field survey of named bridges (reported status, so it can't drift downstream like bodies).
  const bridges = await cachedFetch('https://production-raw-data-api.s3.amazonaws.com/ISO3/NPL/combined/hot_flood_npl_bridge_damage.geojson');
  const colors = { 'Washed out': '#7f1d1d', Damaged: '#f59e0b', Intact: '#15803d' };
  await writeGeoJSON('bridges-hot', {
    type: 'FeatureCollection',
    features: bridges.features
      .filter((f) => f.geometry)
      .map((f) => ({
        type: 'Feature',
        properties: {
          name: f.properties.name,
          status: f.properties.status,
          location: f.properties.location ?? null,
          district: f.properties.adm2_name ?? null,
          'marker-color': colors[f.properties.status] ?? '#64748b',
          'marker-size': f.properties.status === 'Washed out' ? 'medium' : 'small',
        },
        geometry: f.geometry,
      })),
  });
  return {
    features: features.length,
    area_km2: features.reduce((s, f) => s + (f.properties.area_km2 ?? 0), 0),
    bridges: bridges.features.length,
  };
}
