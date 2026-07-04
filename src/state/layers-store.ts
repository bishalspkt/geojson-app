import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Feature, FeatureCollection, GeoJSON } from 'geojson';
import { DataLayer, FeatureId, IdentifiedFeature, LayerId, LayerOrigin } from '@/types';

/** Anything we accept as feature input: a collection, a single feature, or a list. */
export type GeoJsonInput = FeatureCollection | Feature | Feature[];

export interface AddLayerOptions {
  name?: string;
  origin?: LayerOrigin;
  /** Explicit layer id (embed SDK uses caller-supplied ids). Replaces an existing layer with the same id. */
  layerId?: LayerId;
  /** Raw MapLibre paint overrides (see DataLayer.paint). */
  paint?: Record<string, unknown>;
  visible?: boolean;
}

export interface AddFeatureOptions {
  /** Target layer. When omitted, the feature goes to (or creates) a layer named `layerName`. */
  layerId?: LayerId;
  /** Name for the auto-created target layer. Default: "Annotations". */
  layerName?: string;
  origin?: LayerOrigin;
  /** Preserve a caller-supplied feature id (search results correlate on these). */
  presetFid?: FeatureId;
}

export interface Selection {
  layerId: LayerId;
  featureId: FeatureId;
}

export interface LayersState {
  /** Ordered list; index = z-order (later layers render on top). */
  layers: DataLayer[];
  selection: Selection | null;
  hiddenFeatureIds: Set<FeatureId>;

  addLayer(data: GeoJsonInput, opts?: AddLayerOptions): LayerId;
  /** Replace every existing layer with a single new one (the classic "load a file" flow). */
  replaceLayers(data: GeoJsonInput, opts?: AddLayerOptions): LayerId;
  removeLayer(id: LayerId): void;
  renameLayer(id: LayerId, name: string): void;
  setLayerVisible(id: LayerId, visible: boolean): void;
  clearLayers(opts?: { origin?: LayerOrigin }): void;

  addFeature(feature: Feature, opts?: AddFeatureOptions): FeatureId | null;
  removeFeature(id: FeatureId): void;
  updateFeatureProperties(id: FeatureId, properties: Record<string, unknown>): void;
  updateFeatureGeometry(id: FeatureId, geometry: Feature['geometry']): void;

  selectFeature(id: FeatureId | null): void;
  toggleFeatureVisibility(id: FeatureId): void;
  setFeaturesVisibility(ids: FeatureId[], visible: boolean): void;
}

let nextLayerSeq = 1;

function newLayerId(): LayerId {
  return `L${nextLayerSeq++}`;
}

/** Test hook: reset the session-scoped layer id counter. */
export function resetLayerIdCounter() {
  nextLayerSeq = 1;
}

function toFeatureArray(data: GeoJsonInput): Feature[] {
  if (Array.isArray(data)) return data;
  if (data.type === 'FeatureCollection') return data.features;
  if (data.type === 'Feature') return [data];
  return [];
}

function identify(feature: Feature, fid: FeatureId): IdentifiedFeature {
  return {
    ...feature,
    id: fid,
    properties: { ...feature.properties, _fid: fid },
  } as IdentifiedFeature;
}

function buildLayer(data: GeoJsonInput, opts: AddLayerOptions): DataLayer {
  const id = opts.layerId ?? newLayerId();
  let seq = 0;
  const features = toFeatureArray(data).map((f) => identify(f, `${id}/${seq++}`));
  return {
    id,
    name: opts.name ?? id,
    origin: opts.origin ?? 'upload',
    features,
    visible: opts.visible ?? true,
    paint: opts.paint,
    featureSeq: seq,
  };
}

/** Drop a layer's feature ids from the hidden set (used on layer removal/replacement). */
function pruneHidden(hidden: Set<FeatureId>, layers: DataLayer[]): Set<FeatureId> {
  const live = new Set<FeatureId>();
  for (const layer of layers) for (const f of layer.features) live.add(f.id);
  const next = new Set<FeatureId>();
  for (const id of hidden) if (live.has(id)) next.add(id);
  return next;
}

export const useLayersStore = create<LayersState>()(
  subscribeWithSelector((set, get) => ({
    layers: [],
    selection: null,
    hiddenFeatureIds: new Set<FeatureId>(),

    addLayer(data, opts = {}) {
      const layer = buildLayer(data, opts);
      set((state) => {
        const layers = [...state.layers.filter((l) => l.id !== layer.id), layer];
        return {
          layers,
          hiddenFeatureIds: pruneHidden(state.hiddenFeatureIds, layers),
          selection:
            state.selection && state.selection.layerId === layer.id ? null : state.selection,
        };
      });
      return layer.id;
    },

    replaceLayers(data, opts = {}) {
      const layer = buildLayer(data, opts);
      set({
        layers: [layer],
        selection: null,
        hiddenFeatureIds: new Set(),
      });
      return layer.id;
    },

    removeLayer(id) {
      set((state) => {
        const layers = state.layers.filter((l) => l.id !== id);
        return {
          layers,
          hiddenFeatureIds: pruneHidden(state.hiddenFeatureIds, layers),
          selection: state.selection?.layerId === id ? null : state.selection,
        };
      });
    },

    renameLayer(id, name) {
      set((state) => ({
        layers: state.layers.map((l) => (l.id === id ? { ...l, name } : l)),
      }));
    },

    setLayerVisible(id, visible) {
      set((state) => ({
        layers: state.layers.map((l) => (l.id === id ? { ...l, visible } : l)),
      }));
    },

    clearLayers(opts = {}) {
      set((state) => {
        const layers = opts.origin
          ? state.layers.filter((l) => l.origin !== opts.origin)
          : [];
        return {
          layers,
          hiddenFeatureIds: pruneHidden(state.hiddenFeatureIds, layers),
          selection:
            state.selection && layers.some((l) => l.id === state.selection!.layerId)
              ? state.selection
              : null,
        };
      });
    },

    addFeature(feature, opts = {}) {
      const state = get();
      let target = opts.layerId
        ? state.layers.find((l) => l.id === opts.layerId)
        : state.layers.find((l) => l.name === (opts.layerName ?? 'Annotations'));

      if (opts.layerId && !target) return null;

      if (!target) {
        // Create the destination layer, then add into it.
        const layerId = state.addLayer([], {
          name: opts.layerName ?? 'Annotations',
          origin: opts.origin ?? 'draw',
        });
        target = get().layers.find((l) => l.id === layerId)!;
      }

      const layerId = target.id;
      const fid = opts.presetFid ?? `${layerId}/${target.featureSeq}`;
      const identified = identify(feature, fid);

      set((s) => ({
        layers: s.layers.map((l) =>
          l.id === layerId
            ? {
                ...l,
                features: [...l.features, identified],
                featureSeq: opts.presetFid ? l.featureSeq : l.featureSeq + 1,
              }
            : l,
        ),
      }));
      return fid;
    },

    removeFeature(id) {
      set((state) => {
        const layers = state.layers.map((l) =>
          l.features.some((f) => f.id === id)
            ? { ...l, features: l.features.filter((f) => f.id !== id) }
            : l,
        );
        const hiddenFeatureIds = new Set(state.hiddenFeatureIds);
        hiddenFeatureIds.delete(id);
        return {
          layers,
          hiddenFeatureIds,
          selection: state.selection?.featureId === id ? null : state.selection,
        };
      });
    },

    updateFeatureProperties(id, properties) {
      set((state) => ({
        layers: state.layers.map((l) =>
          l.features.some((f) => f.id === id)
            ? {
                ...l,
                features: l.features.map((f) =>
                  f.id === id
                    ? { ...f, properties: { ...f.properties, ...properties, _fid: f.id } }
                    : f,
                ),
              }
            : l,
        ),
      }));
    },

    updateFeatureGeometry(id, geometry) {
      set((state) => ({
        layers: state.layers.map((l) =>
          l.features.some((f) => f.id === id)
            ? {
                ...l,
                features: l.features.map((f) => (f.id === id ? { ...f, geometry } : f)),
              }
            : l,
        ),
      }));
    },

    selectFeature(id) {
      if (id === null) {
        set({ selection: null });
        return;
      }
      const hit = findFeature(get().layers, id);
      set({ selection: hit ? { layerId: hit.layer.id, featureId: id } : null });
    },

    toggleFeatureVisibility(id) {
      set((state) => {
        const hiddenFeatureIds = new Set(state.hiddenFeatureIds);
        if (hiddenFeatureIds.has(id)) hiddenFeatureIds.delete(id);
        else hiddenFeatureIds.add(id);
        return { hiddenFeatureIds };
      });
    },

    setFeaturesVisibility(ids, visible) {
      set((state) => {
        const hiddenFeatureIds = new Set(state.hiddenFeatureIds);
        for (const id of ids) {
          if (visible) hiddenFeatureIds.delete(id);
          else hiddenFeatureIds.add(id);
        }
        return { hiddenFeatureIds };
      });
    },
  })),
);

// ---- Pure helpers (usable inside and outside React) ----

export function findFeature(
  layers: DataLayer[],
  id: FeatureId,
): { layer: DataLayer; feature: IdentifiedFeature } | null {
  for (const layer of layers) {
    const feature = layer.features.find((f) => f.id === id);
    if (feature) return { layer, feature };
  }
  return null;
}

export function allFeatures(layers: DataLayer[]): IdentifiedFeature[] {
  return layers.flatMap((l) => l.features);
}

/** Combined FeatureCollection across all layers (export / copy-as-GeoJSON). */
export function combinedCollection(layers: DataLayer[]): GeoJSON {
  return { type: 'FeatureCollection', features: allFeatures(layers) };
}

export function selectedFeature(state: {
  layers: DataLayer[];
  selection: Selection | null;
}): IdentifiedFeature | null {
  if (!state.selection) return null;
  return findFeature(state.layers, state.selection.featureId)?.feature ?? null;
}
