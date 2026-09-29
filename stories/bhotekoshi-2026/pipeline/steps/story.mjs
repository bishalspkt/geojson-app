// Assemble public/stories/bhotekoshi-2026/story.json — the 26 August 2026
// Bhote Koshi–Trishuli disaster — from the derived facts, so every number in
// the text is the number in the data. Narrative facts not derived here come
// from the research dossier (research/dossier.md) and the Acharya & Paudel
// (2026) data package (inputs/acharya-paudel-2026, CC BY 4.0), cited per chapter.

import fs from 'node:fs/promises';
import path from 'node:path';
import { DATA_DIR, PIPELINE_DIR, readDerived, writeGeoJSON, writeJSON } from '../lib.mjs';

const fmt = (n) => Math.round(n).toLocaleString('en-US');
const safe = async (name) => readDerived(name).catch(() => null);
const pkg = async (file) => JSON.parse(await fs.readFile(path.join(PIPELINE_DIR, 'inputs', 'acharya-paudel-2026', file), 'utf8'));
const official = (file) => fs.readFile(path.join(PIPELINE_DIR, 'inputs', 'official-2026', file), 'utf8');

/** Minimal CSV reader (quoted fields, no embedded newlines). */
function parseCsv(text) {
  const rows = text.trim().split(/\r?\n/).map((line) => {
    const out = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"' && line[i + 1] === '"') (cur += '"'), i++;
        else if (ch === '"') q = false;
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') out.push(cur), (cur = '');
      else cur += ch;
    }
    out.push(cur);
    return out;
  });
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
const DAY = '2026-08-26';
const npt = (hhmm) => `${DAY}T${hhmm.length === 5 ? `${hhmm}:00` : hhmm}+05:45`;
const TZ = 'Asia/Kathmandu';

const CREDITS = {
  pkg: { label: 'Acharya & Paudel (2026), Bhote Koshi–Trishuli flash flood data package (DHM gauges, timeline, casualties), CC BY 4.0', url: 'https://doi.org/10.31223/X5HN5H' },
  usgs: { label: 'USGS event us7000tbwb (Ms 5.2 landslide signal)', url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us7000tbwb' },
  ems: { label: 'Copernicus Emergency Management Service, EMSR927 damage grading — © European Union', url: 'https://mapping.emergency.copernicus.eu/activations/EMSR927/' },
  hot: { label: 'Humanitarian OpenStreetMap Team — flood extent, bridge damage and exposed hydropower (HDX, ODbL)', url: 'https://data.humdata.org/dataset/hot_flood_npl' },
  vantor: { label: 'Vantor (formerly Maxar) Open Data Program — Nepal-Flooding-Aug-2026, CC BY-NC 4.0', url: 'https://vantor-opendata.s3.amazonaws.com/events/Nepal-Flooding-Aug-2026/collection.json' },
  planet: { label: 'Planet Crisis Response — Bhote Koshi–Trishuli Outburst Flood (Source Cooperative), CC BY-NC 4.0', url: 'https://source.coop/planet/disasterdata/nepal-flash-flood-2026-08-26' },
  s2: { label: 'Copernicus Sentinel-2 L2A via Element 84 Earth Search — contains modified Copernicus Sentinel data', url: 'https://earth-search.aws.element84.com/v1' },
  osm: { label: 'OpenStreetMap contributors (ODbL) — settlements, buildings, bridges as of 25 Aug 2026', url: 'https://www.openstreetmap.org/copyright' },
  kontur: { label: 'Kontur Population (2023), CC BY 4.0', url: 'https://data.humdata.org/dataset/kontur-population-nepal' },
  ndrrma: { label: 'NDRRMA Situation Report #01 (1 Sep 2026)', url: 'https://ndrrma.gov.np/mediafiles/rasuwa/Rasuwa_Flood_SitRep_Temp_ENG_01_01092026.pdf' },
  icimod: { label: 'ICIMOD — Kyirong–Rasuwa flood 2026', url: 'https://www.icimod.org/kyirong-rasuwa-flood-2026-nepal-china-border/' },
  kp: { label: 'Kathmandu Post, 28 Aug 2026 — what triggered the Rasuwa flood', url: 'https://kathmandupost.com/national/2026/08/28/what-triggered-the-rasuwa-flood-scientists-piece-together-a-complex-chain-of-events' },
  nepalnews: { label: 'Nepalnews, 23 Sep 2026 — buried under debris, erased from the record', url: 'https://english.nepalnews.com/s/feature/buried-under-debris-erased-from-the-record/' },
  ndrrma22: { label: 'NDRRMA figures to 22 Sep 19:00 (via Pardafas, 23 Sep)', url: 'https://www.pardafas.com/2026/09/23/189125/' },
  sitrep20: { label: 'NDRRMA Situation Report #20 (21 Sep 2026)', url: 'https://ndrrma.gov.np/mediafiles/rasuwa/SitRep_ENG_20_21092026.pdf' },
  police: { label: 'Nepal Police register, 23 Sep 05:00 (via Nepalnews)', url: 'https://english.nepalnews.com/s/nation/bhote-koshi-flood-death-toll-rises-to-1452-over-4700-still-missing/' },
  rdna: { label: 'Government of Nepal (NDRRMA, NPC) — Rapid Damage and Needs Assessment, Rasuwa–Bhotekoshi Flood 2026 (published 17 Sep)', url: 'https://ndrrma.gov.np/mediafiles/rasuwa/Rapid_Damage_and_Needs_Assessment_RDNA_Rasuwa-Bhotekoshi_Flood_2026.pdf' },
  kpHydro: { label: 'Kathmandu Post, 23 Sep 2026 — over 800 missing from hydropower projects (Energy Minister)', url: 'https://kathmandupost.com/national/2026/09/23/over-800-people-remain-missing-from-hydropower-projects-after-bhotekoshi-floods-says-energy-minister-shrestha' },
  unosat: { label: 'UNOSAT rapid mapping FL20260826NPL — detachment zone, barrier lakes, flow extent, heritage damage (CC BY-SA 4.0)', url: 'https://data.humdata.org/dataset/mudflow-rockflow-impact-assessment-in-rasuwa-nuwakot-districts-bagmati-province-nepal-as-o' },
  seismic: { label: 'Huang, Wang & Chen (2026), seismic analysis of the Langtang Lirung avalanche (Zenodo 22884627)', url: 'https://zenodo.org/records/22884627' },
  usgs2: { label: 'USGS event us7000tc90 (second failure, relocated 21 Sep)', url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us7000tc90' },
  drone: { label: 'NEA Engineering Company drone orthophotos on OpenAerialMap, CC BY 4.0', url: 'https://map.openaerialmap.org/' },
  hotMosaic: { label: 'HOT post-event mosaic of Vantor scenes, 27 Aug–8 Sep (HDX), CC BY-NC 4.0', url: 'https://data.humdata.org/dataset/hot_flood_npl_buildings_damage' },
  commons: { label: 'Wikimedia Commons contributors (CC BY / CC BY-SA / public domain, per item)', url: 'https://commons.wikimedia.org/wiki/Category:2026_Nepal_floods' },
  kartaview: { label: 'KartaView street-level imagery, CC BY-SA 4.0', url: 'https://kartaview.org/' },
  umbra: { label: 'Umbra Open Data radar images via Wikimedia Commons, CC BY 4.0', url: 'https://umbra.space/open-data/' },
  dossier: { label: 'Research dossier (all sources, conflicting figures side by side)', url: 'https://github.com/bishalspkt/geojson-app/tree/main/stories/bhotekoshi-2026/research' },
};

/** Places named in reports that aren't towns on the channel. */
async function writeReportPlaces() {
  const pts = [
    ['USGS epicentre (Ms 5.2 “landslide”)', 'source', [85.515, 28.271], 'us7000tbwb, 08:37:10 NPT'],
    ['Source estimate from Planet imagery', 'source', [85.5194, 28.2765], 'research dossier'],
    ['Glaciological source estimate', 'source', [85.5252, 28.2853], 'research dossier'],
    ['GFZ source estimate (Mw 5.7)', 'source', [85.5, 28.3], 'research dossier'],
    ['UNOSAT possible triggering location', 'source', [85.52168, 28.28958], 'Inside the 1.96 km² detachment zone (UNOSAT)'],
    ['Main barrier lake (≈2 Mm³, 11.9 ha)', 'lake', [85.482, 28.3327], 'Overflowed 28 Aug ~15:35 NPT; drained 29–30 Aug (UNOSAT area, 28 Aug)'],
    ['Barrier lake below the source (19.5 ha)', 'lake', [85.5108, 28.2928], 'Assessed as low risk (UNOSAT area, 28 Aug)'],
    ['Second failure, 11:45:35 (USGS, relocated)', 'source', [85.4798, 28.3281], 'us7000tc90, M4.2; relocated beside the lower lake on 21 Sep — interpretation uncertain'],
    ['Tiru, Uttargaya-1', 'report', [85.2096, 28.0907], 'More than 500 unaccounted for; first reached by helicopter 9 Sep'],
    ['Haku Besi', 'report', [85.2791, 28.1165], 'km 44.5'],
    ['Krishnabhir, Prithvi Highway', 'report', [84.7499, 27.8029], '70 m of highway lost to river erosion; closed 30 Aug–17 Sep'],
  ];
  const colors = { source: '#7c2d12', lake: '#0369a1', report: '#6d28d9' };
  await writeGeoJSON('report-places', {
    type: 'FeatureCollection',
    features: pts.map(([name, kind, coords, note]) => ({
      type: 'Feature',
      properties: { name, kind, note, 'marker-color': colors[kind], 'marker-size': kind === 'report' ? 'small' : 'medium' },
      geometry: { type: 'Point', coordinates: coords },
    })),
  });
}

/** Stage rise above the 06:00–08:00 level, 06:00–18:00, per gauge (m). */
async function hydrographs() {
  const g = await pkg('gauge_timeseries.json');
  const order = [
    ['Rasuwagadhi', '#7f1d1d'],
    ['Syabrubesi', '#b91c1c'],
    ['Betrawati', '#ea580c'],
    ['Galchhi', '#0369a1'],
    ['Kali Khola', '#0f766e'],
    ['Devghat', '#4338ca'],
  ];
  const hours = (hhmm) => Number(hhmm.slice(0, 2)) + Number(hhmm.slice(3, 5)) / 60;
  return order.map(([name, color]) => {
    const ser = g.stations[name].series_26aug.map(([t, v]) => [hours(t), v]);
    const base = ser.filter(([h]) => h >= 6 && h <= 8).map(([, v]) => v);
    const b = base.reduce((a, v) => a + v, 0) / Math.max(1, base.length);
    return { label: name, color, points: ser.filter(([h]) => h >= 6 && h <= 18).map(([h, v]) => [Math.round(h * 100) / 100, Math.round((v - b) * 100) / 100]) };
  });
}

/** Reported Nepal toll over time (NDRRMA / police series the package adopts). */
async function tollSeries() {
  // NDRRMA bulletins and sitreps (the police register is a separate count).
  const rows = parseCsv(await official('casualty_timeseries_nepal.csv'))
    .filter((r) => !/police/i.test(r.source))
    .map((r) => ({ t: Date.parse(`${r.as_of_npt}+05:45`), dead: Number(r.dead_or_remains), missing: r.missing ? Number(r.missing) : NaN }))
    .filter((r) => Number.isFinite(r.dead));
  rows.sort((a, b) => a.t - b.t);
  const t0 = Date.parse('2026-08-26T08:37:10+05:45');
  const days = (t) => Math.round(((t - t0) / 86_400_000) * 100) / 100;
  return {
    dead: rows.map((r) => [days(r.t), r.dead]),
    missing: rows.filter((r) => Number.isFinite(r.missing)).map((r) => [days(r.t), r.missing]),
  };
}

/** Along-track helpers on the built flow line (coords + per-vertex epoch-ms times). */
function flowTrack(flow) {
  const f = flow.features[0];
  const coords = f.geometry.coordinates;
  const times = f.properties.coordTimes.map((t) => (typeof t === 'number' ? t : Date.parse(t)));
  const cum = [0];
  const dist = (a, b) => {
    const k = Math.cos(((a[1] + b[1]) / 2) * (Math.PI / 180));
    return Math.hypot((b[0] - a[0]) * k, b[1] - a[1]) * 111_320;
  };
  for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + dist(coords[i - 1], coords[i]));
  const at = (s) => {
    s = Math.max(0, Math.min(cum.at(-1), s));
    let i = cum.findIndex((c) => c >= s);
    if (i <= 0) return coords[0];
    const f2 = (s - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]);
    return [coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * f2, coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * f2];
  };
  const sAt = (t) => {
    if (t <= times[0]) return 0;
    if (t >= times.at(-1)) return cum.at(-1);
    const i = times.findIndex((x) => x >= t);
    const f2 = (t - times[i - 1]) / Math.max(1, times[i] - times[i - 1]);
    return cum[i - 1] + (cum[i] - cum[i - 1]) * f2;
  };
  const bearing = (a, b) => {
    const φ1 = (a[1] * Math.PI) / 180;
    const φ2 = (b[1] * Math.PI) / 180;
    const Δλ = ((b[0] - a[0]) * Math.PI) / 180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
  };
  /**
   * The chase camera's own opening pose at time `iso`, so the chapter flight
   * lands where the rig starts and playback begins without a lurch. Mirrors the
   * rig's look-ahead (camera distance ≈ 13 km at zoom 12.7 on a 900 px view).
   */
  const chasePose = (iso, zoom, pitch) => {
    const D = 13_000 * 2 ** (12.7 - zoom);
    const s = sAt(Date.parse(iso));
    const reach = Math.min(12_000, Math.max(1_500, 0.5 * D));
    const center = at(s + 0.08 * D);
    const b = bearing(at(s - 0.3 * reach), at(s + reach));
    return { center: center.map((c) => Math.round(c * 1e5) / 1e5), zoom, pitch, bearing: b > 180 ? b - 360 : b, duration: 4500 };
  };
  return { chasePose };
}

export async function buildStory() {
  const r26 = await readDerived('event-rasuwa-2026');
  const ems = await safe('ems-EMSR927');
  const warn = await safe('warning-2026');
  const towns = (await readDerived('town-imagery')).towns;
  const hydro = await safe('hydropower');
  const pop = await safe('population');
  const un = await safe('unosat');
  const media = await safe('media');
  const rdna = JSON.parse(await official('rdna_summary.json'));
  const deposition = parseCsv(await official('rdna_modelled_deposition_by_reach.csv'));
  const sectors = parseCsv(await official('rdna_sector_effects.csv'));
  const localLevels = parseCsv(await official('rdna_private_buildings_by_local_level.csv'));
  const bodiesBy = parseCsv(await official('bodies_by_recovery_district_timeseries.csv')).filter((r) => !/police/i.test(r.source)).at(-1);
  const event = await pkg('event.json');
  const recurrence = await pkg('recurrence.json');
  const damage = await pkg('damage_independent.json');
  await writeReportPlaces();
  const track = flowTrack(JSON.parse(await fs.readFile(path.join(DATA_DIR, 'rasuwa-2026-flow.geojson'), 'utf8')));

  const emsTotals = ems?.totals ?? {};
  const emsBy = Object.fromEntries((ems?.aois ?? []).map((a) => [a.aoi, a]));
  const aoiById = Object.fromEntries(r26.imagery.map((i) => [i.id, i]));
  const townById = Object.fromEntries(towns.map((t) => [t.id, t]));
  const closure = recurrence.closure_and_reopening;
  // HOT's bridge survey as currently published (the package froze an earlier version).
  const hotBridges = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'bridges-hot.geojson'), 'utf8')).features;
  const bridgeCount = (district, status) => hotBridges.filter((f) => (!district || f.properties.district === district) && (!status || f.properties.status === status)).length;
  const bridges = {
    total_bridges: hotBridges.length,
    totals: { washed_out: bridgeCount(null, 'Washed out'), damaged: bridgeCount(null, 'Damaged') },
    by_district: Object.fromEntries(['Rasuwa', 'Nuwakot', 'Dhading', 'Gorkha'].map((d) => [d, { total: bridgeCount(d), washed_out: bridgeCount(d, 'Washed out') }])),
  };
  void damage;
  const devghat = event.hydrology_devghat;
  const alert = event.alert;

  // ---------------------------------------------------------------- Layers
  const layers = [
    { id: 'rivers', type: 'geojson', name: 'Major rivers', url: 'data/rivers-major.geojson', temporal: false, display: { labelField: 'name', labelMinZoom: 8 }, attribution: '© OpenStreetMap contributors' },
    { id: 'population', type: 'geojson', name: `People within 2 km of the path (${fmt(pop?.within_2km ?? 0)}, Kontur H3 cells)`, url: 'data/population-2km.geojson', temporal: false,
      display: { tooltipFields: ['population'] }, attribution: 'Kontur Population (2023), CC BY 4.0',
      legend: { kind: 'swatches', title: 'People per ~0.7 km² cell', items: [
        { label: '5–50', color: '#fee8c8', shape: 'fill' }, { label: '50–200', color: '#fdbb84', shape: 'fill' }, { label: '200–500', color: '#fc8d59', shape: 'fill' },
        { label: '500–1,500', color: '#e34a33', shape: 'fill' }, { label: '1,500+', color: '#b30000', shape: 'fill' },
      ] } },
    { id: 'change', type: 'geojson', name: 'Ground stripped or buried (Sentinel-2 change)', url: 'data/rasuwa-2026-change.geojson', temporal: false,
      display: { tooltipFields: ['area_m2'] }, attribution: 'Derived from Copernicus Sentinel-2',
      legend: { kind: 'swatches', items: [{ label: 'Vegetation or channel lost to debris (NDVI/NDWI change)', color: '#f97316', shape: 'fill' }] } },
    { id: 'hot-extent', type: 'geojson', name: 'Flood extent mapped 27 Aug (HOT)', url: 'data/rasuwa-2026-hot-extent.geojson', temporal: false,
      display: { tooltipFields: ['area_km2'] }, attribution: 'Humanitarian OpenStreetMap Team (HDX)',
      legend: { kind: 'swatches', items: [{ label: 'Flood extent observed 27 Aug', color: '#92400e', shape: 'fill' }] } },
    { id: 'ems-extent', type: 'geojson', name: 'Observed flood/debris extent (Copernicus EMS)', url: 'data/rasuwa-2026-ems-extent.geojson', temporal: false,
      display: { tooltipFields: ['type', 'area_ha'] }, attribution: '© European Union, Copernicus EMS (EMSR927)',
      legend: { kind: 'swatches', items: [{ label: 'Observed debris-flow / flood extent', color: '#78350f', shape: 'fill' }] } },
    { id: 'buildings', type: 'geojson', name: `Buildings within ${r26.buildings_within_m} m of the channel (OSM, 25 Aug)`, url: 'data/rasuwa-2026-buildings.geojson', temporal: false,
      display: { tooltipFields: ['status', 'dist_m', 'arrival'] }, attribution: '© OpenStreetMap contributors (as of the day before the event)',
      legend: { kind: 'swatches', items: [
        { label: 'In the flow’s footprint or gone from the map', color: '#b91c1c', shape: 'fill' },
        { label: `Within ${r26.buildings_within_m} m of the channel`, color: '#f59e0b', shape: 'fill' },
      ] } },
    { id: 'ems-buildings', type: 'geojson', name: 'Building damage grading (Copernicus EMS)', url: 'data/rasuwa-2026-ems-buildings.geojson', temporal: false,
      display: { heatmap: { radius: 10, weightField: 'damage_weight', maxWeight: 1, handoverZoom: 14.6, intensity: 0.5 }, tooltipFields: ['damage', 'area'] },
      attribution: '© European Union, Copernicus EMS (EMSR927)',
      legend: { kind: 'swatches', items: [{ label: 'Destroyed', color: '#7f1d1d' }, { label: 'Damaged', color: '#dc2626' }, { label: 'Possibly damaged', color: '#f59e0b' }] } },
    { id: 'ems-transport', type: 'geojson', name: 'Destroyed roads and bridges (Copernicus EMS)', url: 'data/rasuwa-2026-ems-transport.geojson', temporal: false,
      display: { tooltipFields: ['type', 'damage'] }, attribution: '© European Union, Copernicus EMS (EMSR927)' },
    { id: 'bridges', type: 'geojson', name: `Bridge survey: ${bridges.totals.washed_out} of ${bridges.total_bridges} washed out (HOT)`, url: 'data/bridges-hot.geojson', temporal: false,
      display: { labelField: 'name', labelMinZoom: 12.5, tooltipFields: ['status', 'location', 'district'] }, attribution: 'Humanitarian OpenStreetMap Team (HDX, ODbL)',
      legend: { kind: 'swatches', items: [{ label: 'Washed out', color: '#7f1d1d' }, { label: 'Damaged', color: '#f59e0b' }, { label: 'Intact', color: '#15803d' }] } },
    { id: 'infra', type: 'geojson', name: 'Schools, health posts and bridges near the channel (OSM)', url: 'data/rasuwa-2026-infra.geojson', temporal: false,
      display: { tooltipFields: ['kind', 'km_downstream', 'dist_m'] }, attribution: '© OpenStreetMap contributors' },
    { id: 'hydropower', type: 'geojson', name: `Hydropower: ${fmt(hydro?.missingTotal ?? 804)} workers missing (23 Sep)`, url: 'data/hydropower.geojson', temporal: false,
      display: { labelField: 'label', labelMinZoom: 10, tooltipFields: ['part', 'capacity_mw', 'status', 'damage', 'missing_workers', 'bodies_recovered', 'note', 'distance_to_flow_m'] },
      attribution: 'NEA, NDRRMA and press reports; locations © OpenStreetMap contributors and HOT (ODbL)',
      legend: { kind: 'swatches', items: [{ label: 'Damaged hydropower (label: workers missing)', color: '#b91c1c' }, { label: 'Damaged NEA solar plant', color: '#b45309' }, { label: 'No damage report found', color: '#64748b' }] } },
    { id: 'gauges', type: 'geojson', name: 'DHM river gauges on the corridor', url: 'data/rasuwa-2026-gauges.geojson', temporal: false,
      display: { labelField: 'name', labelMinZoom: 9, tooltipFields: ['last_reading', 'telemetry_ceased', 'arrival_window', 'peak', 'fate', 'warning_m'] },
      attribution: 'DHM via Acharya & Paudel (2026), CC BY 4.0',
      legend: { kind: 'swatches', items: [{ label: 'Gauge survived', color: '#0369a1' }, { label: 'Gauge went silent / destroyed', color: '#7f1d1d' }] } },
    { id: 'report-places', type: 'geojson', name: 'Source estimates, barrier lakes and reported places', url: 'data/report-places.geojson', temporal: false,
      display: { labelField: 'name', labelMinZoom: 10.5, tooltipFields: ['note'] },
      attribution: 'USGS, GFZ, UNOSAT and news reports (research dossier)' },
    { id: 'flow', type: 'geojson', name: 'Debris-flow front, 26 Aug 2026 (times from DHM gauges)', url: 'data/rasuwa-2026-flow.geojson',
      temporal: { coordTimesField: 'coordTimes', trackColor: '#c2410c' }, display: { tooltipFields: ['length_km', 'start', 'end'] },
      legend: { kind: 'gradient', title: 'Flow front', stops: [{ color: '#fed7aa', label: 'earlier' }, { color: '#c2410c' }, { color: '#fff7ed', label: 'front' }] },
      attribution: 'Centreline and timing: Acharya & Paudel (2026), CC BY 4.0, from DHM gauge reports' },
    { id: 'places', type: 'geojson', name: 'Settlements along the path (flash when the front arrives)', url: 'data/rasuwa-2026-places.geojson',
      temporal: { startField: 'arrival' }, display: { labelField: 'name', labelMinZoom: 10.5, tooltipFields: ['arrival', 'km_downstream', 'dist_m', 'place'] },
      attribution: '© OpenStreetMap contributors' },
    { id: 'keypoints', type: 'geojson', name: 'Key places and gauges (research dossier)', url: 'data/rasuwa-2026-keypoints.geojson', temporal: false,
      display: { labelField: 'name', labelMinZoom: 7.5, tooltipFields: ['reported', 'arrival', 'km', 'note'] },
      attribution: 'Acharya & Paudel (2026), CC BY 4.0; USGS, DHM and news reports (research dossier)' },
    { id: 'unosat-detachment', type: 'geojson', name: `Detachment zone, ${un?.detachment_km2 ?? 1.96} km² (UNOSAT, Landsat 9, 26 Aug)`, url: 'data/unosat-detachment.geojson', temporal: false,
      display: { tooltipFields: ['area_km2'] }, attribution: 'UNOSAT, CC BY-SA 4.0',
      legend: { kind: 'swatches', items: [{ label: 'Detachment zone', color: '#7c2d12', shape: 'fill' }] } },
    { id: 'unosat-lakes', type: 'geojson', name: 'Barrier lakes, 28 Aug (UNOSAT, Cartosat-3)', url: 'data/unosat-lakes.geojson', temporal: false,
      display: { labelField: 'name', labelMinZoom: 12, tooltipFields: ['area_ha', 'observed', 'note'] }, attribution: 'UNOSAT, CC BY-SA 4.0',
      legend: { kind: 'swatches', items: [{ label: 'Barrier lake, 28 Aug', color: '#0369a1', shape: 'fill' }] } },
    { id: 'unosat-extent', type: 'geojson', name: `Mudflow / rockflow extent, ${un?.extent_km2 ?? 65} km² (UNOSAT, 26–27 Aug)`, url: 'data/unosat-extent.geojson', temporal: false,
      display: { tooltipFields: ['area_km2'] }, attribution: 'UNOSAT, CC BY-SA 4.0',
      legend: { kind: 'swatches', items: [{ label: 'Mudflow / rockflow extent (UNOSAT)', color: '#9a3412', shape: 'fill' }] } },
    { id: 'heritage', type: 'geojson', name: 'Cultural heritage damaged or destroyed (UNOSAT)', url: 'data/heritage.geojson', temporal: false,
      display: { labelField: 'name', labelMinZoom: 13, tooltipFields: ['damage', 'confidence', 'observed', 'note'] }, attribution: 'UNOSAT, CC BY-SA 4.0',
      legend: { kind: 'swatches', items: [{ label: 'Heritage site destroyed', color: '#7f1d1d' }, { label: 'Heritage site damaged', color: '#d97706' }] } },
    { id: 'media', type: 'geojson', name: `Photos and videos from the ground (${fmt(media?.total ?? 0)}, open licences)`, url: 'data/media.geojson', temporal: false,
      display: { tooltipFields: ['kind', 'period', 'captured', 'source', 'credit', 'license'] },
      attribution: 'Wikimedia Commons, KartaView, Flickr contributors (licence per item); YouTube links',
      legend: { kind: 'swatches', items: [
        { label: 'Photo before the flood', color: '#0f766e' }, { label: 'Street-level frame (KartaView)', color: '#475569' },
        { label: 'On the day', color: '#b91c1c' }, { label: 'After (radar, photos, video links)', color: '#c2410c' },
      ] } },
  ];

  // Sentinel-2 before/after per stretch of the path (10 m).
  for (const img of r26.imagery) {
    for (const when of ['before', 'after']) {
      layers.push({
        id: `s2-${img.id}-${when}`,
        type: 'imagery',
        name: `Sentinel-2 · ${img[when].date} (${img.name})`,
        source: { type: 'image', url: `img/rasuwa-2026-${img.id}-${when}.webp`, coordinates: img.coordinates },
        attribution: `Contains modified Copernicus Sentinel data ${img[when].date.slice(0, 4)}`,
        description: `${when === 'before' ? 'Before' : 'After'}: ${img[when].platform} ${img[when].date}, ${img[when].cloud}% cloud over the area`,
      });
    }
  }
  // Sub-metre scenes of each town, streamed at full resolution from the providers' buckets.
  const vhrId = (town, when, i) => `vhr-${town}-${when}-${i}`;
  const sceneLabel = (s) => `${s.dateLabel ?? s.date} · ${s.sensor}${s.gsd ? ` ${s.gsd < 0.1 ? `${+(s.gsd * 100).toFixed(1)} cm` : `${s.gsd} m`}` : ''}`;
  for (const town of towns) {
    for (const when of ['before', 'after']) {
      // Later scenes first, so an earlier one draws on top when two are shown
      // together (a drone strip over its backdrop).
      [...town[when].entries()].reverse().forEach(([i, s]) => {
        layers.push({
          id: vhrId(town.id, when, i),
          type: 'imagery',
          name: `${s.sensor} · ${s.dateLabel ?? s.date} (${town.name})`,
          source: { type: 'cog', url: s.url, bounds: town.bounds, maxzoom: 20 },
          attribution: s.attribution,
          description: `${when === 'before' ? 'Before' : 'After'}: ${s.sensor}, ${s.datetime.slice(0, 16).replace('T', ' ')} UTC${s.gsd ? `, ${s.gsd} m pixels` : ''}${s.offNadir != null ? `, ${Math.round(s.offNadir)}° off-nadir` : ''}. ${s.licence}.`,
        });
      });
    }
  }

  /** Swipe for a town: VHR where both sides exist, else Sentinel-2 for the missing side. */
  const isDrone = (s) => /drone/i.test(s.sensor);
  const townCompare = (townId, s2Aoi, { afterS2First = false } = {}) => {
    const t = townById[townId];
    const opts = (when) =>
      t[when].map((s, i) => {
        const option = { layers: vhrId(t.id, when, i), label: `${when === 'before' ? 'Before' : 'After'} · ${sceneLabel(s)}` };
        // A drone survey covers a strip: lay it over the side's first full scene.
        const j = isDrone(s) ? t[when].findIndex((x) => !isDrone(x)) : -1;
        if (j < 0) return option;
        const back = t[when][j];
        return { layers: [option.layers, vhrId(t.id, when, j)], label: `${option.label} on ${back.sensor} ${back.dateLabel ?? back.date}` };
      });
    const s2 = (when) => ({ layers: `s2-${s2Aoi}-${when}`, label: `${when === 'before' ? 'Before' : 'After'} · ${aoiById[s2Aoi][when].date} · Sentinel-2 10 m` });
    const left = t.before.length ? opts('before') : [];
    const right = t.after.length ? opts('after') : [];
    if (s2Aoi && aoiById[s2Aoi]) {
      left.push(s2('before'));
      if (afterS2First) right.unshift(s2('after'));
      else right.push(s2('after'));
    }
    return {
      left: left[0].layers,
      right: right[0].layers,
      leftLabel: left[0].label,
      rightLabel: right[0].label,
      leftOptions: left,
      rightOptions: right,
    };
  };

  // ---------------------------------------------------------------- Time captions
  const cap = (hhmm, text) => ({ time: npt(hhmm), text });

  const lead = (name) => warn?.towns.find((t) => t.name === name)?.lead_min;
  const upperShare = Math.round(
    (100 * r26.imagery.filter((i) => ['source', 'upper', 'middle', 'bidur'].includes(i.id)).reduce((a, i) => a + i.change_km2, 0)) /
      Math.max(0.01, r26.change_km2),
  );
  const hotFc = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'rasuwa-2026-hot-extent.geojson'), 'utf8'));
  const hotKm2 = Math.round(hotFc.features.reduce((a, f) => a + (f.properties.area_km2 ?? 0), 0) * 10) / 10;
  const hydroTop = (hydro?.projects ?? []).filter((p) => p.mw).sort((a, b) => b.mw - a.mw).slice(0, 9);
  const usd = (m) => (m >= 1000 ? `US$${(m / 1000).toFixed(2)} bn` : `US$${Math.round(m)} M`);
  const toll = await tollSeries();
  const series = await hydrographs();
  const hTicks = [6, 8, 10, 12, 14, 16, 18].map((h) => ({ x: h, label: `${String(h).padStart(2, '0')}:00` }));

  // ---------------------------------------------------------------- Chapters
  const chapters = [];

  chapters.push({
    id: 'title',
    kicker: '26 August 2026 · Rasuwa → Chitwan',
    title: 'The Bhote Koshi–Trishuli disaster',
    body:
      `At **08:37:10** a slab of rock and glacier ice broke from the north face of **Langtang Lirung**. In the next six hours the debris flow it became ran **${fmt(r26.length_km)} km** down the Bhote Koshi, Trishuli and Narayani, past the Nepal–China border, a dry port, a trekking town, a cascade of hydropower plants and a string of river towns.\n\n` +
      `It was Nepal's deadliest disaster since the 2015 earthquake. As of 22 September the NDRRMA counts **1,451 bodies or remains recovered and 5,705 people missing**; China reported 43 dead and 519 missing. The government puts damage and losses at **${usd(rdna.total_effects.usd_m)}**. All figures are still provisional.\n\n` +
      `This story follows the front minute by minute, then goes town by town with the sharpest before-and-after imagery that is openly available. Every layer is open data; the sources are listed in each chapter.\n\n` +
      `**Please note:** this is an independent analysis built from open data, not an official source. All figures are provisional and may change. Not for emergency response or navigation.`,
    camera: { center: [85.0, 28.0], zoom: 8.6, pitch: 50, bearing: -20, duration: 3500 },
    layers: ['rivers', 'flow', 'keypoints'],
    terrain: true,
    exaggeration: 1.5,
    stats: [
      { label: 'bodies or remains recovered (NDRRMA, 22 Sep)', value: '1,451' },
      { label: 'missing (NDRRMA, 22 Sep)', value: '5,705' },
      { label: `from the source to Devghat`, value: `${fmt(r26.length_km)} km` },
      { label: 'damage and losses (government RDNA)', value: usd(rdna.total_effects.usd_m) },
    ],
    sources: [CREDITS.ndrrma22, CREDITS.rdna, CREDITS.pkg, CREDITS.dossier],
  });

  chapters.push({
    id: 'corridor',
    kicker: 'Before the flood',
    title: 'A corridor of trade, power and towns',
    body:
      `The Bhote Koshi valley carries Nepal's main road to China. The **Rasuwagadhi–Kerung crossing** had only just reopened: the July 2025 glacial-lake flood from Tibet had closed it for **${closure.border_closed_days} days**, and it reopened on ${closure.reopened} on a ${closure.reopening_structure.replace(/, built.*$/, '')}. It had been open ${closure.operational_days_to_2026_08_26} days when this flood came, ${closure.interval_between_events_days} days after the last one.\n\n` +
      `The river is also one of Nepal's densest hydropower corridors. The government counts **${rdna.energy.hydro_projects} projects totalling ${fmt(rdna.energy.hydro_capacity_mw)} MW** hit by this flood — ${rdna.energy.operating[0]} operating (${fmt(rdna.energy.operating[1])} MW) and ${rdna.energy.under_construction[0]} under construction (${fmt(rdna.energy.under_construction[1])} MW) — with thousands of workers in tunnels and camps.\n\n` +
      `About **${fmt(r26.population?.within_500m ?? 70030)} people** live within 500 m of the path and **${fmt(pop?.within_2km ?? 0)}** within 2 km (Kontur, ~0.7 km² cells, so an order of magnitude). OpenStreetMap held **${fmt(r26.buildings_near)} buildings** within ${r26.buildings_within_m} m of the channel on 25 August.`,
    camera: { center: [85.22, 28.02], zoom: 9.9, pitch: 45, bearing: -25, duration: 3500 },
    layers: ['rivers', 'flow', 'population', 'hydropower', 'keypoints'],
    terrain: true,
    exaggeration: 1.5,
    chart: {
      kind: 'bars',
      title: 'Hydropower on the corridor',
      unit: 'MW',
      data: hydroTop.map((p) => ({ label: p.name, value: p.mw, color: p.damage !== 'no damage report found' ? '#b91c1c' : '#64748b' })),
      note: 'Red: reported damaged (NEA, NDRRMA, press). Grey: no damage report found (not the same as undamaged).',
    },
    sources: [CREDITS.rdna, CREDITS.hot, CREDITS.kontur, CREDITS.pkg],
  });

  const source = townById.source;
  chapters.push({
    id: 'source',
    kicker: '08:37:10 · Langtang Lirung north face',
    title: 'The mountain fails',
    body:
      `Seismometers caught it. USGS catalogued a **magnitude 5.2 “landslide” signal** (us7000tbwb) at 08:37:10 — a hand-placed origin; EMSC and later phase picks put it at **08:37:44** — and GFZ an Mw 5.7 event with a landslide signature, while Nepal's Department of Mines and Geology first logged an M4.4 earthquake. Chinese seismologists found smaller signals at 06:04, 06:50 and 08:15–08:19: the slope was already moving, and radar had shown up to 30 cm of creep in the weeks before.\n\n` +
      `UNOSAT mapped the **detachment zone — ${un?.detachment_km2 ?? 1.96} km²** — on Landsat 9 that same day; the scar drops about 1,100–1,200 m. Seismic estimates of the volume range from about 10 million to 500 million m³; no before-and-after elevation model has measured it yet. There was **no significant rain** (8.8 mm in the previous three days), so rainfall-based warnings never triggered. A **second failure** followed at 11:45:35 (M4.2); USGS has since relocated it to beside the lower barrier lake.\n\n` +
      `The swipe compares Sentinel-2 in November 2025 with 16 September: the grey scar of the flow runs from the mountain down to the valley floor. Switch the right side to the ${source.after[0]?.sensor} scene of ${source.after[0]?.date} for a sub-metre view; no sub-metre image of the source exists from before the event.`,
    camera: { center: [85.49, 28.30], zoom: 11.6, pitch: 55, bearing: 160, duration: 5000 },
    layers: ['report-places', 'change', 'unosat-detachment'],
    terrain: true,
    exaggeration: 1.5,
    compare: {
      left: 's2-source-before',
      right: 's2-source-after',
      leftLabel: `Before · ${aoiById.source.before.date} · Sentinel-2`,
      rightLabel: `After · ${aoiById.source.after.date} · Sentinel-2`,
      rightOptions: [
        { layers: 's2-source-after', label: `After · ${aoiById.source.after.date} · Sentinel-2 10 m` },
        ...source.after.map((s, i) => ({ layers: vhrId('source', 'after', i), label: `After · ${sceneLabel(s)}` })),
      ],
    },
    stats: [
      { label: 'seismic magnitude (USGS, landslide signal)', value: 'Ms 5.2' },
      { label: 'detachment zone (UNOSAT)', value: `${un?.detachment_km2 ?? 1.96} km²` },
      { label: 'rain in the previous three days', value: '8.8 mm' },
      { label: 'second failure', value: '11:45:35' },
    ],
    sources: [CREDITS.usgs, CREDITS.seismic, CREDITS.unosat, CREDITS.usgs2, CREDITS.kp, CREDITS.icimod, CREDITS.s2, CREDITS.dossier],
  });

  chapters.push({
    id: 'first-minutes',
    kicker: '08:37 → 09:05 · riding the front',
    title: 'Twenty kilometres in seven minutes',
    body:
      `In the upper gorge the front moved at **25–49 m/s (90–180 km/h)**. It crossed into Tibet and back and reached **Rasuwagadhi about seven minutes** after the detachment; CCTV at Gyirong Port caught it at 08:44. The Rasuwagadhi gauge sent its last reading, 1.62 m, at 08:40 — far below its 6 m warning level — and then fell silent. **Timure** was hit about a minute later, **Syabrubesi** at 08:50–09:00.\n\n` +
      `The camera follows the modelled front (arrival times from the gauges, eased between reports) and the timeline slows down while the front is fastest. Settlements flash as it reaches them.`,
    camera: track.chasePose(npt('08:36'), 13.1, 52),
    layers: ['flow', 'places', 'gauges', 'report-places'],
    terrain: true,
    exaggeration: 1.5,
    time: {
      start: npt('08:36'),
      end: npt('09:06'),
      duration: 40,
      autoplay: true,
      timeZone: TZ,
      follow: { layer: 'flow', zoom: 13.1, pitch: 52, bearing: 'track', maxViewSpeed: 0.14 },
      captions: [
        cap('08:37:10', 'Rock and ice fall from Langtang Lirung (seismic signal: USGS 08:37:10, EMSC 08:37:44)'),
        cap('08:40', 'Rasuwagadhi gauge: last transmission, 1.62 m (warning level 6 m)'),
        cap('08:44', 'CCTV at Gyirong Port shows the flood'),
        cap('08:45', 'Timure dry port hit'),
        cap('08:50', 'Rasuwagadhi gauge silent; Syabrubesi gauge sends its last reading'),
        cap('08:55', 'The front reaches Syabrubesi'),
        cap('09:00', 'DHM is told of a large flood entering the Bhote Koshi from Tibet'),
      ],
    },
    sources: [CREDITS.pkg, CREDITS.dossier],
  });

  const lake = townById['barrier-lake'];
  chapters.push({
    id: 'barrier-lake',
    kicker: '26–30 Aug · Tibet',
    title: 'A lake behind the debris',
    body:
      `Where the Chhochen Khola meets the Purepu–Chusumdo valley, just inside Tibet, the debris dammed the river. UNOSAT mapped the lake from Cartosat-3 on 28 August at **${un?.lakes?.[0]?.area_ha ?? 11.9} ha**; China's Ministry of Water Resources put it at about **2–2.5 million m³**. It **overflowed on 28 August at about 15:35**, pausing rescue work downstream for three hours and raising the river about 0.6 m, and drained on 29–30 August. A second lake of ${un?.lakes?.[1]?.area_ha ?? 19.5} ha formed just below the source; it was assessed as low risk.\n\n` +
      `Swipe between two PlanetScope frames: hours after the flow on ${lake.before[0]?.date} and two days later on ${lake.after[0]?.date}, with the lake ponded behind the fan.`,
    camera: { center: [85.482, 28.3327], zoom: 13.6, pitch: 30, bearing: 0, duration: 3500 },
    layers: ['report-places', 'unosat-lakes'],
    terrain: true,
    exaggeration: 1.5,
    compare: {
      left: vhrId('barrier-lake', 'before', 0),
      right: vhrId('barrier-lake', 'after', 0),
      leftLabel: `${lake.before[0]?.date} · hours after · PlanetScope`,
      rightLabel: `${lake.after[0]?.date} · lake ponded · PlanetScope`,
    },
    stats: [{ label: 'lake volume', value: '≈2–2.5 Mm³' }, { label: 'lake area, 28 Aug (UNOSAT)', value: `${un?.lakes?.[0]?.area_ha ?? 11.9} ha` }, { label: 'overflowed', value: '28 Aug 15:35' }],
    sources: [CREDITS.unosat, CREDITS.planet, CREDITS.dossier],
  });

  const townChapter = ({ id, kicker, title, body, zoom = 15, center, bearing = 0, s2, afterS2First, extraLayers = [], stats, sources }) => {
    const t = townById[id];
    return {
      id,
      kicker,
      title,
      body,
      camera: { center: center ?? t.center, zoom, pitch: 0, bearing, duration: 3500 },
      layers: ['report-places', ...extraLayers],
      terrain: true,
      exaggeration: 1.5,
      compare: townCompare(id, s2, { afterS2First }),
      stats,
      sources: [...(sources ?? []), CREDITS.vantor, CREDITS.planet],
    };
  };

  const rg = townById.rasuwagadhi;
  chapters.push(townChapter({
    id: 'rasuwagadhi',
    kicker: 'km 22 · 08:44 · the border',
    title: 'Rasuwagadhi, destroyed twice',
    // Framed along NEA's drone strip (crossing on the left, downstream to the right).
    center: [85.3772, 28.2738],
    zoom: 15.9,
    bearing: 90,
    body:
      `The border crossing had been rebuilt after the 2025 glacial-lake flood. The left side is NEA Engineering's **3.5 cm drone survey** of ${rg.before[0].date} — the road, the river and the Miteri Bridge at the crossing (left) down to Timure (right) — laid over PlanetScope from May 2026. The right side is ${rg.after[0].sensor} on ${rg.after[0].date}, the day after: the road, the bridges and the valley floor are scoured to bare gravel.\n\n` +
      `Use the labels to switch scenes: WorldView-2 in 2021, before either flood; Legion-4, Pelican and HOT's mosaic after. The front reached the crossing about seven minutes after the detachment, **${-(lead('Rasuwagadhi') ?? -31)} minutes before** the SMS alert went out.`,
    s2: 'upper',
    extraLayers: ['ems-transport', 'bridges', 'heritage'],
    stats: [{ label: 'drone pixel size', value: '3.5 cm' }, { label: 'warning before the flood', value: `${lead('Rasuwagadhi') ?? -31} min` }],
    sources: [CREDITS.drone, CREDITS.hotMosaic, CREDITS.pkg],
  }));

  chapters.push(townChapter({
    id: 'timure',
    kicker: 'km 26 · ~08:45 · the dry port',
    title: 'Timure dry port',
    body:
      `Timure's customs yard handled the trade that crossed at Rasuwagadhi. It had the least warning of any town. Fifteen customs staff lost contact; **more than 300 queued vehicles, around 1,000 electric vehicles and over 400 containers** were swept away. Copernicus EMS graded **${fmt(emsBy.Timure?.buildings?.Destroyed ?? 372)} buildings destroyed** here.\n\n` +
      `The default swipe is WorldView-2 in 2021 against ${townById.timure.after[0].sensor} on ${townById.timure.after[0].date}. Switch the left side to PlanetScope in May 2026 to see the port as it was, already rebuilt after the 2025 flood.`,
    s2: 'upper',
    extraLayers: ['ems-buildings'],
    stats: [{ label: 'destroyed (EMS)', value: fmt(emsBy.Timure?.buildings?.Destroyed ?? 372) }, { label: 'warning before the flood', value: `${lead('Timure') ?? -30} min` }],
    sources: [CREDITS.ems],
  }));

  chapters.push(townChapter({
    id: 'syabrubesi',
    kicker: 'km 37 · 08:50–09:00',
    title: 'Syabrubesi',
    body:
      `Syabrubesi sits where the Bhote Koshi meets the Langtang Khola, at the start of the Langtang trail. GeoEye-1 in 2023 shows the town climbing terraced slopes above a narrow river; ${townById.syabrubesi.after[0].sensor} on ${townById.syabrubesi.after[0].date} shows the confluence and the riverside town under a single sheet of grey sediment. EMS graded **${fmt(emsBy['Syapru Besi']?.buildings?.Destroyed ?? 323)} buildings destroyed**.\n\n` +
      `Chilime's powerhouse at Syabrubesi was buried; rescuers reached it through 250 m of tunnel and found five NEA staff dead. Among the alternates is a PlanetScope frame taken at **11:29 that same morning**, about two and a half hours after the front passed, and HOT's mosaic of the Vantor scenes from 27 August to 8 September.`,
    s2: 'upper',
    extraLayers: ['ems-buildings', 'hydropower', 'heritage'],
    stats: [{ label: 'destroyed (EMS)', value: fmt(emsBy['Syapru Besi']?.buildings?.Destroyed ?? 323) }, { label: 'warning before the flood', value: `${lead('Syabrubesi') ?? -20} min` }],
    sources: [CREDITS.ems, CREDITS.hotMosaic],
  }));

  chapters.push({
    id: 'gauges',
    kicker: '06:00 → 18:00 · the instrument record',
    title: 'The gauges went silent',
    body:
      `DHM's river gauges report every ten minutes. The three upstream stations — Rasuwagadhi, Syabrubesi and Betrawati — **stopped transmitting while still below their warning levels**: they were destroyed before they could register the flood. A gauge-based alarm could not have fired for the upper valley.\n\n` +
      `Downstream the record survives. Galchhi rose **about 8.8 m in half an hour**; Devghat peaked at **${devghat.peak_stage_m} m and ${fmt(devghat.peak_discharge_m3s)} m³/s at 16:00**, below its warning level — a ${devghat.return_period_years.join('–')}-year flood by the time it reached the plains.`,
    camera: { center: [85.05, 27.95], zoom: 9.2, pitch: 35, bearing: -10, duration: 3500 },
    layers: ['rivers', 'flow', 'gauges'],
    terrain: true,
    exaggeration: 1.5,
    chart: {
      kind: 'line',
      title: 'River stage above the morning level, 26 Aug (m)',
      xLabel: 'NPT',
      series,
      xTicks: hTicks,
      markers: [{ x: 8 + 37 / 60, label: 'detachment' }, { x: 9 + 16 / 60, label: 'SMS' }],
      note: 'DHM river-watch 10-minute series (Acharya & Paudel 2026). Lines that stop are gauges that went silent.',
    },
    sources: [CREDITS.pkg],
  });

  chapters.push({
    id: 'warning',
    kicker: '09:15 · the warning',
    title: 'Faster than the warning',
    body:
      `DHM's forecasters learned of the wave around 09:00. At **09:15 the alert was confirmed and at 09:16 a mass SMS** went out: ${fmt(alert.sms_total)} messages to phones in ${alert.sms_districts.join(', ')} — **${alert.latency_from_origin_min} minutes** after the detachment.\n\n` +
      `By then the front had passed Rasuwagadhi, Timure and Syabrubesi. Betrawati got about ten minutes. At Tribhuvan Trishuli school about 900 pupils were evacuated roughly ten minutes before the water arrived. Downstream the lead time grew: about an hour at Galchhi, more than three hours at Mugling.\n\n` +
      `Negative bars mean the flood arrived before the SMS. The warning latency was longer than the flood's travel time to the first three towns — the central finding of Acharya & Paudel's analysis.`,
    camera: { center: [85.1, 27.98], zoom: 9.0, pitch: 40, bearing: -15, duration: 3500 },
    layers: ['rivers', 'flow', 'gauges', 'keypoints'],
    terrain: true,
    exaggeration: 1.5,
    chart: {
      kind: 'bars',
      title: 'Warning lead time (minutes after the 09:15 SMS)',
      unit: 'negative = flood arrived first',
      data: (warn?.towns ?? []).map((t) => ({ label: t.name, value: t.lead_min, color: t.lead_min < 0 ? '#b91c1c' : t.lead_min < 30 ? '#f59e0b' : '#15803d' })),
    },
    sources: [CREDITS.pkg, CREDITS.ndrrma],
  });

  chapters.push({
    id: 'middle',
    kicker: '09:00 → 10:45 · down the Trishuli',
    title: 'Down the Trishuli',
    body:
      `Below Syabrubesi the valley narrows past **Tiru** (where more than 500 people were still unaccounted for weeks later) and the Upper Trishuli hydropower sites, then opens at **Betrawati** and **Trishuli Bazar**. The front slowed to a few metres per second but carried the valley floor with it.`,
    camera: track.chasePose(npt('08:55'), 12.6, 52),
    layers: ['flow', 'places', 'gauges', 'hydropower', 'report-places'],
    terrain: true,
    exaggeration: 1.5,
    time: {
      start: npt('08:55'),
      end: npt('10:45'),
      duration: 45,
      autoplay: true,
      timeZone: TZ,
      follow: { layer: 'flow', zoom: 12.6, pitch: 52, bearing: 'track', maxViewSpeed: 0.15 },
      captions: [
        cap('09:00', 'DHM Flood Forecasting Division informed'),
        cap('09:15', 'Alert confirmed; high alert for the Trishuli as far as Mugling'),
        cap('09:16', `Mass SMS: ${fmt(alert.sms_total)} messages`),
        cap('09:20', 'Betrawati gauge silent at 3.55 m (warning 4.1 m)'),
        cap('09:25', 'The front reaches Betrawati'),
        cap('09:37', 'Trishuli Bazar and Bidur; the Trishuli bridge is swept away'),
        cap('10:25', 'Galchhi gauge begins to rise'),
        cap('10:28', 'SMS re-issued for the Prithvi Highway and Mugling–Narayangadh'),
      ],
    },
    sources: [CREDITS.pkg, CREDITS.dossier],
  });

  chapters.push({
    id: 'hydropower',
    kicker: 'Energy',
    title: `${fmt(hydro?.missingTotal ?? 804)} workers still missing`,
    body:
      `The government counts **${rdna.energy.hydro_projects} hydropower projects (${fmt(rdna.energy.hydro_capacity_mw)} MW)** and ${rdna.energy.solar_plants[0]} solar plants hit. On 23 September the Energy Minister told Parliament that 11 plants were shut, **410 MW was off the grid** — more than a tenth of Nepal's capacity — and **${fmt(hydro?.missingTotal ?? 804)} workers were still missing**.\n\n` +
      `The toll concentrated at the construction sites. At **Upper Trishuli-1** (216 MW, 84% built, US$647 M) 1,433 people were on site; 439 are missing and more than 90% of the upper dam is gone. Thirty-one bodies were recovered from the rebar mesh of its Audit-3 tunnel at Hakubesi. At **Upper Trishuli-3B** the workers' quarters were buried: 178 missing. At Upper Trishuli-3A two workers were rescued alive from a tunnel on day ten.`,
    camera: { center: [85.25, 28.06], zoom: 11.0, pitch: 50, bearing: -30, duration: 4000 },
    layers: ['flow', 'hydropower', 'keypoints'],
    terrain: true,
    exaggeration: 1.5,
    chart: {
      kind: 'bars',
      title: 'Workers missing, by project (23 Sep)',
      data: (hydro?.missingWorkers ?? []).map((p) => ({ label: p.name, value: p.n, color: '#7f1d1d' })),
      note: 'Energy Minister to Parliament, via the Kathmandu Post. Counts include contractors and NEA staff.',
    },
    stats: [
      { label: 'workers missing (23 Sep)', value: fmt(hydro?.missingTotal ?? 804) },
      { label: 'hydropower hit (RDNA)', value: `${fmt(rdna.energy.hydro_capacity_mw)} MW` },
      { label: 'off the grid (23 Sep)', value: '410 MW' },
      { label: 'energy damage and losses (RDNA)', value: usd(Number(sectors.find((r) => /^Energy/.test(r.subsector))?.total_effects_usd_m ?? 0)) },
    ],
    sources: [CREDITS.kpHydro, CREDITS.rdna, CREDITS.sitrep20, CREDITS.hot, CREDITS.dossier],
  });

  const simle = townById.simle;
  if (simle) {
    chapters.push(townChapter({
      id: 'simle',
      kicker: 'km 62 · ~09:20 · Upper Trishuli-3B',
      title: 'Simle and the Upper Trishuli-3B camp',
      // Framed along the drone strip, upstream on the left.
      center: [85.1815, 28.0095],
      zoom: 15.1,
      bearing: 90,
      body:
        `Just above Betrawati, the Upper Trishuli-3B project had its powerhouse and workers' camp on the valley floor at Simle. The quarters were buried; an excavation 2 m below the new riverbed found only an office foundation. **178 workers** are missing here.\n\n` +
        `The left side is NEA Engineering's **6 cm drone survey** of September 2025, a year before the flood, laid over WorldView-2 from May 2024; upstream is on the left. No clear sub-metre image exists after the flood: cloud or haze covers every scene of this reach. The right side is Sentinel-2 (10 m) on ${aoiById.middle?.after.date}; switch it to PlanetScope taken at **10:46 on 26 August**, about an hour and a half after the front passed — hazy, but the new riverbed is plain.`,
      s2: 'middle',
      afterS2First: true,
      extraLayers: ['hydropower'],
      stats: [{ label: 'workers missing (UT-3B)', value: '178' }, { label: 'drone pixel size', value: '6 cm' }],
      sources: [CREDITS.drone, CREDITS.sitrep20, CREDITS.kpHydro],
    }));
  }

  chapters.push(townChapter({
    id: 'betrawati',
    kicker: 'km 66 · 09:20–09:30',
    title: 'Betrawati',
    body:
      `At Betrawati the Phalakhu Khola joins the Trishuli, and both gauges here went silent at 09:20. WorldView-2 in May 2024 shows the town and bridges; ${townById.betrawati.after[0].sensor} on ${townById.betrawati.after[0].date} (partly cloudy) and PlanetScope on 28 August show the debris fan that filled the valley. Betrawati had about **ten minutes** of warning.\n\n` +
      `UNOSAT saw the Uttargaya Dham temples and Shree Ram Mandir destroyed; the government's assessment adds Betrawati's historic treaty stone (Sandhishila) to ${rdna.cultural_heritage.assets} damaged heritage assets.`,
    s2: 'middle',
    extraLayers: ['bridges', 'heritage'],
  }));

  chapters.push(townChapter({
    id: 'trishuli',
    kicker: 'km 75–78 · 09:30–09:45',
    title: 'Trishuli Bazar and Bidur',
    zoom: 14.6,
    body:
      `In February 2026 (Legion-6, 0.35 m) the Trishuli ran between Trishuli Bazar and Bidur about as wide as a road. On ${townById.trishuli.after[0].date} (WorldView-2) it is a braided gravel bed several hundred metres wide, the **Trishuli bridge is gone**, and riverside streets are erased. Tribhuvan Trishuli school evacuated about 900 pupils roughly ten minutes before the water arrived.\n\n` +
      `Copernicus EMS graded **${fmt(emsBy.Bidur?.buildings?.Destroyed ?? 2479)} buildings destroyed** in the Bidur area — the largest count of any mapped town; the government counts ${fmt(Number(localLevels.find((r) => r.local_level === 'Bidur')?.affected_buildings ?? 3026))} buildings affected in Bidur municipality. Sugatpur Buddhist Vihara was destroyed.`,
    s2: 'bidur',
    extraLayers: ['ems-buildings', 'bridges', 'heritage'],
    stats: [{ label: 'destroyed (EMS, Bidur area)', value: fmt(emsBy.Bidur?.buildings?.Destroyed ?? 2479) }, { label: 'warning before the flood', value: `${lead('Trishuli / Bidur') ?? 22} min` }],
    sources: [CREDITS.ems, CREDITS.rdna, CREDITS.unosat, CREDITS.hotMosaic],
  }));

  chapters.push(townChapter({
    id: 'phosretar',
    kicker: 'km 96 · Dhading',
    title: 'Phosretar',
    body:
      `No sub-metre image of Phosretar exists from before the flood, so the left side is Sentinel-2 (10 m). The right side is WorldView-2 on ${townById.phosretar.after[0].date} at ${townById.phosretar.after[0].gsd} m. EMS graded **${fmt(emsBy.Phosretar?.buildings?.Destroyed ?? 397)} buildings destroyed** here.`,
    s2: 'galchhi',
    extraLayers: ['ems-buildings'],
    stats: [{ label: 'destroyed (EMS)', value: fmt(emsBy.Phosretar?.buildings?.Destroyed ?? 397) }],
    sources: [CREDITS.ems, CREDITS.s2],
  }));

  chapters.push(townChapter({
    id: 'galchhi',
    kicker: 'km 100 · 10:20–10:30',
    title: 'Galchhi',
    body:
      `The Galchhi gauge rose about **8.8 m in half an hour** after 10:20 and peaked at 10:50. The only clear post-event frame here is PlanetScope (3.8 m) on ${townById.galchhi.after[0].date}; the left side is Sentinel-2. Galchhi had about an hour of warning.`,
    s2: 'galchhi',
    stats: [{ label: 'gauge rise in 30 minutes', value: '≈8.8 m' }, { label: 'warning before the flood', value: `${lead('Galchhi') ?? 70} min` }],
    sources: [CREDITS.pkg, CREDITS.s2],
  }));

  chapters.push({
    id: 'lower',
    kicker: '10:40 → 16:00 · six hours to the plains',
    title: 'Six hours to the plains',
    body:
      `Below Galchhi the Trishuli runs beside the Prithvi Highway, Nepal's busiest road. The Phurke gauge at Malekhu crossed its danger level at 11:43 and was swept away with the bridge beside it. The flood passed Mugling by 13:00 and reached the Narayani at Devghat in mid-afternoon, peaking there at 16:00. The camera pulls back as the valley widens.`,
    camera: track.chasePose(npt('10:20'), 11.8, 50),
    layers: ['flow', 'places', 'gauges', 'report-places'],
    terrain: true,
    exaggeration: 1.5,
    time: {
      start: npt('10:20'),
      end: npt('16:10'),
      duration: 45,
      autoplay: true,
      timeZone: TZ,
      follow: { layer: 'flow', zoom: 11.8, pitch: 50, bearing: 'track', maxViewSpeed: 0.15 },
      captions: [
        cap('10:50', 'Galchhi peaks, about 8.8 m above the morning level'),
        cap('11:26', 'Phurke (Malekhu) gauge crosses its warning level'),
        cap('11:43', 'Phurke crosses danger; the gauge and bridge are swept away'),
        cap('11:45:35', 'A second failure at the source (USGS M4.2)'),
        cap('11:50', 'The flood reaches Malekhu bazaar'),
        cap('13:00', 'Confirmed past Mugling; evacuation requested as far as Devghat'),
        cap('13:35', 'China reports the barrier lake has not fully drained'),
        cap('14:14', 'Kali Khola gauge crosses its danger level (12.1 m)'),
        cap('14:35', 'The front reaches Devghat (gauge record)'),
        cap('16:00', `Devghat peak: ${devghat.peak_stage_m} m, ${fmt(devghat.peak_discharge_m3s)} m³/s`),
      ],
    },
    sources: [CREDITS.pkg],
  });

  for (const [aoi, id, title, body, center, zoom] of [
    ['benighat', 'benighat', 'Malekhu, Benighat and Krishnabhir', `No sub-metre scene covers the lower Trishuli, so this swipe is Sentinel-2 (10 m): ${aoiById.benighat?.before.date} against ${aoiById.benighat?.after.date}. Downstream at **Krishnabhir** the river ate **70 m of the Prithvi Highway**, closing it from 30 August to 17 September.`, [84.8, 27.81], 12.6],
    ['mugling', 'mugling', 'Mugling', `Mugling, where the Trishuli meets the Marsyangdi and two highways meet, was passed by 13:00. Sentinel-2: ${aoiById.mugling?.before.date} against ${aoiById.mugling?.after.date}.`, [84.59, 27.86], 12.8],
    ['devghat', 'devghat', 'Devghat and the Narayani', `At Devghat the flood entered the Narayani. The peak — ${devghat.peak_stage_m} m, ${fmt(devghat.peak_discharge_m3s)} m³/s — stayed below the warning level: a ${devghat.return_period_years.join('–')}-year flood here. Bodies were carried far further: most were recovered in Chitwan and Nawalparasi, and some reached Uttar Pradesh in India. Sentinel-2: ${aoiById.devghat?.before.date} against ${aoiById.devghat?.after.date}.`, [84.43, 27.735], 13],
  ]) {
    if (!aoiById[aoi]) continue;
    chapters.push({
      id,
      kicker: `Sentinel-2 · ${aoiById[aoi].name}`,
      title,
      body,
      camera: { center, zoom, pitch: 0, bearing: 0, duration: 3500 },
      layers: ['change', 'report-places', 'keypoints'],
      terrain: true,
      exaggeration: 1.5,
      compare: {
        left: `s2-${aoi}-before`,
        right: `s2-${aoi}-after`,
        leftLabel: `Before · ${aoiById[aoi].before.date}`,
        rightLabel: `After · ${aoiById[aoi].after.date}`,
      },
      sources: [CREDITS.s2, CREDITS.dossier],
    });
  }

  chapters.push({
    id: 'ground',
    kicker: 'Crowdsourced media',
    title: 'Seen from the ground',
    body:
      `Open, geotagged photos and video of this disaster are scarce. Everything found under an open licence is on the map — click a point to open it:\n\n` +
      `- **${fmt(media?.beforePhotos ?? 0)} photos from before** (Wikimedia Commons and Flickr), including a series taken along the Trishuli on 24 August, two days before the flood\n` +
      `- **${fmt(media?.street ?? 0)} street-level frames** from KartaView on the Galchhi–Devghat highway\n` +
      `- **CCTV clips from Gyirong Port**, released into the public domain, showing the flood arriving at 08:44\n` +
      `- **Umbra radar images** of the source and the barrier lake (CC BY 4.0), which see through monsoon cloud\n` +
      `- a few **news videos** on YouTube (links only, placed approximately at the towns they show)\n\n` +
      `No openly licensed, geotagged ground video from after the flood could be found; Mapillary's archive needs a sign-in to search.`,
    camera: { center: [85.0, 28.03], zoom: 9.0, pitch: 35, bearing: -15, duration: 4000 },
    layers: ['flow', 'media'],
    terrain: true,
    exaggeration: 1.5,
    stats: [
      { label: 'open photos and videos mapped', value: fmt(media?.total ?? 0) },
      { label: 'on the day', value: fmt(media?.eventDay ?? 0) },
      { label: 'latest photo before the flood', value: media?.latestBefore ?? '—' },
    ],
    sources: [CREDITS.commons, CREDITS.kartaview, CREDITS.umbra],
  });

  const topLevels = [...localLevels].sort((a, b) => Number(b.affected_buildings) - Number(a.affected_buildings)).slice(0, 10);
  chapters.push({
    id: 'damage',
    kicker: 'Damage',
    title: 'Counting the buildings',
    body:
      `The government's Rapid Damage and Needs Assessment counts **${fmt(rdna.affected_buildings_by_district.total)} buildings affected** in ${rdna.affected_buildings_by_district.local_levels} municipalities — ${fmt(Number(topLevels[0].affected_buildings))} in ${topLevels[0].local_level} alone — home to about ${fmt(rdna.affected_buildings_by_district.est_households)} households and ${fmt(rdna.affected_buildings_by_district.est_population)} people.\n\n` +
      `Satellite mapping agrees on the pattern. Copernicus EMS graded four towns within days: **${fmt(emsTotals.Destroyed ?? 0)} buildings destroyed**, ${fmt(emsTotals.Damaged ?? 0)} damaged and ${fmt(emsTotals['Possibly damaged'] ?? 0)} possibly damaged. UNOSAT flagged ${fmt(5048)} potentially affected buildings along the whole corridor and ${un?.heritage?.total ?? 10} heritage sites damaged or destroyed, among them Rasuwa Fort at the border; the government lists ${rdna.cultural_heritage.assets} heritage assets and ${rdna.education.schools} schools damaged and ${rdna.health_facilities.health_posts_complete} health posts destroyed.\n\n` +
      `Of ${fmt(r26.buildings_near)} buildings mapped in OpenStreetMap within ${r26.buildings_within_m} m of the channel the day before, **${fmt(r26.buildings_hit)}** now lie in stripped or buried ground or have vanished from the map.`,
    camera: { center: [85.16, 27.93], zoom: 12.2, pitch: 45, bearing: -20, duration: 4000 },
    layers: ['ems-extent', 'ems-buildings', 'heritage', 'keypoints'],
    terrain: true,
    exaggeration: 1.5,
    chart: {
      kind: 'bars',
      title: 'Buildings affected, by municipality (RDNA)',
      data: topLevels.map((r) => ({ label: `${r.local_level} (${r.district})`, value: Number(r.affected_buildings), color: r.district === 'Rasuwa' ? '#7f1d1d' : r.district === 'Nuwakot' ? '#b91c1c' : r.district === 'Dhading' ? '#ea580c' : '#f59e0b' })),
      note: 'Data cut-off 3 Sep. Colours by district: Rasuwa, Nuwakot, Dhading, Gorkha/Chitwan.',
    },
    stats: [
      { label: 'buildings affected (RDNA)', value: fmt(rdna.affected_buildings_by_district.total) },
      { label: 'destroyed (EMS, 4 areas)', value: fmt(emsTotals.Destroyed ?? 0) },
      { label: 'people in affected households (RDNA)', value: fmt(rdna.affected_buildings_by_district.est_population) },
      { label: 'heritage assets damaged (RDNA)', value: String(rdna.cultural_heritage.assets) },
    ],
    sources: [CREDITS.rdna, CREDITS.ems, CREDITS.unosat],
  });

  chapters.push({
    id: 'bridges-roads',
    kicker: 'Bridges and roads',
    title: `${bridges.totals.washed_out} of ${bridges.total_bridges} bridges gone`,
    body:
      `Bridges tell the story best, because a bridge cannot drift downstream the way bodies do. HOT's survey of ${bridges.total_bridges} named bridges found **${bridges.totals.washed_out} washed out** — ${bridges.by_district.Rasuwa.washed_out} of ${bridges.by_district.Rasuwa.total} in Rasuwa, ${bridges.by_district.Nuwakot.washed_out} of ${bridges.by_district.Nuwakot.total} in Nuwakot, ${bridges.by_district.Dhading.washed_out} of ${bridges.by_district.Dhading.total} in Dhading and none in Gorkha. The government counts **33 road bridges washed out** and 4 damaged — 3 km of bridge — plus 68 trail-bridge spans and **69 km of road**, including the whole 55 km from Betrawati to Rasuwagadhi.\n\n` +
      `Army Bailey bridges went in at Phalakhu (70 m), Betrawati (72 m) and Syabrubesi (76 m). Downstream the river cut 70 m of the Prithvi Highway at **Krishnabhir**, closing Nepal's busiest road — about 14,000 vehicles a day — from 30 August to 17 September.`,
    camera: { center: [85.24, 28.08], zoom: 10.4, pitch: 50, bearing: -25, duration: 4000 },
    layers: ['flow', 'bridges', 'ems-transport', 'report-places'],
    terrain: true,
    exaggeration: 1.5,
    chart: {
      kind: 'bars',
      title: 'Bridges washed out, by district (HOT survey)',
      data: ['Rasuwa', 'Nuwakot', 'Dhading', 'Gorkha'].map((d) => ({ label: `${d} (${bridges.by_district[d].washed_out}/${bridges.by_district[d].total})`, value: bridges.by_district[d].washed_out, color: '#7f1d1d' })),
      note: 'The share washed out falls downstream.',
    },
    stats: [
      { label: 'bridges washed out (HOT survey)', value: `${bridges.totals.washed_out} / ${bridges.total_bridges}` },
      { label: 'road bridges lost or damaged (RDNA)', value: '33 + 4' },
      { label: 'road damaged (RDNA)', value: '69 km' },
      { label: 'Prithvi Highway closed', value: '18 days' },
    ],
    sources: [CREDITS.hot, CREDITS.rdna, CREDITS.ems, CREDITS.ndrrma],
  });

  chapters.push({
    id: 'change',
    kicker: 'Sentinel-2 · the whole corridor',
    title: 'What the satellites saw',
    body:
      `Comparing Sentinel-2 before (October–November 2025) and after (September 2026) along all ${fmt(r26.length_km)} km, change detection finds **${r26.change_km2} km²** of vegetation or river channel replaced by bare debris within 500 m of the path — **${upperShare}%** of it above Bidur, where the flow was fastest. HOT mapped ${hotKm2} km² of flood extent from imagery on 27 August.\n\n` +
      `Monsoon cloud hid parts of every scene; masked areas are not counted, so these are lower bounds.`,
    camera: { center: [85.15, 28.02], zoom: 9.8, pitch: 40, bearing: -20, duration: 4000 },
    layers: ['change', 'hot-extent', 'flow'],
    terrain: true,
    exaggeration: 1.5,
    chart: {
      kind: 'bars',
      title: 'Stripped or buried ground by stretch',
      unit: 'km²',
      data: r26.imagery.map((i) => ({ label: i.name, value: i.change_km2, color: '#f97316' })),
    },
    sources: [CREDITS.s2, CREDITS.hot],
  });

  const depTotal = deposition.reduce((a, r) => a + Number(r.modelled_deposition_m3), 0);
  const depTop = [...deposition].sort((a, b) => Number(b.modelled_deposition_m3) - Number(a.modelled_deposition_m3))[0];
  chapters.push({
    id: 'debris',
    kicker: 'Where the debris went',
    title: `${(depTotal / 1e6).toFixed(1)} million cubic metres`,
    body:
      `A government model puts **${(depTotal / 1e6).toFixed(1)} million m³** of debris on the valley floor over the ${Math.round(rdna.debris_model.corridor_km)} km from Timure to Malekhu — ${Math.round((100 * Number(depTop.modelled_deposition_m3)) / depTotal)}% of it on the long reach from ${depTop.reach.replace('–', ' to ')}. Clearing only the settlements would mean moving about ${(rdna.debris_model.clearance_m3 / 1e6).toFixed(1)} million m³.\n\n` +
      `UNOSAT mapped **${un?.extent_km2 ?? 65} km² of mudflow and rockflow** from the source to below Devghat on images from 26–27 August. How much rock and ice fell in the first place is still open: seismic estimates range from about 10 to 500 million m³.`,
    camera: { center: [85.19, 28.0], zoom: 11.6, pitch: 55, bearing: -30, duration: 4000 },
    layers: ['unosat-extent', 'keypoints'],
    terrain: true,
    exaggeration: 1.5,
    chart: {
      kind: 'bars',
      title: 'Modelled deposition by reach (million m³)',
      unit: 'Mm³',
      data: deposition.map((r) => ({ label: `${r.reach} (${(Number(r.length_m) / 1000).toFixed(1)} km)`, value: Math.round(Number(r.modelled_deposition_m3) / 1e5) / 10, color: '#9a3412' })),
      note: 'RDNA debris model (NDRRMA/NPC), upstream to downstream.',
    },
    stats: [
      { label: 'modelled deposition (RDNA)', value: `${(depTotal / 1e6).toFixed(1)} Mm³` },
      { label: 'flow extent (UNOSAT)', value: `${un?.extent_km2 ?? 65} km²` },
    ],
    sources: [CREDITS.rdna, CREDITS.unosat, CREDITS.seismic],
  });

  chapters.push({
    id: 'people',
    kicker: '26 Aug → 23 Sep · the toll',
    title: '1,451 dead, 5,705 missing',
    body:
      `The count grew for weeks as recovery reached the upper valley. By 22 September the NDRRMA counted **1,451 dead — 585 men, 336 women and 530 partial remains — and 5,705 missing**; 13,795 people had been rescued. The police keep a separate register: 1,452 dead and 4,718 missing on 23 September. Duplicate reports have been removed from the missing lists since 21 September, so the two will converge.\n\n` +
      `The missing include hydropower workers, drivers queued at the border, trekkers and residents, and **more than 600 foreigners from 35 countries**. DNA samples had been taken from 1,286 bodies and 1,997 relatives by 21 September. China reported 43 dead and 519 missing.`,
    camera: { center: [84.75, 27.8], zoom: 8.6, pitch: 30, bearing: 0, duration: 4000 },
    layers: ['rivers', 'flow', 'keypoints'],
    terrain: true,
    exaggeration: 1.5,
    chart: {
      kind: 'line',
      title: 'Reported toll in Nepal, by days after the event',
      xLabel: 'days after 26 Aug 08:37',
      series: [
        { label: 'Dead (bodies or remains)', color: '#7f1d1d', points: toll.dead },
        { label: 'Missing', color: '#64748b', dashed: true, points: toll.missing },
      ],
      xTicks: [0, 7, 14, 21, 28].map((d) => ({ x: d, label: `${d} d` })),
      note: 'NDRRMA bulletins and situation reports to 22 Sep (inputs/official-2026). The jump in missing on 16 Sep is a re-registration, not new losses.',
    },
    sources: [CREDITS.ndrrma22, CREDITS.sitrep20, CREDITS.police, CREDITS.pkg, CREDITS.dossier],
  });

  const DISTRICTS = [
    ['Rasuwa', 'Rasuwa', '#7f1d1d'],
    ['Nuwakot', 'Nuwakot', '#b91c1c'],
    ['Dhading', 'Dhading', '#ea580c'],
    ['Gorkha', 'Gorkha', '#f59e0b'],
    ['Tanahun', 'Tanahun', '#0f766e'],
    ['Chitwan', 'Chitwan', '#0369a1'],
    ['Nawalparasi_East', 'Nawalparasi East', '#4338ca'],
    ['Nawalparasi_West', 'Nawalparasi West', '#6d28d9'],
  ];
  if (bodiesBy) {
    const downstream = ['Chitwan', 'Nawalparasi_East', 'Nawalparasi_West'].reduce((a, k) => a + Number(bodiesBy[k]), 0);
    chapters.push({
      id: 'recovered',
      kicker: 'Where they were found',
      title: 'Carried 250 km',
      body:
        `Where bodies were recovered is not where people died. By 21 September **${fmt(downstream)} of ${fmt(Number(bodiesBy.total))}** had been found in Chitwan and the two Nawalparasi districts, on the Narayani plains 150–250 km from the source — ${Math.round((100 * downstream) / Number(bodiesBy.total))}% of the total. Some reached Uttar Pradesh in India.\n\n` +
        `Rasuwa's count rose last, from 13 on 30 August to ${bodiesBy.Rasuwa}, as searchers dug into the upper valley; ${31} of those bodies came out of the Upper Trishuli-1 tunnel at Hakubesi on 20–21 September. (One chart in SitRep #20 swaps Rasuwa and Nuwakot; the figures here follow its district table and the police count.)`,
      camera: { center: [84.55, 27.72], zoom: 8.7, pitch: 35, bearing: 10, duration: 4500 },
      layers: ['rivers', 'flow', 'keypoints'],
      terrain: true,
      exaggeration: 1.5,
      chart: {
        kind: 'bars',
        title: `Bodies recovered by district, ${bodiesBy.as_of_npt.slice(8, 10)} Sep (upstream → downstream)`,
        data: DISTRICTS.map(([k, label, color]) => ({ label, value: Number(bodiesBy[k]), color })),
        note: 'NDRRMA Situation Report #20. Two people who died in treatment in Kathmandu are not shown.',
      },
      stats: [
        { label: 'found on the Narayani plains', value: `${Math.round((100 * downstream) / Number(bodiesBy.total))}%` },
        { label: 'Chitwan', value: String(bodiesBy.Chitwan) },
        { label: 'Rasuwa', value: String(bodiesBy.Rasuwa) },
      ],
      sources: [CREDITS.sitrep20, CREDITS.police, CREDITS.dossier],
    });
  }

  const sectorRows = sectors.filter((r) => r.sector !== 'TOTAL' && Number(r.total_effects_usd_m) > 0).sort((a, b) => Number(b.total_effects_usd_m) - Number(a.total_effects_usd_m));
  const energyNeeds = Number(sectors.find((r) => /^Energy/.test(r.subsector))?.recovery_needs_usd_m ?? 0);
  chapters.push({
    id: 'cost',
    kicker: 'The bill',
    title: `${usd(rdna.total_effects.usd_m)} of damage and losses`,
    body:
      `The government's assessment puts damage and losses at **NPR ${fmt(rdna.total_effects.npr_crore / 100)} billion (${usd(rdna.total_effects.usd_m)})** and the cost of recovery at **${usd(rdna.recovery_needs.usd_m)}**, most of it long-term. Energy is the largest item — ${usd(Number(sectorRows[0].total_effects_usd_m))} of damage and losses and ${usd(energyNeeds)} to rebuild — ahead of lost livelihoods and trade (${usd(Number(sectorRows[1].total_effects_usd_m))}) and homes (${usd(Number(sectorRows.find((r) => r.subsector === 'Private buildings')?.total_effects_usd_m ?? 0))}).\n\n` +
      `The figures were cut off on 3 September, before most of the upper valley had been reached. On 24 September Nepal's foreign minister told the UN General Assembly that losses exceed US$5 billion.`,
    camera: { center: [85.05, 27.98], zoom: 9.2, pitch: 40, bearing: -15, duration: 4000 },
    layers: ['flow', 'hydropower', 'bridges', 'keypoints'],
    terrain: true,
    exaggeration: 1.5,
    chart: {
      kind: 'bars',
      title: 'Damage and losses by sector (US$ million, RDNA)',
      data: sectorRows.slice(0, 8).map((r) => ({ label: r.subsector.replace(' (hydropower and grid)', ''), value: Math.round(Number(r.total_effects_usd_m)), color: /Energy/.test(r.subsector) ? '#b91c1c' : '#64748b' })),
    },
    stats: [
      { label: 'damage and losses', value: usd(rdna.total_effects.usd_m) },
      { label: 'recovery needs', value: usd(rdna.recovery_needs.usd_m) },
      { label: 'energy share of the bill', value: `${Math.round((100 * Number(sectorRows[0].total_effects_usd_m)) / rdna.total_effects.usd_m)}%` },
    ],
    sources: [CREDITS.rdna],
  });

  chapters.push({
    id: 'lessons',
    kicker: 'What the data says',
    title: 'Faster than any warning built on rain or rivers',
    body:
      `**The trigger was dry.** No rain fell at the source, so rainfall thresholds never fired.\n\n` +
      `**The river gauges died first.** The three upstream stations went silent below their warning levels; the instrument that could have raised the alarm was destroyed by the thing it measured.\n\n` +
      `**Seismometers saw it at once.** The 08:37 signal was recorded worldwide within minutes but logged in Nepal as an earthquake. A seismic trigger for mass-flow alerts on this corridor could have bought the first towns minutes they did not have.\n\n` +
      `**It happened twice in 14 months.** The 2025 flood came from Tibet, this one from Nepal's own side; both hit the same crossing, dry port and hydropower cascade. Recovery built back in the same place.`,
    camera: { center: [85.3, 28.15], zoom: 10.4, pitch: 55, bearing: 200, duration: 4500 },
    layers: ['flow', 'gauges', 'hydropower', 'keypoints'],
    terrain: true,
    exaggeration: 1.5,
    sources: [CREDITS.pkg, CREDITS.icimod, CREDITS.dossier],
  });

  chapters.push({
    id: 'methods',
    kicker: 'How this map was made',
    title: 'Methods, data and caveats',
    body:
      `**Flow front.** Acharya & Paudel's centreline from the scar to Devghat, timed by DHM gauge arrivals and reports. The front moves at constant speed between reports and eases between speeds around each one; it shows when the front passed, not a hydraulic simulation.\n\n` +
      `**Imagery.** Town close-ups stream full-resolution scenes straight from the Vantor Open Data Program and Planet's Crisis Response release (both CC BY-NC 4.0), NEA Engineering's drone orthophotos on OpenAerialMap (CC BY 4.0) and HOT's post-event mosaic, chosen per town for the least cloud after checking every available scene. Nothing is re-hosted. Sentinel-2 fills in where no sub-metre scene exists.\n\n` +
      `**Official figures.** Tolls follow NDRRMA's situation reports (the police register is noted where it differs); damage, costs and the debris model come from the government's Rapid Damage and Needs Assessment (cut-off 3 Sep); missing hydropower workers from the Energy Minister's statement to Parliament. Satellite damage maps are Copernicus EMS's and UNOSAT's.\n\n` +
      `**Change detection.** Sentinel-2 pixels where NDVI fell at least 0.2 to below 0.25 while the surface brightened, or water became bright bare ground, within 500 m of the path; cloud, shadow and snow masked in both scenes. A screening map.\n\n` +
      `**Buildings** are OpenStreetMap footprints as of 25 August; "hit" means inside a change area, or deleted after the event with nothing redrawn there. **Damage grades** are Copernicus EMS's; **bridges** are HOT's field survey. **Media** are only items with an open licence and a location; YouTube videos are links. **All figures are provisional.**`,
    camera: { center: [85.0, 28.0], zoom: 8.8, pitch: 20, bearing: 0, duration: 3500 },
    layers: ['rivers', 'flow', 'keypoints'],
    terrain: true,
    exaggeration: 1.5,
    sources: Object.values(CREDITS),
  });

  // Drop references to layers that didn't build.
  const known = new Set(layers.map((l) => l.id));
  for (const ch of chapters) {
    ch.layers = ch.layers.filter((l) => known.has(l));
    if (!ch.chart) delete ch.chart;
  }

  const story = {
    version: 1,
    title: 'The Bhote Koshi–Trishuli disaster, 26 August 2026',
    // Every time in the app (timeline, captions, tooltips) reads in Nepal time; the data is UTC.
    timeZone: 'Asia/Kathmandu',
    subtitle: 'An ice–rock avalanche on Langtang Lirung became a 200 km debris flow. Minute by minute and town by town, from open data.',
    byline: 'geojson.app',
    layers,
    chapters,
  };
  await writeJSON('story.json', story);
  return { chapters: chapters.map((c) => c.id), layers: layers.length };
}
