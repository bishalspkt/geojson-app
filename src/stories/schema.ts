import type {
  ImagerySource,
  LayerDisplay,
  StoryChapter,
  StoryDocument,
  StoryLayer,
  StorySource,
} from '@/types';
import { MAP_THEMES } from '@/types';
import { httpUrl } from '@/lib/safe';
import { parseTime } from '@/core/time/temporal';

/**
 * Validate an untrusted story document and resolve its relative URLs.
 * Pure: throws `StoryError` with a JSON-path-ish location on bad input.
 */
export class StoryError extends Error {
  constructor(path: string, message: string) {
    super(`story${path}: ${message}`);
    this.name = 'StoryError';
  }
}

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function str(obj: Json, key: string, path: string, required = true): string | undefined {
  const v = obj[key];
  if (v === undefined || v === null) {
    if (required) throw new StoryError(`${path}.${key}`, 'is required');
    return undefined;
  }
  if (typeof v !== 'string' || (required && v.trim() === '')) {
    throw new StoryError(`${path}.${key}`, 'must be a non-empty string');
  }
  return v;
}

/** Source / credit lines: a text label and an optional http(s) link (anything else is dropped). */
function parseLinks(raw: unknown[]): StorySource[] {
  const out: StorySource[] = [];
  for (const item of raw) {
    if (!isObject(item) || typeof item.label !== 'string' || !item.label.trim()) continue;
    const url = httpUrl(item.url);
    out.push(url ? { label: item.label, url } : { label: item.label });
  }
  return out;
}

function resolveUrl(url: string, base: string): string {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

/** Only http(s) URLs may be fetched by a story (no javascript:, data: is allowed for images). */
function checkFetchUrl(url: string, path: string, allowData = false): void {
  const lower = url.toLowerCase();
  if (lower.startsWith('https://') || lower.startsWith('http://')) return;
  if (allowData && lower.startsWith('data:image/')) return;
  throw new StoryError(path, `unsupported URL scheme in "${url.slice(0, 40)}"`);
}

function parseImagerySource(raw: unknown, base: string, path: string): ImagerySource {
  if (!isObject(raw)) throw new StoryError(path, 'must be an object');
  if (raw.type === 'xyz') {
    const tiles = raw.tiles;
    if (!Array.isArray(tiles) || tiles.length === 0 || !tiles.every((t) => typeof t === 'string')) {
      throw new StoryError(`${path}.tiles`, 'must be a non-empty array of URL templates');
    }
    const resolved = (tiles as string[]).map((t) => {
      // Templates contain {z}/{x}/{y}; resolve relative paths without encoding braces.
      const abs = /^https?:\/\//i.test(t) ? t : resolveUrl(t, base).replace(/%7B/gi, '{').replace(/%7D/gi, '}');
      checkFetchUrl(abs, `${path}.tiles`);
      return abs;
    });
    const out: ImagerySource = { type: 'xyz', tiles: resolved };
    if (isFiniteNumber(raw.tileSize)) out.tileSize = raw.tileSize;
    if (isFiniteNumber(raw.minzoom)) out.minzoom = raw.minzoom;
    if (isFiniteNumber(raw.maxzoom)) out.maxzoom = raw.maxzoom;
    if (Array.isArray(raw.bounds) && raw.bounds.length === 4 && raw.bounds.every(isFiniteNumber)) {
      out.bounds = raw.bounds as [number, number, number, number];
    }
    if (raw.scheme === 'tms' || raw.scheme === 'xyz') out.scheme = raw.scheme;
    return out;
  }
  if (raw.type === 'image') {
    const url = resolveUrl(str(raw, 'url', path)!, base);
    checkFetchUrl(url, `${path}.url`, true);
    const c = raw.coordinates;
    const valid =
      Array.isArray(c) &&
      c.length === 4 &&
      c.every((p) => Array.isArray(p) && p.length === 2 && p.every(isFiniteNumber));
    if (!valid) throw new StoryError(`${path}.coordinates`, 'must be four [lng, lat] corners (TL, TR, BR, BL)');
    return { type: 'image', url, coordinates: c as [[number, number], [number, number], [number, number], [number, number]] };
  }
  if (raw.type === 'cog') {
    const url = resolveUrl(str(raw, 'url', path)!, base);
    checkFetchUrl(url, `${path}.url`);
    const out: ImagerySource = { type: 'cog', url };
    if (Array.isArray(raw.bounds) && raw.bounds.length === 4 && raw.bounds.every(isFiniteNumber)) {
      out.bounds = raw.bounds as [number, number, number, number];
    }
    if (isFiniteNumber(raw.minzoom)) out.minzoom = raw.minzoom;
    if (isFiniteNumber(raw.maxzoom)) out.maxzoom = raw.maxzoom;
    return out;
  }
  throw new StoryError(`${path}.type`, 'must be "xyz", "image" or "cog"');
}

function parseLayer(raw: unknown, base: string, path: string): StoryLayer {
  if (!isObject(raw)) throw new StoryError(path, 'must be an object');
  const id = str(raw, 'id', path)!;
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new StoryError(`${path}.id`, 'may only contain letters, digits, - and _');
  const name = str(raw, 'name', path)!;
  if (raw.type === 'geojson') {
    const url = resolveUrl(str(raw, 'url', path)!, base);
    checkFetchUrl(url, `${path}.url`);
    return {
      id,
      type: 'geojson',
      name,
      url,
      paint: isObject(raw.paint) ? raw.paint : undefined,
      display: isObject(raw.display) ? (raw.display as LayerDisplay) : undefined,
      temporal: raw.temporal === false ? false : isObject(raw.temporal) ? raw.temporal : undefined,
      legend: isObject(raw.legend) ? (raw.legend as never) : undefined,
      attribution: typeof raw.attribution === 'string' ? raw.attribution : undefined,
    } as StoryLayer;
  }
  if (raw.type === 'imagery') {
    const layer: StoryLayer = {
      id,
      type: 'imagery',
      name,
      source: parseImagerySource(raw.source, base, `${path}.source`),
    };
    if (isFiniteNumber(raw.opacity)) layer.opacity = raw.opacity;
    if (isObject(raw.time)) {
      const t = raw.time;
      if (t.format !== 'date' && t.format !== 'datetime' && t.format !== 'month') {
        throw new StoryError(`${path}.time.format`, 'must be "date", "datetime" or "month"');
      }
      if (parseTime(t.default) === null) throw new StoryError(`${path}.time.default`, 'must be a time');
      layer.time = t as never;
    }
    if (typeof raw.attribution === 'string') layer.attribution = raw.attribution;
    if (typeof raw.description === 'string') layer.description = raw.description;
    if (isObject(raw.legend)) layer.legend = raw.legend as never;
    if (raw.placement === 'top' || raw.placement === 'below-labels') layer.placement = raw.placement;
    if (isObject(raw.adjust)) layer.adjust = raw.adjust as never;
    return layer;
  }
  throw new StoryError(`${path}.type`, 'must be "geojson" or "imagery"');
}

function parseChapter(raw: unknown, layerIds: Set<string>, imageryIds: Set<string>, path: string): StoryChapter {
  if (!isObject(raw)) throw new StoryError(path, 'must be an object');
  const id = str(raw, 'id', path)!;
  const title = str(raw, 'title', path)!;
  const body = str(raw, 'body', path, false) ?? '';

  const cam = raw.camera;
  if (!isObject(cam)) throw new StoryError(`${path}.camera`, 'is required');
  const center = cam.center;
  if (!Array.isArray(center) || center.length !== 2 || !center.every(isFiniteNumber)) {
    throw new StoryError(`${path}.camera.center`, 'must be [lng, lat]');
  }
  if (!isFiniteNumber(cam.zoom)) throw new StoryError(`${path}.camera.zoom`, 'must be a number');

  const layers = raw.layers ?? [];
  if (!Array.isArray(layers) || !layers.every((l) => typeof l === 'string')) {
    throw new StoryError(`${path}.layers`, 'must be an array of layer ids');
  }
  for (const l of layers as string[]) {
    if (!layerIds.has(l)) throw new StoryError(`${path}.layers`, `unknown layer "${l}"`);
  }

  const chapter: StoryChapter = {
    id,
    title,
    body,
    camera: {
      center: center as [number, number],
      zoom: cam.zoom,
      ...(isFiniteNumber(cam.pitch) ? { pitch: cam.pitch } : {}),
      ...(isFiniteNumber(cam.bearing) ? { bearing: cam.bearing } : {}),
      ...(isFiniteNumber(cam.duration) ? { duration: cam.duration } : {}),
    },
    layers: layers as string[],
  };
  if (typeof raw.kicker === 'string') chapter.kicker = raw.kicker;
  if (typeof raw.terrain === 'boolean') chapter.terrain = raw.terrain;
  if (isFiniteNumber(raw.exaggeration)) chapter.exaggeration = raw.exaggeration;
  if (typeof raw.hillshade === 'boolean') chapter.hillshade = raw.hillshade;

  if (isObject(raw.compare)) {
    const c = raw.compare;
    const ids = (v: unknown) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v : []);
    for (const side of ['left', 'right'] as const) {
      for (const lid of ids(c[side])) {
        if (typeof lid !== 'string' || !imageryIds.has(lid)) {
          throw new StoryError(`${path}.compare.${side}`, `unknown imagery layer "${String(lid)}"`);
        }
      }
    }
    if (ids(c.left).length === 0) throw new StoryError(`${path}.compare.left`, 'is required');
    for (const key of ['leftOptions', 'rightOptions'] as const) {
      if (c[key] === undefined) continue;
      const opts = c[key];
      if (!Array.isArray(opts)) throw new StoryError(`${path}.compare.${key}`, 'must be an array');
      opts.forEach((o, i) => {
        if (!isObject(o) || typeof o.label !== 'string') throw new StoryError(`${path}.compare.${key}[${i}]`, 'needs a label');
        for (const lid of ids(o.layers)) {
          if (typeof lid !== 'string' || !imageryIds.has(lid)) {
            throw new StoryError(`${path}.compare.${key}[${i}].layers`, `unknown imagery layer "${String(lid)}"`);
          }
        }
      });
    }
    chapter.compare = c as never;
  }

  if (isObject(raw.time)) {
    const t = raw.time;
    const start = parseTime(t.start);
    const end = parseTime(t.end);
    if (start === null || end === null || end <= start) {
      throw new StoryError(`${path}.time`, 'needs start < end (ISO times)');
    }
    if (t.follow !== undefined) {
      const f = t.follow;
      if (!isObject(f) || typeof f.layer !== 'string' || !layerIds.has(f.layer) || imageryIds.has(f.layer)) {
        throw new StoryError(`${path}.time.follow.layer`, 'must name a geojson layer of this story');
      }
      if (f.bearing !== undefined && f.bearing !== 'track' && !isFiniteNumber(f.bearing)) {
        throw new StoryError(`${path}.time.follow.bearing`, 'must be a number or "track"');
      }
      if (f.maxViewSpeed !== undefined && !(isFiniteNumber(f.maxViewSpeed) && f.maxViewSpeed > 0)) {
        throw new StoryError(`${path}.time.follow.maxViewSpeed`, 'must be a positive number');
      }
    }
    if (t.captions !== undefined) {
      const ok =
        Array.isArray(t.captions) &&
        t.captions.every((c) => isObject(c) && typeof c.text === 'string' && parseTime(c.time) !== null);
      if (!ok) throw new StoryError(`${path}.time.captions`, 'must be [{ time, text }] with valid times');
    }
    chapter.time = t as never;
  }

  if (Array.isArray(raw.stats)) chapter.stats = raw.stats.filter(isObject) as never;
  if (isObject(raw.chart)) {
    const c = raw.chart;
    const barsOk = c.kind === 'bars' && Array.isArray(c.data);
    const pointsOk = (pts: unknown) =>
      Array.isArray(pts) && pts.length > 0 && pts.every((p) => Array.isArray(p) && p.length === 2 && p.every(isFiniteNumber));
    const lineOk =
      c.kind === 'line' &&
      (pointsOk(c.points) ||
        (Array.isArray(c.series) &&
          c.series.length > 0 &&
          c.series.every((s) => isObject(s) && typeof s.label === 'string' && pointsOk(s.points))));
    if (!barsOk && !lineOk) {
      throw new StoryError(`${path}.chart`, 'must be {kind:"bars", data} or {kind:"line", points | series}');
    }
    chapter.chart = c as never;
  }
  if (Array.isArray(raw.sources)) chapter.sources = parseLinks(raw.sources);
  return chapter;
}

export function parseStory(raw: unknown, baseUrl: string): StoryDocument {
  if (!isObject(raw)) throw new StoryError('', 'must be a JSON object');
  if (raw.version !== 1) throw new StoryError('.version', 'must be 1');
  const title = str(raw, 'title', '')!;

  if (!Array.isArray(raw.layers)) throw new StoryError('.layers', 'must be an array');
  const layers = raw.layers.map((l, i) => parseLayer(l, baseUrl, `.layers[${i}]`));
  const seen = new Set<string>();
  for (const l of layers) {
    if (seen.has(l.id)) throw new StoryError('.layers', `duplicate layer id "${l.id}"`);
    seen.add(l.id);
  }
  const imageryIds = new Set(layers.filter((l) => l.type === 'imagery').map((l) => l.id));

  if (!Array.isArray(raw.chapters) || raw.chapters.length === 0) {
    throw new StoryError('.chapters', 'must be a non-empty array');
  }
  const chapters = raw.chapters.map((c, i) => parseChapter(c, seen, imageryIds, `.chapters[${i}]`));

  const doc: StoryDocument = { version: 1, title, layers, chapters };
  if (typeof raw.subtitle === 'string') doc.subtitle = raw.subtitle;
  if (typeof raw.byline === 'string') doc.byline = raw.byline;
  if (typeof raw.theme === 'string' && (MAP_THEMES as string[]).includes(raw.theme)) {
    doc.theme = raw.theme as StoryDocument['theme'];
  }
  if (raw.timeZone !== undefined) {
    const zone = str(raw, 'timeZone', '');
    try {
      new Intl.DateTimeFormat('en', { timeZone: zone });
    } catch {
      throw new StoryError('.timeZone', `unknown time zone "${zone}"`);
    }
    doc.timeZone = zone;
  }
  if (Array.isArray(raw.credits)) doc.credits = parseLinks(raw.credits);
  return doc;
}

/** Namespaced store ids for story layers (never collide with user/SDK ids). */
export const storyLayerId = (id: string) => `story:${id}`;

/** Normalize a string-or-array id list. */
export function idList(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  return typeof v === 'string' ? [v] : v;
}
