import type * as maplibregl from 'maplibre-gl';
import { DataLayer, FeatureId, HeatmapDisplay, IdentifiedFeature, LayerId, categorizeGeometry } from '@/types';
import { resolvePointPaint, resolveLinePaint, resolvePolygonPaint } from '@/style';
import {
  BUCKETS,
  GeometryBucket,
  allDataLayerIds,
  dataLayerIds,
  dataSourceId,
  pulseIds,
  trackIds,
} from './ids';
import {
  PulseIndex,
  RenderTime,
  TrackEntry,
  buildPulseIndex,
  buildTrackEntries,
  combineFilters,
  defaultPulseMs,
  pulseCollection,
  quantizeForFilter,
  timeFilter,
  trackCollections,
  withAlpha,
  withTimeProperties,
} from './temporal-render';

/**
 * Reconciles the layers-store state onto a MapLibre map.
 *
 * Each DataLayer renders as up to three geometry buckets (polygon, line, point),
 * each with its own GeoJSON source (promoteId: _fid) and style layers.
 * Layers are immutable in the store, so a cheap identity diff tells us whether
 * a layer needs a full rebuild or just visibility/filter updates.
 *
 * Temporal layers additionally get time filters, a "pulse" overlay for points
 * that just appeared, and animated trails for lines with per-vertex times —
 * all driven by `setTime` (null = timeline off, everything shows).
 */
export interface LayerRenderer {
  sync(layers: DataLayer[], hiddenFeatureIds: Set<FeatureId>): void;
  /** Apply the timeline instant to temporal layers (null = timeline off). */
  setTime(time: RenderTime | null): void;
  /** Re-stack all rendered data layers into store order (bottom → top). */
  restack(): void;
  /** Forget everything previously rendered (call after a basemap style swap). */
  reset(): void;
  destroy(): void;
}

export interface LayerRendererOptions {
  /** Dark basemaps get light label text. Read at build time (theme swaps rebuild). */
  isDark?: () => boolean;
}

interface RenderedLayer {
  layer: DataLayer;
  hiddenKey: string;
  /** Last applied `quantizedTime|window` (null = no time filter applied). */
  timeKey: string | null;
  pulse: PulseIndex | null;
  tracks: TrackEntry[];
  /** The pulse source currently holds no features (skip re-sending empties). */
  pulseEmpty: boolean;
  /** Last time (performance.now) the trail geometry was sent to the worker. */
  trailSentAt: number;
  /** Pending trailing trail update, so the last frame of a burst is exact. */
  trailTimer: ReturnType<typeof setTimeout> | null;
}

/**
 * Trails are re-tiled by the worker on every update; ~20 updates a second
 * looks continuous (the moving head, a single point, still updates every
 * frame and covers the trail's tip) and frees the frame budget on phones.
 */
const TRAIL_INTERVAL_MS = 50;

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
const LABEL_FONT = ['Noto Sans Medium'];
const DEFAULT_TRACK_COLOR = '#f97316';

function bucketFeatures(features: IdentifiedFeature[], bucket: GeometryBucket): IdentifiedFeature[] {
  // `geometry: null` is valid GeoJSON (attribute-only features) — nothing to draw.
  return features.filter((f) => f.geometry && categorizeGeometry(f.geometry.type) === bucket);
}

/** Route raw paint overrides (embed SDK) to the bucket they apply to. */
function paintForBucket(
  paint: Record<string, unknown> | undefined,
  bucket: GeometryBucket,
): Record<string, unknown> {
  if (!paint) return {};
  const prefix = bucket === 'point' ? 'circle-' : bucket === 'line' ? 'line-' : 'fill-';
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(paint)) {
    if (key.startsWith(prefix)) out[key] = value;
  }
  return out;
}

function heatmapOptions(display: DataLayer['display']): Required<Omit<HeatmapDisplay, 'weightField'>> & {
  weightField?: string;
} | null {
  const h = display?.heatmap;
  if (!h) return null;
  const o = h === true ? {} : h;
  return {
    radius: o.radius ?? 14,
    weightField: o.weightField,
    maxWeight: o.maxWeight ?? 1,
    handoverZoom: o.handoverZoom ?? 11,
    intensity: o.intensity ?? 1,
  };
}

export function createLayerRenderer(map: maplibregl.Map, options: LayerRendererOptions = {}): LayerRenderer {
  const rendered = new Map<LayerId, RenderedLayer>();
  let order: LayerId[] = [];
  let destroyed = false;
  let time: RenderTime | null = null;
  let lastHidden: Set<FeatureId> = new Set();

  const renderer: LayerRenderer = {
    sync,
    setTime,
    restack,
    reset() {
      rendered.clear();
      order = [];
    },
    destroy() {
      destroyed = true;
      reset(true);
    },
  };

  function reset(removeFromMap: boolean) {
    for (const entry of rendered.values()) if (entry.trailTimer) clearTimeout(entry.trailTimer);
    if (removeFromMap && map.style) {
      for (const id of rendered.keys()) removeLayerFromMap(id);
    }
    rendered.clear();
    order = [];
  }

  function removeLayerFromMap(layerId: LayerId) {
    for (const id of allDataLayerIds(layerId)) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    const t = trackIds(layerId);
    const sources = [
      ...BUCKETS.map((b) => dataSourceId(layerId, b)),
      pulseIds(layerId).source,
      t.source,
      t.headSource,
    ];
    for (const id of sources) {
      if (map.getSource(id)) map.removeSource(id);
    }
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  function addLabels(layer: DataLayer, bucket: GeometryBucket, sourceId: string) {
    const field = layer.display?.labelField;
    if (!field) return;
    const dark = options.isDark?.() ?? false;
    const ids = dataLayerIds(layer.id, bucket);
    map.addLayer({
      id: ids.label,
      type: 'symbol',
      source: sourceId,
      minzoom: layer.display?.labelMinZoom ?? 0,
      layout: {
        'text-field': ['to-string', ['get', field]],
        'text-font': LABEL_FONT,
        'text-size': ['interpolate', ['linear'], ['zoom'], 6, 11, 14, 13],
        'symbol-placement': bucket === 'line' ? 'line' : 'point',
        'text-anchor': bucket === 'point' ? 'left' : 'center',
        'text-offset': bucket === 'point' ? [0.9, 0] : [0, 0],
        'text-max-width': 9,
        'text-optional': true,
        'text-padding': 3,
      } as any,
      paint: {
        'text-color': dark ? '#f3f4f6' : '#1f2937',
        'text-halo-color': dark ? 'rgba(17,24,39,0.9)' : 'rgba(255,255,255,0.92)',
        'text-halo-width': 1.4,
      },
    });
  }

  function addBucket(layer: DataLayer, bucket: GeometryBucket) {
    const features = bucketFeatures(layer.features, bucket);
    if (features.length === 0) return;

    const sourceId = dataSourceId(layer.id, bucket);
    const ids = dataLayerIds(layer.id, bucket);
    const overrides = paintForBucket(layer.paint, bucket);

    map.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: withTimeProperties(features, layer.temporal) },
      promoteId: '_fid',
    });

    switch (bucket) {
      case 'polygon': {
        const { fillPaint, outlinePaint, outlineLayout } = resolvePolygonPaint(features);
        map.addLayer({
          id: ids.main,
          type: 'fill',
          source: sourceId,
          paint: { ...fillPaint, ...overrides } as any,
        });
        map.addLayer({
          id: ids.outline,
          type: 'line',
          source: sourceId,
          layout: outlineLayout as any,
          paint: outlinePaint as any,
        });
        break;
      }
      case 'line': {
        const { mainPaint, mainLayout, casingPaint, casingLayout } = resolveLinePaint(features);
        map.addLayer({
          id: ids.casing,
          type: 'line',
          source: sourceId,
          layout: casingLayout as any,
          paint: casingPaint as any,
        });
        map.addLayer({
          id: ids.main,
          type: 'line',
          source: sourceId,
          layout: mainLayout as any,
          paint: { ...mainPaint, ...overrides } as any,
        });
        break;
      }
      case 'point': {
        const { mainPaint, glowPaint, symbolLayout, symbolPaint, hasSymbols } =
          resolvePointPaint(features);
        const heat = heatmapOptions(layer.display);
        let fadeIn: Record<string, unknown> = {};
        if (heat) {
          const z = heat.handoverZoom;
          map.addLayer({
            id: ids.heat,
            type: 'heatmap',
            source: sourceId,
            maxzoom: z + 1,
            paint: {
              'heatmap-weight': heat.weightField
                ? ['interpolate', ['linear'], ['to-number', ['get', heat.weightField], 0], 0, 0, heat.maxWeight, 1]
                : 1,
              'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.7 * heat.intensity, z, 2.2 * heat.intensity],
              'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, heat.radius * 0.6, 6, heat.radius, z, heat.radius * 2.2],
              'heatmap-color': [
                'interpolate', ['linear'], ['heatmap-density'],
                0, 'rgba(254,240,217,0)',
                0.15, 'rgba(253,212,158,0.55)',
                0.35, 'rgba(253,187,132,0.75)',
                0.55, 'rgba(252,141,89,0.85)',
                0.75, 'rgba(227,74,51,0.9)',
                1, 'rgba(179,0,0,0.95)',
              ],
              'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], z - 1.5, 0.9, z + 0.5, 0],
            } as any,
          });
          const zoomFade = ['interpolate', ['linear'], ['zoom'], z - 1.5, 0, z, 1];
          fadeIn = { 'circle-opacity': zoomFade, 'circle-stroke-opacity': zoomFade };
        }
        map.addLayer({
          id: ids.glow,
          type: 'circle',
          source: sourceId,
          paint: (heat ? { ...glowPaint, 'circle-opacity': ['interpolate', ['linear'], ['zoom'], heat.handoverZoom - 1.5, 0, heat.handoverZoom, 0.1] } : glowPaint) as any,
        });
        map.addLayer({
          id: ids.main,
          type: 'circle',
          source: sourceId,
          paint: { ...mainPaint, ...fadeIn, ...overrides } as any,
        });

        // Marker icons arrive through the map's missing-image resolver (core/basemap/sprites).
        if (hasSymbols && symbolLayout && symbolPaint) {
          map.addLayer({
            id: ids.symbol,
            type: 'symbol',
            source: sourceId,
            layout: symbolLayout as any,
            paint: symbolPaint as any,
          });
        }
        break;
      }
    }
    addLabels(layer, bucket, sourceId);
  }

  function addTemporalOverlays(layer: DataLayer, entry: RenderedLayer) {
    const cfg = layer.temporal;
    if (!cfg) return;

    const pulse = buildPulseIndex(layer.features, cfg);
    if (pulse.times.length > 0) {
      entry.pulse = pulse;
      const p = pulseIds(layer.id);
      map.addSource(p.source, { type: 'geojson', data: EMPTY });
      const color = ['coalesce', ['get', 'marker-color'], '#ef4444'];
      map.addLayer({
        id: p.halo,
        type: 'circle',
        source: p.source,
        layout: { visibility: 'none' },
        paint: {
          'circle-color': 'rgba(0,0,0,0)',
          'circle-stroke-color': color,
          'circle-stroke-width': ['interpolate', ['linear'], ['get', '_age'], 0, 3, 1, 0.5],
          'circle-stroke-opacity': ['interpolate', ['linear'], ['get', '_age'], 0, 0.9, 1, 0],
          'circle-radius': ['interpolate', ['linear'], ['get', '_age'], 0, 6, 1, 28],
        } as any,
      });
      map.addLayer({
        id: p.core,
        type: 'circle',
        source: p.source,
        layout: { visibility: 'none' },
        paint: {
          'circle-color': color,
          'circle-opacity': ['interpolate', ['linear'], ['get', '_age'], 0, 0.85, 1, 0],
          'circle-radius': ['interpolate', ['linear'], ['get', '_age'], 0, 9, 1, 4],
          'circle-blur': 0.4,
        } as any,
      });
    }

    const tracks = buildTrackEntries(layer.features, cfg);
    if (tracks.length > 0) {
      entry.tracks = tracks;
      const t = trackIds(layer.id);
      const color = cfg.trackColor ?? DEFAULT_TRACK_COLOR;
      map.addSource(t.source, { type: 'geojson', data: EMPTY, lineMetrics: true });
      map.addSource(t.headSource, { type: 'geojson', data: EMPTY });
      // Zoom must stay the top-level interpolation input; per-feature stroke-width wins at every stop.
      const width = (scale: number) => [
        'interpolate', ['linear'], ['zoom'],
        6, ['*', ['coalesce', ['get', 'w'], 3.5], scale],
        10, ['*', ['coalesce', ['get', 'w'], 5], scale],
        13, ['*', ['coalesce', ['get', 'w'], 8], scale],
        16, ['*', ['coalesce', ['get', 'w'], 12], scale],
      ];
      map.addLayer({
        id: t.trailGlow,
        type: 'line',
        source: t.source,
        layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
        paint: {
          'line-color': color,
          'line-width': width(2.6),
          'line-opacity': 0.28,
          'line-blur': 6,
        } as any,
      });
      map.addLayer({
        id: t.trail,
        type: 'line',
        source: t.source,
        layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
        paint: {
          'line-width': width(1),
          'line-gradient': [
            'interpolate', ['linear'], ['line-progress'],
            0, withAlpha(color, 0.45),
            0.75, withAlpha(color, 0.9),
            0.97, color,
            1, '#fff7ed',
          ],
        } as any,
      });
      map.addLayer({
        id: t.headGlow,
        type: 'circle',
        source: t.headSource,
        layout: { visibility: 'none' },
        paint: { 'circle-color': color, 'circle-radius': 18, 'circle-opacity': 0.35, 'circle-blur': 0.8 },
      });
      map.addLayer({
        id: t.head,
        type: 'circle',
        source: t.headSource,
        layout: { visibility: 'none' },
        paint: {
          'circle-color': '#fff7ed',
          'circle-radius': 5.5,
          'circle-stroke-color': color,
          'circle-stroke-width': 2.5,
        },
      });
    }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  function hiddenKeyOf(layer: DataLayer): string {
    const ids = layer.features.filter((f) => lastHidden.has(f.id)).map((f) => f.id);
    return ids.join('|');
  }

  function timeKeyOf(layer: DataLayer): string | null {
    if (!time || !layer.temporal) return null;
    return `${quantizeForFilter(time)}|${time.window ?? ''}`;
  }

  /**
   * Apply layer visibility + hidden-feature/time filters to all existing
   * sub-layers. `force` re-applies even if nothing changed (new sub-layers).
   */
  function applyState(entry: RenderedLayer, force = false) {
    const { layer } = entry;
    const hiddenIds = entry.hiddenKey === '' ? [] : entry.hiddenKey.split('|');
    const hiddenFilter: maplibregl.FilterSpecification | null =
      hiddenIds.length > 0 ? ['!', ['in', ['get', '_fid'], ['literal', hiddenIds]]] : null;
    const timeKey = timeKeyOf(layer);
    const filter = combineFilters(
      hiddenFilter,
      timeKey !== null && time ? timeFilter({ ...time, t: quantizeForFilter(time) }) : null,
    );
    const visibility = layer.visible ? 'visible' : 'none';

    for (const bucket of BUCKETS) {
      for (const id of Object.values(dataLayerIds(layer.id, bucket))) {
        if (!map.getLayer(id)) continue;
        map.setLayoutProperty(id, 'visibility', visibility);
        map.setFilter(id, filter);
      }
    }
    // Timeline overlays only show while the timeline runs.
    const overlayVisibility = layer.visible && time ? 'visible' : 'none';
    const p = pulseIds(layer.id);
    const t = trackIds(layer.id);
    for (const id of [p.halo, p.core, t.trailGlow, t.trail, t.headGlow, t.head]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', overlayVisibility);
    }
    entry.timeKey = timeKey;
    if (force || time) updateTimeOverlays(entry, true);
  }

  /** Per-frame: refresh pulse rings and track trails for the current instant. */
  function updateTimeOverlays(entry: RenderedLayer, force = false) {
    const { layer } = entry;
    const hidden = lastHidden;
    if (entry.pulse) {
      const src = map.getSource(pulseIds(layer.id).source) as maplibregl.GeoJSONSource | undefined;
      if (src) {
        const pulseMs = layer.temporal?.pulseMs ?? (time ? defaultPulseMs(time.extent) : 1);
        const data = time && layer.visible ? pulseCollection(entry.pulse, time.t, pulseMs, hidden) : EMPTY;
        const empty = data.features.length === 0;
        // Most frames have nothing pulsing: don't re-send an empty collection.
        if (!(empty && entry.pulseEmpty) || force) src.setData(data);
        entry.pulseEmpty = empty;
      }
    }
    if (entry.tracks.length > 0) {
      const t = trackIds(layer.id);
      const trailSrc = map.getSource(t.source) as maplibregl.GeoJSONSource | undefined;
      const headSrc = map.getSource(t.headSource) as maplibregl.GeoJSONSource | undefined;
      if (!trailSrc || !headSrc) return;
      if (!(time && layer.visible)) {
        if (entry.trailTimer) clearTimeout(entry.trailTimer);
        entry.trailTimer = null;
        trailSrc.setData(EMPTY);
        headSrc.setData(EMPTY);
        return;
      }
      const { trails, heads } = trackCollections(entry.tracks, time.t, hidden);
      headSrc.setData(heads);
      const now = performance.now();
      if (force || now - entry.trailSentAt >= TRAIL_INTERVAL_MS) {
        if (entry.trailTimer) clearTimeout(entry.trailTimer);
        entry.trailTimer = null;
        entry.trailSentAt = now;
        trailSrc.setData(trails);
      } else if (!entry.trailTimer) {
        entry.trailTimer = setTimeout(() => {
          entry.trailTimer = null;
          if (!destroyed && rendered.get(layer.id) === entry) updateTimeOverlays(entry, true);
        }, TRAIL_INTERVAL_MS);
      }
    }
  }

  function restack() {
    for (const layerId of order) {
      for (const id of allDataLayerIds(layerId)) {
        if (map.getLayer(id)) map.moveLayer(id);
      }
    }
  }

  function setTime(next: RenderTime | null) {
    if (destroyed) return;
    const wasOn = time !== null;
    time = next;
    for (const entry of rendered.values()) {
      if (!entry.layer.temporal) continue;
      if (wasOn !== (time !== null) || entry.timeKey !== timeKeyOf(entry.layer)) {
        applyState(entry);
      } else if (time) {
        updateTimeOverlays(entry);
      }
    }
  }

  function sync(layers: DataLayer[], hiddenFeatureIds: Set<FeatureId>) {
    if (destroyed) return;
    lastHidden = hiddenFeatureIds;

    // Remove layers that no longer exist.
    const liveIds = new Set(layers.map((l) => l.id));
    for (const id of [...rendered.keys()]) {
      if (!liveIds.has(id)) {
        removeLayerFromMap(id);
        rendered.delete(id);
      }
    }

    const prevOrder = order;
    order = layers.map((l) => l.id);
    let orderChanged = prevOrder.length !== order.length ||
      prevOrder.some((id, i) => order[i] !== id);

    for (const layer of layers) {
      const prev = rendered.get(layer.id);
      const needsRebuild =
        !prev ||
        prev.layer.features !== layer.features ||
        prev.layer.paint !== layer.paint ||
        prev.layer.display !== layer.display ||
        prev.layer.temporal !== layer.temporal;

      const hiddenKey = hiddenKeyOf(layer);
      if (needsRebuild) {
        removeLayerFromMap(layer.id);
        const entry: RenderedLayer = { layer, hiddenKey, timeKey: null, pulse: null, tracks: [], pulseEmpty: false, trailSentAt: 0, trailTimer: null };
        for (const bucket of BUCKETS) addBucket(layer, bucket);
        addTemporalOverlays(layer, entry);
        rendered.set(layer.id, entry);
        applyState(entry, true);
        orderChanged = true;
        continue;
      }

      const entry = prev!;
      const changed = prev!.hiddenKey !== hiddenKey || prev!.layer.visible !== layer.visible;
      entry.layer = layer;
      entry.hiddenKey = hiddenKey;
      if (changed) applyState(entry, true);
    }

    if (orderChanged) restack();
  }

  return renderer;
}
