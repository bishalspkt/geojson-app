// The 26 August 2026 event. Timing anchors and chainages come from the
// research dossier (stories/bhotekoshi-2026/research/dossier.md), which cites
// the primary sources; the flow path is Acharya & Paudel's centreline
// (inputs/flowpaths/, CC BY 4.0). Anchors use `alongKm` = chainage on it.

import { buildEvent } from '../event.mjs';

const NPT = (s) => `${s}+05:45`;

export const EVENTS = {
  // Ice–rock avalanche from Langtang Lirung → debris flow down the Lende
  // Khola → Bhote Koshi → Trishuli → Narayani. Arrival times: DHM river-watch
  // 10-min series as read by Acharya & Paudel (2026, CC BY 4.0).
  'rasuwa-2026': {
    id: 'rasuwa-2026',
    title: 'Bhote Koshi–Trishuli disaster, 26 Aug 2026',
    flowName: 'Debris-flow front, 26 Aug 2026 (times from DHM gauges)',
    pathFile: 'inputs/flowpaths/rasuwa-2026-acharya-paudel-ccby.geojson',
    color: '#7c2d12',
    anchors: [
      { alongKm: 0, time: NPT('2026-08-26T08:37:10'), label: 'Detachment (USGS us7000tbwb)' },
      { alongKm: 22.3, time: NPT('2026-08-26T08:44:00'), label: 'Rasuwagadhi / Gyirong Port (CCTV 08:44)' },
      { alongKm: 36.7, time: NPT('2026-08-26T08:55:00'), label: 'Syabrubesi (08:50–09:00)' },
      { alongKm: 66.4, time: NPT('2026-08-26T09:25:00'), label: 'Betrawati (09:20–09:30)' },
      { alongKm: 100.1, time: NPT('2026-08-26T10:25:00'), label: 'Galchhi (10:20–10:30)' },
      { alongKm: 123.9, time: NPT('2026-08-26T11:46:00'), label: 'Malekhu (11:43–11:50)' },
      { alongKm: 163.1, time: NPT('2026-08-26T12:55:00'), label: 'Mugling (by 13:00)' },
      { alongKm: 196.2, time: NPT('2026-08-26T14:35:00'), label: 'Devghat (14:30–14:40)' },
    ],
    osmDate: '2026-08-25T00:00:00Z',
    placeKm: 1.2,
    buildingKm: 0.2,
    infraKm: 0.3,
    keyPoints: [
      { name: 'Ice–rock detachment, Langtang Lirung north face (USGS epicentre)', role: 'origin', point: [85.515, 28.271], reported: '08:37:10 NPT, M5.2 landslide signal' },
      { name: 'Main barrier lake (Chhochen Khola confluence)', role: 'dam', point: [85.4856, 28.3321], reported: 'formed 26 Aug; overflowed 28 Aug ~15:35; drained 29–30 Aug', onPath: false },
      { name: 'Rasuwagadhi / Gyirong Port', role: 'town', point: [85.3778, 28.2778], reported: '08:40–08:50 (CCTV 08:44)' },
      { name: 'Timure dry port', role: 'town', point: [85.3667, 28.2528], reported: '~08:45' },
      { name: 'Syabrubesi', role: 'town', point: [85.3378, 28.1628], reported: '08:50–09:00' },
      { name: 'Betrawati', role: 'town', point: [85.186, 27.9731], reported: '09:20–09:30' },
      { name: 'Bidur / Trishuli Bazar', role: 'town', point: [85.1465, 27.8953], reported: '~09:30–09:45 (interpolated)' },
      { name: 'Galchhi', role: 'gauge', point: [85.0005, 27.7974], reported: '10:20–10:30; peak 10:50 (+8.8 m)' },
      { name: 'Malekhu / Phurke', role: 'gauge', point: [84.8272, 27.8137], reported: 'bridge and gauge swept 11:43' },
      { name: 'Mugling', role: 'town', point: [84.561, 27.8562], reported: 'passed by 13:00' },
      { name: 'Devghat (Narayani gauge)', role: 'gauge', point: [84.4231, 27.7429], reported: '14:30–14:40; peak 5,850 m³/s at 16:00' },
    ],
    imagery: [
      {
        id: 'source',
        name: 'Langtang Lirung north face – Lende Khola',
        bbox: [85.43, 28.22, 85.56, 28.36],
        before: { datetime: '2025-10-01T00:00:00Z/2026-06-10T00:00:00Z', prefer: '2025-11-01', maxCloud: 25, maxCandidates: 14 },
        after: { datetime: '2026-08-26T12:00:00Z/2026-09-25T00:00:00Z', maxCloud: 95, maxCandidates: 14 },
      },
      {
        id: 'upper',
        name: 'Rasuwagadhi–Timure–Syabrubesi',
        bbox: [85.315, 28.14, 85.405, 28.29],
        before: { datetime: '2025-10-01T00:00:00Z/2026-06-10T00:00:00Z', prefer: '2025-11-01', maxCloud: 25, maxCandidates: 14 },
        after: { datetime: '2026-08-26T12:00:00Z/2026-09-25T00:00:00Z', maxCloud: 95, maxCandidates: 14 },
      },
      {
        id: 'middle',
        name: 'Syabrubesi–Betrawati',
        bbox: [85.17, 27.955, 85.35, 28.16],
        before: { datetime: '2025-10-01T00:00:00Z/2026-06-10T00:00:00Z', prefer: '2025-11-01', maxCloud: 25, maxCandidates: 14 },
        after: { datetime: '2026-08-26T12:00:00Z/2026-09-25T00:00:00Z', maxCloud: 95, maxCandidates: 14 },
      },
      {
        id: 'bidur',
        name: 'Betrawati–Trishuli–Bidur',
        bbox: [85.12, 27.87, 85.21, 27.99],
        before: { datetime: '2025-10-01T00:00:00Z/2026-06-10T00:00:00Z', prefer: '2025-11-01', maxCloud: 25, maxCandidates: 14 },
        after: { datetime: '2026-08-26T12:00:00Z/2026-09-25T00:00:00Z', maxCloud: 95, maxCandidates: 14 },
      },
      {
        id: 'galchhi',
        name: 'Galchhi–Phosretar',
        bbox: [84.95, 27.77, 85.07, 27.87],
        before: { datetime: '2025-10-01T00:00:00Z/2026-06-10T00:00:00Z', prefer: '2025-11-01', maxCloud: 25, maxCandidates: 14 },
        after: { datetime: '2026-08-26T12:00:00Z/2026-09-25T00:00:00Z', maxCloud: 95, maxCandidates: 14 },
      },
      {
        id: 'benighat',
        name: 'Benighat–Malekhu',
        bbox: [84.73, 27.78, 84.87, 27.845],
        before: { datetime: '2025-10-01T00:00:00Z/2026-06-10T00:00:00Z', prefer: '2025-11-01', maxCloud: 25, maxCandidates: 14 },
        after: { datetime: '2026-08-26T12:00:00Z/2026-09-25T00:00:00Z', maxCloud: 95, maxCandidates: 14 },
      },
      {
        id: 'mugling',
        name: 'Kurintar–Mugling',
        bbox: [84.53, 27.83, 84.66, 27.895],
        before: { datetime: '2025-10-01T00:00:00Z/2026-06-10T00:00:00Z', prefer: '2025-11-01', maxCloud: 25, maxCandidates: 14 },
        after: { datetime: '2026-08-26T12:00:00Z/2026-09-25T00:00:00Z', maxCloud: 95, maxCandidates: 14 },
      },
      {
        id: 'devghat',
        name: 'Devghat',
        bbox: [84.39, 27.7, 84.47, 27.775],
        before: { datetime: '2025-10-01T00:00:00Z/2026-06-10T00:00:00Z', prefer: '2025-11-01', maxCloud: 25, maxCandidates: 14 },
        after: { datetime: '2026-08-26T12:00:00Z/2026-09-25T00:00:00Z', maxCloud: 95, maxCandidates: 14 },
      },
    ],
  },

};

export async function buildEvents(ids = Object.keys(EVENTS)) {
  const results = {};
  for (const id of ids) results[id] = await buildEvent(EVENTS[id]);
  return results;
}
