import maplibregl from 'maplibre-gl';
import { DataLayer, FeatureId, IdentifiedFeature, LayerId, categorizeGeometry } from '@/types';
import {
  resolvePointPaint,
  resolveLinePaint,
  resolvePolygonPaint,
  loadMarkerIcons,
} from '@/style';
import { BUCKETS, GeometryBucket, dataLayerIds, dataSourceId } from './ids';

/**
 * Reconciles the layers-store state onto a MapLibre map.
 *
 * Each DataLayer renders as up to three geometry buckets (polygon, line, point),
 * each with its own GeoJSON source (promoteId: _fid) and style layers.
 * Layers are immutable in the store, so a cheap identity diff tells us whether
 * a layer needs a full rebuild or just visibility/filter updates.
 */
export interface LayerRenderer {
  sync(layers: DataLayer[], hiddenFeatureIds: Set<FeatureId>): void;
  /** Re-stack all rendered data layers into store order (bottom → top). */
  restack(): void;
  /** Forget everything previously rendered (call after a basemap style swap). */
  reset(): void;
  /** Invoked after async mutations (e.g. icon loads) add layers out of band. */
  onMutation?: () => void;
  destroy(): void;
}

interface RenderedLayer {
  layer: DataLayer;
  hiddenKey: string;
}

function bucketFeatures(features: IdentifiedFeature[], bucket: GeometryBucket): IdentifiedFeature[] {
  return features.filter((f) => categorizeGeometry(f.geometry.type) === bucket);
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

export function createLayerRenderer(map: maplibregl.Map): LayerRenderer {
  const rendered = new Map<LayerId, RenderedLayer>();
  let order: LayerId[] = [];
  let destroyed = false;

  const renderer: LayerRenderer = {
    sync,
    restack,
    reset() {
      rendered.clear();
      order = [];
    },
    destroy() {
      destroyed = true;
      renderer.onMutation = undefined;
      reset(true);
    },
  };

  function reset(removeFromMap: boolean) {
    if (removeFromMap && map.style) {
      for (const id of rendered.keys()) removeLayerFromMap(id);
    }
    rendered.clear();
    order = [];
  }

  function removeLayerFromMap(layerId: LayerId) {
    for (const bucket of BUCKETS) {
      const ids = dataLayerIds(layerId, bucket);
      for (const id of Object.values(ids)) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      const sourceId = dataSourceId(layerId, bucket);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    }
  }

  function addBucket(layer: DataLayer, bucket: GeometryBucket) {
    const features = bucketFeatures(layer.features, bucket);
    if (features.length === 0) return;

    const sourceId = dataSourceId(layer.id, bucket);
    const ids = dataLayerIds(layer.id, bucket);
    const overrides = paintForBucket(layer.paint, bucket);

    map.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
      promoteId: '_fid',
    });

    /* eslint-disable @typescript-eslint/no-explicit-any */
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
        map.addLayer({
          id: ids.glow,
          type: 'circle',
          source: sourceId,
          paint: glowPaint as any,
        });
        map.addLayer({
          id: ids.main,
          type: 'circle',
          source: sourceId,
          paint: { ...mainPaint, ...overrides } as any,
        });

        if (hasSymbols && symbolLayout && symbolPaint) {
          loadMarkerIcons(map, features).then(() => {
            if (destroyed) return;
            if (!map.getSource(sourceId)) return; // layer replaced meanwhile
            if (map.getLayer(ids.symbol)) return;
            map.addLayer({
              id: ids.symbol,
              type: 'symbol',
              source: sourceId,
              layout: symbolLayout as any,
              paint: symbolPaint as any,
            });
            applyState(rendered.get(layer.id)?.layer ?? layer, hiddenKeyOf(layer));
            restack();
            renderer.onMutation?.();
          });
        }
        break;
      }
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }

  let lastHidden: Set<FeatureId> = new Set();

  function hiddenKeyOf(layer: DataLayer): string {
    const ids = layer.features.filter((f) => lastHidden.has(f.id)).map((f) => f.id);
    return ids.join('|');
  }

  /** Apply layer visibility + hidden-feature filters to all existing sub-layers. */
  function applyState(layer: DataLayer, hiddenKey: string) {
    const hiddenIds = hiddenKey === '' ? [] : hiddenKey.split('|');
    const filter =
      hiddenIds.length > 0
        ? (['!', ['in', ['get', '_fid'], ['literal', hiddenIds]]] as maplibregl.FilterSpecification)
        : null;

    for (const bucket of BUCKETS) {
      for (const id of Object.values(dataLayerIds(layer.id, bucket))) {
        if (!map.getLayer(id)) continue;
        map.setLayoutProperty(id, 'visibility', layer.visible ? 'visible' : 'none');
        map.setFilter(id, filter);
      }
    }
  }

  function restack() {
    for (const layerId of order) {
      for (const bucket of BUCKETS) {
        for (const id of Object.values(dataLayerIds(layerId, bucket))) {
          if (map.getLayer(id)) map.moveLayer(id);
        }
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
        !prev || prev.layer.features !== layer.features || prev.layer.paint !== layer.paint;

      if (needsRebuild) {
        removeLayerFromMap(layer.id);
        for (const bucket of BUCKETS) addBucket(layer, bucket);
        orderChanged = true;
      }

      const hiddenKey = hiddenKeyOf(layer);
      if (needsRebuild || !prev || prev.hiddenKey !== hiddenKey || prev.layer.visible !== layer.visible) {
        applyState(layer, hiddenKey);
      }

      rendered.set(layer.id, { layer, hiddenKey });
    }

    if (orderChanged) restack();
  }

  return renderer;
}
