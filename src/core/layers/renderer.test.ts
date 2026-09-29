import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as maplibregl from 'maplibre-gl';
import { resetLayerIdCounter, useLayersStore } from '@/state/layers-store';
import { createLayerRenderer, EVICT_HIDDEN_MS } from './renderer';

/** Just enough of a MapLibre map to record what the renderer puts on it. */
function fakeMap() {
  const sources = new Map<string, unknown>();
  const layers = new Map<string, { layout?: Record<string, unknown> }>();
  const map = {
    style: {},
    addSource: (id: string, spec: unknown) => {
      if (sources.has(id)) throw new Error(`source ${id} exists`);
      sources.set(id, { spec, setData: () => {} });
    },
    getSource: (id: string) => sources.get(id),
    removeSource: (id: string) => sources.delete(id),
    addLayer: (spec: { id: string; layout?: Record<string, unknown> }) => {
      if (layers.has(spec.id)) throw new Error(`layer ${spec.id} exists`);
      layers.set(spec.id, { layout: { ...spec.layout } });
    },
    getLayer: (id: string) => layers.get(id),
    removeLayer: (id: string) => layers.delete(id),
    moveLayer: () => {},
    setFilter: () => {},
    setLayoutProperty: (id: string, key: string, value: unknown) => {
      layers.get(id)!.layout![key] = value;
    },
  };
  return { map: map as unknown as maplibregl.Map, sources };
}

const collection = (n: number): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: Array.from({ length: n }, (_, i) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [i, 0] }, properties: {} })),
});

describe('layer renderer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetLayerIdCounter();
    useLayersStore.setState({ layers: [], selection: null, hiddenFeatureIds: new Set() });
  });
  afterEach(() => vi.useRealTimers());

  const sync = (renderer: ReturnType<typeof createLayerRenderer>) => {
    const { layers, hiddenFeatureIds } = useLayersStore.getState();
    renderer.sync(layers, hiddenFeatureIds);
  };
  const sourceLayers = (sources: Map<string, unknown>) => [...new Set([...sources.keys()].map((id) => id.split(':')[1]))].sort();

  it('only puts visible layers on the map', () => {
    const { map, sources } = fakeMap();
    const renderer = createLayerRenderer(map);
    const store = useLayersStore.getState();
    store.addLayer(collection(3), { layerId: 'shown' });
    store.addLayer(collection(3), { layerId: 'hidden', visible: false });
    sync(renderer);
    expect(sourceLayers(sources)).toEqual(['shown']);

    useLayersStore.getState().setLayersVisibility({ hidden: true });
    sync(renderer);
    expect(sourceLayers(sources)).toEqual(['hidden', 'shown']);
  });

  it('frees a layer that stays hidden, and keeps one shown again in time', () => {
    const { map, sources } = fakeMap();
    const renderer = createLayerRenderer(map);
    useLayersStore.getState().addLayer(collection(2), { layerId: 'a' });
    useLayersStore.getState().addLayer(collection(2), { layerId: 'b' });
    sync(renderer);

    useLayersStore.getState().setLayersVisibility({ a: false, b: false });
    sync(renderer);
    expect(sourceLayers(sources)).toEqual(['a', 'b']); // hidden, not yet freed

    vi.advanceTimersByTime(EVICT_HIDDEN_MS / 2);
    useLayersStore.getState().setLayersVisibility({ b: true });
    sync(renderer);
    vi.advanceTimersByTime(EVICT_HIDDEN_MS);
    expect(sourceLayers(sources)).toEqual(['b']);

    renderer.destroy();
    expect(sources.size).toBe(0);
  });

  it('drops a hidden layer whose data changed instead of rebuilding it', () => {
    const { map, sources } = fakeMap();
    const renderer = createLayerRenderer(map);
    useLayersStore.getState().addLayer(collection(2), { layerId: 'a' });
    sync(renderer);
    useLayersStore.getState().setLayersVisibility({ a: false });
    useLayersStore.getState().addFeature({ type: 'Feature', geometry: { type: 'Point', coordinates: [9, 9] }, properties: {} }, { layerId: 'a' });
    sync(renderer);
    expect(sources.size).toBe(0);
  });
});
