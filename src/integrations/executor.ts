import type * as maplibregl from 'maplibre-gl';
import { ImagerySource, LayerId, MAP_THEMES, MapProjection, MapTheme } from '@/types';
import { getMap } from '@/state/map-store';
import { useLayersStore } from '@/state/layers-store';
import { useSettingsStore } from '@/state/settings-store';
import { useImageryStore } from '@/state/imagery-store';
import { useTimeStore, TimeConfigureOptions } from '@/state/time-store';
import { useCompareStore } from '@/state/compare-store';
import { sanitizeExternalLayerId } from '@/core/layers/ids';
import { parseTime } from '@/core/time/temporal';
import { ingest } from '@/extensions/sources/registry';
import { goToChapter, loadStory } from '@/stories';
import { isStorySlug } from '@/stories/ref';
import {
  Bounds,
  CommandName,
  ImageryInfo,
  LayerInfo,
  LngLat,
  isBounds,
  isLngLat,
  PRIMARY_LAYER_ID,
} from './commands';

export { PRIMARY_LAYER_ID };

const VALID_PROJECTIONS: MapProjection[] = ['mercator', 'globe'];

/** Caller-supplied custom-layer ids → internal layer ids (addLayer tracking). */
const customLayers = new Map<string, LayerId>();

const isHttpUrl = (v: unknown): v is string => typeof v === 'string' && /^https?:\/\//i.test(v);

function isCorners(v: unknown): v is [LngLat, LngLat, LngLat, LngLat] {
  return Array.isArray(v) && v.length === 4 && v.every(isLngLat);
}

function imagerySourceFromArgs(a: Record<string, unknown>): ImagerySource {
  if (a.cog !== undefined) {
    if (!isHttpUrl(a.cog)) throw new Error('addImagery: cog must be an http(s) URL');
    const source: ImagerySource = { type: 'cog', url: a.cog };
    if (typeof a.minzoom === 'number') source.minzoom = a.minzoom;
    if (typeof a.maxzoom === 'number') source.maxzoom = a.maxzoom;
    if (Array.isArray(a.bounds) && a.bounds.length === 4 && a.bounds.every((n) => typeof n === 'number')) {
      source.bounds = a.bounds as [number, number, number, number];
    }
    return source;
  }
  if (Array.isArray(a.tiles)) {
    if (a.tiles.length === 0 || !a.tiles.every(isHttpUrl)) {
      throw new Error('addImagery: tiles must be http(s) URL templates');
    }
    const source: ImagerySource = { type: 'xyz', tiles: a.tiles as string[] };
    if (typeof a.tileSize === 'number') source.tileSize = a.tileSize;
    if (typeof a.minzoom === 'number') source.minzoom = a.minzoom;
    if (typeof a.maxzoom === 'number') source.maxzoom = a.maxzoom;
    if (Array.isArray(a.bounds) && a.bounds.length === 4 && a.bounds.every((n) => typeof n === 'number')) {
      source.bounds = a.bounds as [number, number, number, number];
    }
    return source;
  }
  if (isHttpUrl(a.url)) {
    if (!isCorners(a.coordinates)) throw new Error('addImagery: coordinates must be 4 [lng,lat] corners');
    return { type: 'image', url: a.url, coordinates: a.coordinates };
  }
  throw new Error('addImagery: provide tiles[], url + coordinates, or cog');
}

function timeArg(v: unknown, name: string): number | undefined {
  if (v === undefined) return undefined;
  const t = parseTime(v);
  if (t === null) throw new Error(`setTime: ${name} is not a valid time`);
  return t;
}

function requireMap(): maplibregl.Map {
  const map = getMap();
  if (!map) throw new Error('Map not ready');
  return map;
}

// Great-circle distance in meters, for distance-scaled flyover durations.
function haversineMeters(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371008.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dPhi = toRad(lat2 - lat1);
  const dLambda = toRad(lng2 - lng1);
  const s =
    Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Execute one command against the live stores + map. Transport-independent:
 * the embed bridge, URL loader, and future MCP transport all end up here.
 * Throws on validation failure; transports convert throws into their own
 * error envelopes.
 */
export async function executeCommand(method: CommandName, args: unknown): Promise<unknown> {
  const a = (args ?? {}) as Record<string, unknown>;

  switch (method) {
    case 'flyTo': {
      const m = requireMap();
      const opts: maplibregl.FlyToOptions = {};
      if (isLngLat(a.center)) opts.center = a.center;
      if (typeof a.zoom === 'number') opts.zoom = a.zoom;
      if (typeof a.bearing === 'number') opts.bearing = a.bearing;
      if (typeof a.pitch === 'number') opts.pitch = a.pitch;
      if (typeof a.duration === 'number') {
        opts.duration = a.duration;
      } else if (opts.center) {
        // Scale duration with distance so long flyovers stay legible:
        // sqrt curve from a 1.5 s floor to a 3.5 s cap for intercontinental jumps.
        const from = m.getCenter();
        const [lng, lat] = opts.center as LngLat;
        const t = Math.sqrt(Math.min(1, haversineMeters(from.lng, from.lat, lng, lat) / 10_000_000));
        opts.duration = 1500 + t * 2000;
      }
      m.flyTo(opts);
      return undefined;
    }

    case 'jumpTo': {
      const m = requireMap();
      const opts: maplibregl.JumpToOptions = {};
      if (isLngLat(a.center)) opts.center = a.center;
      if (typeof a.zoom === 'number') opts.zoom = a.zoom;
      if (typeof a.bearing === 'number') opts.bearing = a.bearing;
      if (typeof a.pitch === 'number') opts.pitch = a.pitch;
      m.jumpTo(opts);
      return undefined;
    }

    case 'fitBounds': {
      const m = requireMap();
      const bounds = (a.bounds ?? a) as unknown;
      if (!isBounds(bounds)) throw new Error('fitBounds: bounds must be [[lng,lat],[lng,lat]]');
      const opts: maplibregl.FitBoundsOptions = {};
      if (typeof a.padding === 'number') opts.padding = a.padding;
      if (typeof a.duration === 'number') opts.duration = a.duration;
      if (typeof a.maxZoom === 'number') opts.maxZoom = a.maxZoom;
      m.fitBounds(bounds, opts);
      return undefined;
    }

    case 'setTheme': {
      const theme = a.theme;
      if (typeof theme !== 'string' || !MAP_THEMES.includes(theme as MapTheme)) {
        throw new Error(`setTheme: invalid theme "${String(theme)}"`);
      }
      useSettingsStore.getState().setTheme(theme as MapTheme);
      return undefined;
    }

    case 'setProjection': {
      const projection = a.projection;
      if (typeof projection !== 'string' || !VALID_PROJECTIONS.includes(projection as MapProjection)) {
        throw new Error(`setProjection: invalid projection "${String(projection)}"`);
      }
      useSettingsStore.getState().setProjection(projection as MapProjection);
      return undefined;
    }

    case 'setGeoJSON': {
      const data = a.data ?? a;
      // Replaces the primary data layer; custom layers (addLayer) are untouched.
      await ingest(
        { kind: 'data', data, name: 'Data' },
        { layerId: PRIMARY_LAYER_ID, origin: 'sdk', fit: true },
      );
      return undefined;
    }

    case 'addLayer': {
      const id = typeof a.id === 'string' ? a.id : null;
      if (!id) throw new Error('addLayer: id is required');
      if (a.data == null) throw new Error('addLayer: data is required');
      const layerId = sanitizeExternalLayerId(id);
      await ingest(
        { kind: 'data', data: a.data, name: typeof a.name === 'string' ? a.name : id },
        {
          layerId,
          origin: 'sdk',
          fit: false,
          paint: a.paint && typeof a.paint === 'object' ? (a.paint as Record<string, unknown>) : undefined,
        },
      );
      customLayers.set(id, layerId);
      return undefined;
    }

    case 'removeLayer': {
      const id = typeof a.id === 'string' ? a.id : null;
      if (!id) throw new Error('removeLayer: id is required');
      const layerId = customLayers.get(id) ?? sanitizeExternalLayerId(id);
      useLayersStore.getState().removeLayer(layerId);
      customLayers.delete(id);
      return undefined;
    }

    case 'clearLayers': {
      const { removeLayer } = useLayersStore.getState();
      for (const layerId of customLayers.values()) removeLayer(layerId);
      customLayers.clear();
      return undefined;
    }

    case 'listLayers': {
      const externalIdByInternal = new Map<LayerId, string>();
      for (const [ext, internal] of customLayers) externalIdByInternal.set(internal, ext);
      return useLayersStore.getState().layers.map(
        (l): LayerInfo => ({
          id: externalIdByInternal.get(l.id) ?? l.id,
          name: l.name,
          origin: l.origin,
          featureCount: l.features.length,
          visible: l.visible,
        }),
      );
    }

    case 'setLayerVisibility': {
      const id = typeof a.id === 'string' ? a.id : null;
      if (!id) throw new Error('setLayerVisibility: id is required');
      if (typeof a.visible !== 'boolean') throw new Error('setLayerVisibility: visible must be boolean');
      const state = useLayersStore.getState();
      const layerId = customLayers.get(id) ?? id;
      if (!state.layers.some((l) => l.id === layerId)) {
        throw new Error(`setLayerVisibility: unknown layer "${id}"`);
      }
      state.setLayerVisible(layerId, a.visible);
      return undefined;
    }

    case 'getCenter': {
      const c = requireMap().getCenter();
      return [c.lng, c.lat] as LngLat;
    }
    case 'getZoom':
      return requireMap().getZoom();
    case 'getBearing':
      return requireMap().getBearing();
    case 'getBounds': {
      const b = requireMap().getBounds();
      return [
        [b.getWest(), b.getSouth()],
        [b.getEast(), b.getNorth()],
      ] as Bounds;
    }

    case 'addImagery': {
      const id = typeof a.id === 'string' ? a.id : null;
      if (!id) throw new Error('addImagery: id is required');
      const source = imagerySourceFromArgs(a);
      let time;
      if (a.time && typeof a.time === 'object') {
        const t = a.time as Record<string, unknown>;
        if (t.format !== 'date' && t.format !== 'datetime' && t.format !== 'month') {
          throw new Error('addImagery: time.format must be date, datetime or month');
        }
        if (parseTime(t.default) === null) throw new Error('addImagery: time.default must be a time');
        time = {
          format: t.format,
          default: String(t.default),
          ...(typeof t.stepMinutes === 'number' ? { stepMinutes: t.stepMinutes } : {}),
        } as const;
      }
      useImageryStore.getState().addImagery({
        id: sanitizeExternalLayerId(id),
        name: typeof a.name === 'string' ? a.name : id,
        source,
        origin: 'sdk',
        opacity: typeof a.opacity === 'number' ? a.opacity : 1,
        visible: typeof a.visible === 'boolean' ? a.visible : true,
        attribution: typeof a.attribution === 'string' ? a.attribution : undefined,
        time,
      });
      return undefined;
    }

    case 'removeImagery': {
      const id = typeof a.id === 'string' ? a.id : null;
      if (!id) throw new Error('removeImagery: id is required');
      useImageryStore.getState().removeImagery(sanitizeExternalLayerId(id));
      return undefined;
    }

    case 'listImagery': {
      return useImageryStore.getState().layers.map(
        (l): ImageryInfo => ({
          id: l.origin === 'sdk' ? l.id.replace(/^sdk-/, '') : l.id,
          name: l.name,
          origin: l.origin,
          visible: l.visible,
          opacity: l.opacity,
        }),
      );
    }

    case 'setTerrain': {
      if (typeof a.enabled !== 'boolean') throw new Error('setTerrain: enabled must be boolean');
      const patch: Partial<{ terrain: boolean; terrainExaggeration: number; hillshade: boolean }> = {
        terrain: a.enabled,
      };
      if (typeof a.exaggeration === 'number') {
        if (a.exaggeration < 0 || a.exaggeration > 10) throw new Error('setTerrain: exaggeration must be 0–10');
        patch.terrainExaggeration = a.exaggeration;
      }
      patch.hillshade = typeof a.hillshade === 'boolean' ? a.hillshade : a.enabled;
      useSettingsStore.getState().setSettings(patch);
      return undefined;
    }

    case 'setTime': {
      const time = useTimeStore.getState();
      if (a.enabled === false) {
        time.disable();
        return undefined;
      }
      const start = timeArg(a.start, 'start');
      const end = timeArg(a.end, 'end');
      const opts: TimeConfigureOptions = {};
      if (start !== undefined || end !== undefined) {
        const extent = time.extent;
        const lo = start ?? extent?.[0];
        const hi = end ?? extent?.[1];
        if (lo === undefined || hi === undefined || hi <= lo) throw new Error('setTime: needs start < end');
        opts.extent = [lo, hi];
        opts.lockExtent = true;
      }
      const current = timeArg(a.current, 'current');
      if (current !== undefined) opts.current = current;
      if (typeof a.duration === 'number' && a.duration > 0) opts.duration = a.duration;
      if (a.window === null || (typeof a.window === 'number' && a.window > 0)) opts.window = a.window as number | null;
      if (typeof a.loop === 'boolean') opts.loop = a.loop;
      if (a.timeZone === null || typeof a.timeZone === 'string') opts.timeZone = a.timeZone as string | null;
      if (a.follow === null) {
        opts.follow = null;
      } else if (a.follow && typeof a.follow === 'object') {
        const f = a.follow as Record<string, unknown>;
        if (typeof f.layer !== 'string') throw new Error('setTime: follow.layer is required');
        const layerId = customLayers.get(f.layer) ?? f.layer;
        if (!useLayersStore.getState().layers.some((l) => l.id === layerId)) {
          throw new Error(`setTime: unknown follow layer "${f.layer}"`);
        }
        opts.follow = {
          layerId,
          zoom: typeof f.zoom === 'number' ? f.zoom : undefined,
          pitch: typeof f.pitch === 'number' ? f.pitch : undefined,
          bearing: f.bearing === 'track' || typeof f.bearing === 'number' ? f.bearing : undefined,
          maxViewSpeed: typeof f.maxViewSpeed === 'number' && f.maxViewSpeed > 0 ? f.maxViewSpeed : undefined,
        };
      }
      if (Array.isArray(a.captions)) {
        opts.captions = a.captions.map((c, i) => {
          const cap = c as Record<string, unknown>;
          const t = parseTime(cap?.time);
          if (t === null || typeof cap.text !== 'string') throw new Error(`setTime: captions[${i}] needs a valid time and text`);
          return { t, text: cap.text };
        });
      }
      time.enable(opts);
      if (typeof a.playing === 'boolean') {
        if (a.playing) useTimeStore.getState().play();
        else useTimeStore.getState().pause();
      }
      return undefined;
    }

    case 'setCompare': {
      const compare = useCompareStore.getState();
      if (a.enabled === false) {
        compare.stop();
        return undefined;
      }
      const raw = typeof a.left === 'string' ? [a.left] : Array.isArray(a.left) ? a.left : null;
      if (!raw || raw.length === 0 || !raw.every((v) => typeof v === 'string')) {
        throw new Error('setCompare: left must be an imagery id or list of ids');
      }
      const known = new Set(useImageryStore.getState().layers.map((l) => l.id));
      const left = (raw as string[]).map((id) => (known.has(id) ? id : sanitizeExternalLayerId(id)));
      for (const id of left) {
        if (!known.has(id)) throw new Error(`setCompare: unknown imagery "${id}"`);
      }
      compare.start({
        left,
        leftLabel: typeof a.leftLabel === 'string' ? a.leftLabel : null,
        rightLabel: typeof a.rightLabel === 'string' ? a.rightLabel : null,
        position: typeof a.position === 'number' ? a.position : undefined,
      });
      return undefined;
    }

    case 'loadStory': {
      if (!isHttpUrl(a.url) && !(typeof a.url === 'string' && (a.url.startsWith('/') || isStorySlug(a.url)))) {
        throw new Error('loadStory: url must be an http(s) URL, a site path, or a built-in story name');
      }
      const chapter = typeof a.chapter === 'number' || typeof a.chapter === 'string' ? a.chapter : undefined;
      const story = await loadStory(a.url as string, { chapter });
      return { title: story.title, chapters: story.chapters.map((c) => ({ id: c.id, title: c.title })) };
    }

    case 'setStoryChapter': {
      const ref = a.chapter;
      if (typeof ref !== 'number' && typeof ref !== 'string') {
        throw new Error('setStoryChapter: chapter must be an index or id');
      }
      if (!(await goToChapter(ref))) throw new Error(`setStoryChapter: no chapter "${String(ref)}" (is a story open?)`);
      return undefined;
    }
  }
}

/** Test hook: forget custom-layer tracking. */
export function resetExecutorState() {
  customLayers.clear();
}
