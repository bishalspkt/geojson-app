// Crowdsourced media along the path: geotagged photos (Wikimedia Commons,
// Flickr), street-level frames (KartaView) and event videos (Commons CCTV clips,
// YouTube), from the snapshot in inputs/media/ (see its README). Features carry
// the app's media properties (image, video, url, credit, license, captured,
// approximate) so the map shows previews and a media card.

import fs from 'node:fs/promises';
import path from 'node:path';
import { PIPELINE_DIR, writeDerived, writeGeoJSON } from '../lib.mjs';

const read = async (f) => JSON.parse(await fs.readFile(path.join(PIPELINE_DIR, 'inputs', 'media', f), 'utf8'));

/** Licences that allow showing the image with credit. */
const OPEN = /^(cc0|public domain|cc by(-sa)?(\s|$)|cc by-sa|cc by \d|attribution$|cc by-nc-nd)/i;

const COLORS = {
  'before-photo': '#0f766e',
  'before-street': '#475569',
  'before-aerial': '#0f766e',
  'event-day-video': '#b91c1c',
  'event-day-photo': '#b91c1c',
  'after-video': '#b91c1c',
  'after-aerial': '#c2410c',
  'after-photo': '#c2410c',
};

const round = (v) => Math.round(v * 1e5) / 1e5;

function feature(item, { kind, period, video = null, image, approximate }) {
  return {
    type: 'Feature',
    properties: {
      name: item.title.replace(/\.(jpe?g|png|webm|webp|gif|tif)$/i, ''),
      kind,
      period,
      captured: item.captured ? String(item.captured).slice(0, 10) : null,
      source: item.source,
      image,
      video,
      url: item.url,
      credit: item.author ? String(item.author).replace(/<[^>]+>/g, '').slice(0, 120) : null,
      license: item.license,
      approximate,
      'marker-color': COLORS[`${period}-${kind}`] ?? '#64748b',
      'marker-size': period === 'before' ? 'small' : 'medium',
    },
    geometry: { type: 'Point', coordinates: [round(item.lon), round(item.lat)] },
  };
}

export async function buildMedia() {
  const features = [];
  const commons = await read('wikimedia-commons.json');
  for (const it of commons) {
    if (it.lon == null || it.lat == null || !OPEN.test(it.license ?? '')) continue;
    const isVideo = /\.webm$/i.test(it.full ?? '');
    const approximate = /inferred/i.test(it.geo_source ?? '');
    features.push(
      feature(it, {
        kind: isVideo ? 'video' : it.kind === 'aerial' ? 'aerial' : 'photo',
        period: it.period === 'event-day' ? 'event-day' : it.period,
        video: isVideo ? it.full : null,
        image: it.thumb ?? null,
        approximate,
      }),
    );
  }
  for (const it of await read('kartaview.json')) {
    if (it.lon == null) continue;
    features.push(feature({ ...it, license: 'CC BY-SA 4.0' }, { kind: 'street', period: 'before', image: it.thumb, approximate: false }));
  }
  for (const it of await read('flickr.json')) {
    if (it.lon == null || !/^cc by/i.test(it.license ?? '')) continue;
    features.push(feature(it, { kind: 'photo', period: it.period ?? 'before', image: it.thumb, approximate: false }));
  }
  for (const it of await read('youtube.json')) {
    if (it.lon == null) continue; // district-level placement is too coarse to map
    features.push(feature(it, { kind: 'video', period: 'after', image: it.thumb, approximate: true }));
  }
  // Newest first so event media draws above the older photos.
  const rank = { 'event-day': 3, after: 2, before: 1 };
  features.sort((a, b) => rank[a.properties.period] - rank[b.properties.period]);
  await writeGeoJSON('media', { type: 'FeatureCollection', features });
  const count = (p) => features.filter(p).length;
  const facts = {
    total: features.length,
    beforePhotos: count((f) => f.properties.period === 'before' && f.properties.kind === 'photo'),
    street: count((f) => f.properties.kind === 'street'),
    eventDay: count((f) => f.properties.period === 'event-day'),
    after: count((f) => f.properties.period === 'after'),
    videos: count((f) => f.properties.kind === 'video'),
    latestBefore: features
      .filter((f) => f.properties.period === 'before' && f.properties.captured)
      .map((f) => f.properties.captured)
      .sort()
      .at(-1),
  };
  await writeDerived('media', facts);
  return facts;
}
