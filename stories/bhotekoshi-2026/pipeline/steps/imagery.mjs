// Sub-metre before/after imagery of each town on the path, streamed by the app
// straight from the providers' open buckets (cloud-optimised GeoTIFFs with
// CORS), so nothing is re-hosted and every scene shows at native resolution.
//
// Scene choices come from a survey of every Vantor and Planet scene covering
// each town (local cloud checked by eye on contact sheets): the first entry of
// `before` / `after` is the default swipe pair, the rest are alternates.
//
// Licences: Vantor Open Data and Planet Crisis Response are both CC BY-NC 4.0;
// the NEA drone orthophotos on OpenAerialMap are CC BY 4.0.

import { cachedFetch, writeDerived } from '../lib.mjs';

const VANTOR = 'https://vantor-opendata.s3.amazonaws.com/events/Nepal-Flooding-Aug-2026/';
const PLANET = 'https://data.source.coop/planet/disasterdata/nepal-flash-flood-2026-08-26/';

const SENSORS = {
  WV02: 'WorldView-2',
  WV03: 'WorldView-3',
  GE01: 'GeoEye-1',
  LG01: 'Legion-1',
  LG02: 'Legion-2',
  LG03: 'Legion-3',
  LG04: 'Legion-4',
  LG06: 'Legion-6',
  PSScene: 'PlanetScope',
  SkySatCollect: 'SkySat',
  PelicanScene: 'Pelican',
};

const v = (id) => ({ src: 'vantor', id });
const p = (id) => ({ src: 'planet', id });

/** Pre-event drone orthophotos by NEA Engineering on OpenAerialMap (CC BY 4.0). */
const DRONE = {
  border: {
    src: 'direct',
    id: 'nea-drone-rasuwagadhi',
    url: 'https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/6a8fa5c28f75f1daf8b40eb9/0/6a8fa5c28f75f1daf8b40eba.tif',
    datetime: '2025-09-01T12:00:00Z',
    sensor: 'NEA drone orthophoto',
    gsd: 0.035,
    licence: 'CC BY 4.0',
    attribution: '© NEA Engineering Company (OpenAerialMap), CC BY 4.0',
  },
  simle: {
    src: 'direct',
    id: 'nea-drone-simle',
    url: 'https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/6a8f9da28f75f1daf8b405b5/0/6a8f9da28f75f1daf8b405b6.tif',
    datetime: '2025-09-03T12:00:00Z',
    sensor: 'NEA drone orthophoto',
    gsd: 0.06,
    licence: 'CC BY 4.0',
    attribution: '© NEA Engineering Company (OpenAerialMap), CC BY 4.0',
  },
};

/**
 * HOT's post-event mosaic of 26 Vantor scenes (27 Aug–8 Sep, ~0.4 m, EPSG:4326),
 * built for building-damage mapping. Vantor imagery, so CC BY-NC 4.0.
 */
const HOT_MOSAIC = {
  src: 'direct',
  id: 'hot-vantor-mosaic',
  url: 'https://production-raw-data-api.s3.amazonaws.com/ISO3/NPL/buildings/hot_flood_npl_buildings_damage_post.tif',
  datetime: '2026-09-08T00:00:00Z',
  dateLabel: '27 Aug–8 Sep',
  sensor: 'Vantor mosaic (HOT)',
  gsd: 0.4,
  licence: 'CC BY-NC 4.0',
  attribution: '© Vantor Open Data, mosaic by Humanitarian OpenStreetMap Team, CC BY-NC 4.0',
};

/** Towns downstream in order. `km` = side of the square window streamed and clipped. */
export const TOWNS = [
  {
    id: 'source',
    name: 'Langtang Lirung north face',
    center: [85.515, 28.271],
    km: 7,
    note: 'No sub-metre scene covers the source before the event; post-event views only.',
    before: [],
    after: [v('B160001101ECBC10'), v('B0500011006DC010')],
  },
  {
    id: 'barrier-lake',
    name: 'Barrier lake at the Chhochen Khola confluence',
    center: [85.4856, 28.3321],
    km: 4,
    note: 'Two PlanetScope frames: hours after the flow (26 Aug) and two days later, with the lake ponded behind the debris (28 Aug).',
    before: [p('20260826_054456_67_251f')],
    after: [p('20260828_045742_14_2544')],
  },
  {
    id: 'rasuwagadhi',
    name: 'Rasuwagadhi border crossing',
    center: [85.3778, 28.2778],
    km: 3,
    before: [DRONE.border, p('20260527_053219_95_254a'), v('10300100C86CED00')],
    after: [v('B040001100881610'), v('B1400011010A2910'), p('20260901_050632_98_300b'), HOT_MOSAIC],
  },
  {
    id: 'timure',
    name: 'Timure dry port',
    center: [85.367, 28.2545],
    km: 3,
    before: [v('10300100C86CED00'), p('20260527_053219_95_254a')],
    after: [v('B14000110116A310'), v('B040001100881610'), v('B110001101165110')],
  },
  {
    id: 'syabrubesi',
    name: 'Syabrubesi',
    center: [85.338, 28.1628],
    km: 3,
    before: [v('10500100364E8400'), p('20260527_053221_96_254a'), v('10300100C86CED00')],
    after: [v('B040001100882F10'), p('20260826_054500_80_251f'), v('B1200011012B2A10'), p('20260901_050635_67_300b'), HOT_MOSAIC],
  },
  {
    id: 'simle',
    name: 'Simle and Upper Trishuli-3B',
    center: [85.1817, 28.0095],
    km: 3.2,
    note: 'The 6 cm drone survey is the sharpest pre-event view; after the flood only PlanetScope (3.8 m) is clear — taken at 10:46 NPT on 26 August.',
    before: [DRONE.simle, v('10300100FCB83600'), p('20260527_053224_18_254a')],
    after: [p('20260826_050135_34_255f'), p('20260826_050133_00_255f')],
  },
  {
    id: 'betrawati',
    name: 'Betrawati',
    center: [85.186, 27.9731],
    km: 3,
    before: [v('10300100FCB83600'), p('20260527_053226_41_254a')],
    after: [v('B160001101DA4B10'), p('20260828_045749_15_2544')],
  },
  {
    id: 'trishuli',
    name: 'Trishuli Bazar and Bidur',
    center: [85.151, 27.92],
    km: 4.2,
    before: [v('B160001100CDB210'), p('20260527_053226_41_254a'), v('10300100FCB83600')],
    after: [v('B030001100EF5510'), v('B030001100EF5210'), HOT_MOSAIC],
  },
  {
    id: 'phosretar',
    name: 'Phosretar',
    center: [85.0259, 27.8313],
    km: 3,
    note: 'No sub-metre scene before the event; compare with Sentinel-2.',
    before: [],
    after: [v('B030001100EF5110')],
  },
  {
    id: 'galchhi',
    name: 'Galchhi',
    center: [85.0005, 27.7974],
    km: 3,
    note: 'Only a PlanetScope frame (3.8 m) after the event; compare with Sentinel-2.',
    before: [],
    after: [p('20260828_050143_19_2520')],
  },
];

const boxOf = ({ center: [lng, lat], km }) => {
  const dLat = km / 2 / 111.32;
  const dLng = km / 2 / (111.32 * Math.cos((lat * Math.PI) / 180));
  const r = (x) => Math.round(x * 1e5) / 1e5;
  return [r(lng - dLng), r(lat - dLat), r(lng + dLng), r(lat + dLat)];
};

/** Every Planet item in the release, found by walking its STAC catalog. */
async function planetItems() {
  const items = new Map();
  const walk = async (url) => {
    const d = await cachedFetch(url);
    if (d.type === 'Feature') {
      items.set(d.id, { url, item: d });
      return;
    }
    for (const l of d.links ?? []) {
      if (l.rel === 'child' || l.rel === 'item') await walk(new URL(l.href, url).href);
    }
  };
  await walk(`${PLANET}catalog.json`);
  return items;
}

function sceneFromVantor(id, item) {
  const pr = item.properties;
  return {
    src: 'vantor',
    id,
    url: item.assets.visual.href,
    datetime: pr.datetime,
    date: pr.datetime.slice(0, 10),
    sensor: SENSORS[pr.vehicle_name] ?? pr.vehicle_name,
    gsd: pr.pan_gsd ? Math.round(pr.pan_gsd * 100) / 100 : null,
    offNadir: pr['view:off_nadir'] ?? null,
    cloud: pr['eo:cloud_cover'] ?? null,
    licence: 'CC BY-NC 4.0',
    attribution: `© Vantor Open Data (${SENSORS[pr.vehicle_name] ?? pr.vehicle_name}), CC BY-NC 4.0`,
  };
}

function sceneFromPlanet(id, { url, item }) {
  const pr = item.properties;
  const type = pr['pl:item_type'];
  const visual = item.assets.visual?.href;
  return {
    src: 'planet',
    id,
    url: new URL(visual, url).href,
    datetime: pr.datetime,
    date: pr.datetime.slice(0, 10),
    sensor: SENSORS[type] ?? type,
    gsd: pr.gsd ?? null,
    offNadir: pr['view:off_nadir'] ?? null,
    cloud: pr['eo:cloud_cover'] ?? pr.cloud_cover ?? null,
    licence: 'CC BY-NC 4.0',
    attribution: `© Planet Labs PBC (${SENSORS[type] ?? type}), Crisis Response release, CC BY-NC 4.0`,
  };
}

export async function buildImagery() {
  const planet = await planetItems();
  const resolve = async (scene) => {
    const { src, id } = scene;
    if (src === 'direct') return { ...scene, date: scene.datetime.slice(0, 10), offNadir: null, cloud: null };
    if (src === 'vantor') return sceneFromVantor(id, await cachedFetch(`${VANTOR}${id}.json`));
    const hit = planet.get(id);
    if (!hit) throw new Error(`Planet item ${id} not in the release`);
    return sceneFromPlanet(id, hit);
  };
  const towns = [];
  for (const t of TOWNS) {
    towns.push({
      id: t.id,
      name: t.name,
      center: t.center,
      bounds: boxOf(t),
      note: t.note ?? null,
      before: await Promise.all(t.before.map(resolve)),
      after: await Promise.all(t.after.map(resolve)),
    });
  }
  await writeDerived('town-imagery', { towns });
  return towns.map((t) => `${t.id}: ${t.before.map((s) => `${s.sensor} ${s.date}`).join(' / ') || '—'} → ${t.after.map((s) => `${s.sensor} ${s.date}`).join(' / ')}`);
}
