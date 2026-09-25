import { SourceProvider, toFeatureCollection } from '../registry';

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const EXTENSIONS = ['json', 'geojson'];

/** "national-parks.geojson" → "national-parks" (layer names read better without extensions). */
export function nameFromFile(fileName: string): string {
  return fileName.replace(/\.(geo)?json$/i, '') || fileName;
}

/** Local .json / .geojson files (file picker and drag-drop). */
export const geojsonFileProvider: SourceProvider = {
  id: 'geojson-file',
  label: 'GeoJSON file',
  canHandle(input) {
    if (input.kind !== 'file') return false;
    const ext = input.file.name.split('.').pop()?.toLowerCase() ?? '';
    return EXTENSIONS.includes(ext) && input.file.size <= MAX_FILE_SIZE_BYTES;
  },
  async load(input) {
    if (input.kind !== 'file') throw new Error('expected file input');
    const text = await input.file.text();
    return { collection: toFeatureCollection(JSON.parse(text)), name: nameFromFile(input.file.name) };
  },
};

/** Remote GeoJSON by URL (embed `?geojson=`, future import-by-URL UI). */
export const geojsonUrlProvider: SourceProvider = {
  id: 'geojson-url',
  label: 'GeoJSON URL',
  canHandle(input) {
    return input.kind === 'url';
  },
  async load(input) {
    if (input.kind !== 'url') throw new Error('expected url input');
    const response = await fetch(input.url);
    if (!response.ok) throw new Error(`the server answered ${response.status}`);
    const declared = Number(response.headers.get('content-length'));
    if (declared > MAX_FILE_SIZE_BYTES) throw new Error('the file is larger than 25 MB');
    const text = await response.text();
    if (text.length > MAX_FILE_SIZE_BYTES) throw new Error('the file is larger than 25 MB');
    let name = input.url.split('/').pop()?.split(/[?#]/)[0] || 'Remote data';
    try {
      name = decodeURIComponent(name);
    } catch {
      /* keep the raw segment */
    }
    return { collection: toFeatureCollection(JSON.parse(text)), name: nameFromFile(name) };
  },
};

/** Raw GeoJSON text (paste box). */
export const geojsonTextProvider: SourceProvider = {
  id: 'geojson-text',
  label: 'GeoJSON text',
  canHandle(input) {
    return input.kind === 'text';
  },
  async load(input) {
    if (input.kind !== 'text') throw new Error('expected text input');
    return { collection: toFeatureCollection(JSON.parse(input.text)), name: 'Pasted data' };
  },
};

/** Already-parsed objects (embed SDK setGeoJSON, samples). */
export const geojsonDataProvider: SourceProvider = {
  id: 'geojson-data',
  label: 'GeoJSON data',
  canHandle(input) {
    return input.kind === 'data';
  },
  async load(input) {
    if (input.kind !== 'data') throw new Error('expected data input');
    const raw = typeof input.data === 'string' ? JSON.parse(input.data) : input.data;
    return { collection: toFeatureCollection(raw), name: input.name ?? 'Data' };
  },
};
