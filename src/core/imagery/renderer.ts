import type * as maplibregl from 'maplibre-gl';
import type { ImageryId, ImageryLayer } from '@/types';
import { sanitizeAttribution } from '@/lib/safe';
import { imageryLayerId, imagerySourceId, isAppLayerId } from '../layers/ids';
import { hasTimeTemplate, imageryTimeParam, resolveTimeTemplate } from '../time/temporal';
import { cogTileUrl, registerCogProtocol, warmCog } from './cog';

/**
 * Reconciles imagery-store layers onto a MapLibre map, beneath all data
 * layers. XYZ templates containing `{time}` are re-resolved when the timeline
 * moves (quantized per layer, so tiles only swap when the value changes).
 */
export interface ImageryRenderer {
  sync(layers: ImageryLayer[]): void;
  /** Timeline instant (null = timeline off → each layer's default time). */
  setTime(t: number | null): void;
  reset(): void;
  destroy(): void;
}

export interface ImageryRendererOptions {
  /** Only render layers passing this predicate (compare maps pick their side). */
  include?: (layer: ImageryLayer) => boolean;
  /** Ignore `visible` flags (the compare map shows its chosen layers regardless). */
  forceVisible?: boolean;
}

interface RenderedImagery {
  layer: ImageryLayer;
  /** Resolved `{time}` value currently in the source (null = no template). */
  timeParam: string | null;
}

/** First basemap label layer — imagery goes beneath it by default. */
function firstBasemapSymbolId(map: maplibregl.Map): string | undefined {
  return map.getStyle()?.layers?.find((l) => l.type === 'symbol' && !isAppLayerId(l.id))?.id;
}

/** First app-owned data/system layer — imagery never covers data. */
function firstAppLayerId(map: maplibregl.Map): string | undefined {
  return map.getStyle()?.layers?.find((l) => l.id.startsWith('gj:') || l.id.startsWith('sys:highlight') || l.id.startsWith('sys:measure'))?.id;
}

function sourceSpec(layer: ImageryLayer, timeParam: string | null): maplibregl.SourceSpecification {
  const src = layer.source;
  if (src.type === 'image') {
    return { type: 'image', url: src.url, coordinates: src.coordinates };
  }
  if (src.type === 'cog') {
    registerCogProtocol();
    const spec: maplibregl.RasterSourceSpecification = {
      type: 'raster',
      tiles: [cogTileUrl(src.url, src.bounds)],
      tileSize: 256,
      minzoom: src.minzoom ?? 8,
      maxzoom: src.maxzoom ?? 20,
    };
    if (src.bounds) spec.bounds = src.bounds;
    const attribution = sanitizeAttribution(layer.attribution);
    if (attribution) spec.attribution = attribution;
    return spec;
  }
  const spec: maplibregl.RasterSourceSpecification = {
    type: 'raster',
    tiles: resolveTimeTemplate(src.tiles, timeParam),
    tileSize: src.tileSize ?? 256,
  };
  if (src.minzoom !== undefined) spec.minzoom = src.minzoom;
  if (src.maxzoom !== undefined) spec.maxzoom = src.maxzoom;
  if (src.bounds) spec.bounds = src.bounds;
  if (src.scheme) spec.scheme = src.scheme;
  const attribution = sanitizeAttribution(layer.attribution);
  if (attribution) spec.attribution = attribution;
  return spec;
}

/** Imagery fades in over this long when it appears (e.g. a story chapter shows it). */
const FADE_IN_MS = 700;

function paintFor(layer: ImageryLayer, timed: boolean): maplibregl.RasterLayerSpecification['paint'] {
  const a = layer.adjust ?? {};
  return {
    // Start transparent; `add` animates up to the layer's opacity.
    'raster-opacity': 0,
    'raster-opacity-transition': { duration: FADE_IN_MS, delay: 0 },
    // Timed layers swap tiles during playback — fading would smear frames.
    'raster-fade-duration': timed ? 0 : 250,
    'raster-saturation': a.saturation ?? 0,
    'raster-contrast': a.contrast ?? 0,
    'raster-brightness-min': a.brightnessMin ?? 0,
    'raster-brightness-max': a.brightnessMax ?? 1,
    'raster-hue-rotate': a.hueRotate ?? 0,
    'raster-resampling': 'linear',
  };
}

function templateOf(layer: ImageryLayer): string[] | null {
  return layer.source.type === 'xyz' && layer.time && hasTimeTemplate(layer.source.tiles)
    ? layer.source.tiles
    : null;
}

export function createImageryRenderer(
  map: maplibregl.Map,
  options: ImageryRendererOptions = {},
): ImageryRenderer {
  const rendered = new Map<ImageryId, RenderedImagery>();
  let time: number | null = null;
  let destroyed = false;

  function timeParamFor(layer: ImageryLayer): string | null {
    return templateOf(layer) && layer.time ? imageryTimeParam(layer.time, time) : null;
  }

  function remove(id: ImageryId) {
    const layerId = imageryLayerId(id);
    const sourceId = imagerySourceId(id);
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  }

  function beforeIdFor(layer: ImageryLayer, following: ImageryLayer[]): string | undefined {
    // Keep store order: insert beneath the next already-rendered imagery layer.
    for (const next of following) {
      const id = imageryLayerId(next.id);
      if (rendered.has(next.id) && map.getLayer(id)) return id;
    }
    if (layer.placement === 'top') return firstAppLayerId(map);
    return firstBasemapSymbolId(map) ?? firstAppLayerId(map);
  }

  function add(layer: ImageryLayer, following: ImageryLayer[]): RenderedImagery {
    const timeParam = timeParamFor(layer);
    if (layer.source.type === 'cog') warmCog(layer.source.url);
    map.addSource(imagerySourceId(layer.id), sourceSpec(layer, timeParam));
    map.addLayer(
      {
        id: imageryLayerId(layer.id),
        type: 'raster',
        source: imagerySourceId(layer.id),
        layout: { visibility: 'visible' },
        paint: paintFor(layer, templateOf(layer) !== null),
      },
      beforeIdFor(layer, following),
    );
    // Set the real opacity once the layer exists so the change transitions.
    requestAnimationFrame(() => {
      const id = imageryLayerId(layer.id);
      const live = rendered.get(layer.id);
      if (!destroyed && live && map.getLayer(id)) map.setPaintProperty(id, 'raster-opacity', live.layer.opacity);
    });
    return { layer, timeParam };
  }

  function sync(all: ImageryLayer[]) {
    if (destroyed || !map.style) return;
    // Only visible imagery is added to the map: image sources download on
    // addSource even when hidden, so a story with many chips would otherwise
    // fetch them all up front.
    const layers = (options.include ? all.filter(options.include) : all).filter(
      (l) => options.forceVisible || l.visible,
    );
    const live = new Set(layers.map((l) => l.id));
    for (const id of [...rendered.keys()]) {
      if (!live.has(id)) {
        remove(id);
        rendered.delete(id);
      }
    }

    let orderChanged = false;
    layers.forEach((layer, i) => {
      const prev = rendered.get(layer.id);
      if (!prev || prev.layer.source !== layer.source || prev.layer.time !== layer.time || prev.layer.adjust !== layer.adjust || prev.layer.placement !== layer.placement) {
        if (prev) remove(layer.id);
        rendered.set(layer.id, add(layer, layers.slice(i + 1)));
        orderChanged = true;
        return;
      }
      const id = imageryLayerId(layer.id);
      if (prev.layer.opacity !== layer.opacity) {
        map.setPaintProperty(id, 'raster-opacity', layer.opacity);
      }
      prev.layer = layer;
    });

    if (orderChanged) {
      // Re-establish store order bottom → top beneath the insertion point.
      for (let i = layers.length - 1; i > 0; i--) {
        const upper = imageryLayerId(layers[i].id);
        const lower = imageryLayerId(layers[i - 1].id);
        if (map.getLayer(upper) && map.getLayer(lower)) map.moveLayer(lower, upper);
      }
    }
  }

  function setTime(t: number | null) {
    if (destroyed) return;
    time = t;
    for (const entry of rendered.values()) {
      const tiles = templateOf(entry.layer);
      if (!tiles) continue;
      const param = timeParamFor(entry.layer);
      if (param === entry.timeParam) continue;
      entry.timeParam = param;
      const source = map.getSource(imagerySourceId(entry.layer.id)) as maplibregl.RasterTileSource | undefined;
      source?.setTiles(resolveTimeTemplate(tiles, param));
    }
  }

  return {
    sync,
    setTime,
    reset() {
      rendered.clear();
    },
    destroy() {
      destroyed = true;
      if (map.style) for (const id of rendered.keys()) remove(id);
      rendered.clear();
    },
  };
}
