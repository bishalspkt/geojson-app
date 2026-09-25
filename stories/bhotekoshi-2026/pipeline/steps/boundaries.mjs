// Nepal provinces (geoBoundaries ADM1, CC BY 3.0 IGO — Survey Department of
// Nepal / OCHA) with current official names.

import * as turf from '@turf/turf';
import { cachedFetch, writeGeoJSON } from '../lib.mjs';

// geoBoundaries' 2020 release predates the 2023 renaming of two provinces.
const PROVINCE_NAMES = {
  'Province 1': 'Koshi',
  'Province 2': 'Madhesh',
  Bagmati: 'Bagmati',
  Gandaki: 'Gandaki',
  Lumbini: 'Lumbini',
  Karnali: 'Karnali',
  Sudurpashchim: 'Sudurpashchim',
  Sudurpaschim: 'Sudurpashchim',
};

export async function buildProvinces() {
  const meta = await cachedFetch('https://www.geoboundaries.org/api/current/gbOpen/NPL/ADM1/');
  const fc = await cachedFetch(meta.simplifiedGeometryGeoJSON);
  const features = fc.features.map((f) => {
    const raw = f.properties.shapeName;
    const short = raw.replace(/ Province$/, '');
    const name = PROVINCE_NAMES[raw] ?? PROVINCE_NAMES[short] ?? short;
    return {
      type: 'Feature',
      properties: { name, province: name },
      geometry: turf.simplify(f, { tolerance: 0.004, highQuality: true }).geometry,
    };
  });
  await writeGeoJSON('provinces', { type: 'FeatureCollection', features }, { digits: 4 });
  const outline = turf.union(turf.featureCollection(features));
  await writeGeoJSON('nepal-outline', { type: 'FeatureCollection', features: [{ ...outline, properties: { name: 'Nepal' } }] }, { digits: 4 });
  return { provinces: features.map((f) => f.properties.name) };
}
