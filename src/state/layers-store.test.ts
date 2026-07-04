import { beforeEach, describe, expect, it } from 'vitest';
import { Feature, FeatureCollection } from 'geojson';
import {
  allFeatures,
  combinedCollection,
  findFeature,
  resetLayerIdCounter,
  selectedFeature,
  useLayersStore,
} from './layers-store';

const point = (name: string, coords: [number, number] = [0, 0]): Feature => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: coords },
  properties: { name },
});

const fc = (...features: Feature[]): FeatureCollection => ({
  type: 'FeatureCollection',
  features,
});

beforeEach(() => {
  resetLayerIdCounter();
  useLayersStore.setState({
    layers: [],
    selection: null,
    hiddenFeatureIds: new Set(),
  });
});

describe('addLayer', () => {
  it('assigns sequential layer ids and stable feature ids mirrored in _fid', () => {
    const id = useLayersStore.getState().addLayer(fc(point('a'), point('b')), { name: 'Test' });
    expect(id).toBe('L1');
    const layer = useLayersStore.getState().layers[0];
    expect(layer.name).toBe('Test');
    expect(layer.features.map((f) => f.id)).toEqual(['L1/0', 'L1/1']);
    expect(layer.features[0].properties._fid).toBe('L1/0');
  });

  it('accepts a single Feature and a Feature[]', () => {
    const store = useLayersStore.getState();
    store.addLayer(point('solo'));
    store.addLayer([point('x'), point('y')]);
    const [a, b] = useLayersStore.getState().layers;
    expect(a.features).toHaveLength(1);
    expect(b.features).toHaveLength(2);
  });

  it('replaces an existing layer when the same layerId is reused', () => {
    const store = useLayersStore.getState();
    store.addLayer(fc(point('old')), { layerId: 'custom', name: 'v1' });
    store.addLayer(fc(point('new'), point('new2')), { layerId: 'custom', name: 'v2' });
    const layers = useLayersStore.getState().layers;
    expect(layers).toHaveLength(1);
    expect(layers[0].name).toBe('v2');
    expect(layers[0].features).toHaveLength(2);
  });
});

describe('replaceLayers', () => {
  it('drops all layers, selection, and hidden state', () => {
    const store = useLayersStore.getState();
    const first = store.addLayer(fc(point('a')));
    const fid = useLayersStore.getState().layers[0].features[0].id;
    store.selectFeature(fid);
    store.toggleFeatureVisibility(fid);

    store.replaceLayers(fc(point('fresh')), { name: 'Fresh' });
    const state = useLayersStore.getState();
    expect(state.layers).toHaveLength(1);
    expect(state.layers[0].id).not.toBe(first);
    expect(state.selection).toBeNull();
    expect(state.hiddenFeatureIds.size).toBe(0);
  });
});

describe('removeLayer', () => {
  it('prunes hidden ids and clears selection belonging to the removed layer', () => {
    const store = useLayersStore.getState();
    const id = store.addLayer(fc(point('a')));
    const fid = useLayersStore.getState().layers[0].features[0].id;
    store.selectFeature(fid);
    store.toggleFeatureVisibility(fid);

    store.removeLayer(id);
    const state = useLayersStore.getState();
    expect(state.layers).toHaveLength(0);
    expect(state.selection).toBeNull();
    expect(state.hiddenFeatureIds.size).toBe(0);
  });
});

describe('addFeature', () => {
  it('creates the named destination layer on demand', () => {
    const fid = useLayersStore.getState().addFeature(point('marker'), {
      layerName: 'Annotations',
      origin: 'draw',
    });
    const state = useLayersStore.getState();
    expect(state.layers).toHaveLength(1);
    expect(state.layers[0].name).toBe('Annotations');
    expect(state.layers[0].origin).toBe('draw');
    expect(fid).toBe(`${state.layers[0].id}/0`);
  });

  it('appends to an existing layer by name and increments the sequence', () => {
    const store = useLayersStore.getState();
    store.addFeature(point('one'), { layerName: 'Notes' });
    store.addFeature(point('two'), { layerName: 'Notes' });
    const layer = useLayersStore.getState().layers[0];
    expect(layer.features.map((f) => f.id)).toEqual([`${layer.id}/0`, `${layer.id}/1`]);
  });

  it('honors presetFid without consuming the sequence', () => {
    const store = useLayersStore.getState();
    const layerId = store.addLayer(fc(point('a')), { name: 'Pins' });
    store.addFeature(point('pinned'), { layerId, presetFid: 'my-id' });
    store.addFeature(point('after'), { layerId });
    const layer = useLayersStore.getState().layers[0];
    expect(layer.features.map((f) => f.id)).toEqual(['L1/0', 'my-id', 'L1/1']);
  });

  it('returns null for an explicit layerId that does not exist', () => {
    expect(useLayersStore.getState().addFeature(point('x'), { layerId: 'nope' })).toBeNull();
  });
});

describe('feature mutations', () => {
  it('updateFeatureProperties merges but preserves _fid', () => {
    const store = useLayersStore.getState();
    store.addLayer(fc(point('a')));
    const fid = useLayersStore.getState().layers[0].features[0].id;
    store.updateFeatureProperties(fid, { name: 'renamed', _fid: 'attempted-override' });
    const feature = findFeature(useLayersStore.getState().layers, fid)!.feature;
    expect(feature.properties.name).toBe('renamed');
    expect(feature.properties._fid).toBe(fid);
  });

  it('removeFeature clears selection and hidden state for that feature', () => {
    const store = useLayersStore.getState();
    store.addLayer(fc(point('a'), point('b')));
    const fid = useLayersStore.getState().layers[0].features[0].id;
    store.selectFeature(fid);
    store.toggleFeatureVisibility(fid);
    store.removeFeature(fid);
    const state = useLayersStore.getState();
    expect(state.layers[0].features).toHaveLength(1);
    expect(state.selection).toBeNull();
    expect(state.hiddenFeatureIds.has(fid)).toBe(false);
  });
});

describe('selection and visibility', () => {
  it('selectFeature resolves the owning layer; unknown ids clear selection', () => {
    const store = useLayersStore.getState();
    const layerId = store.addLayer(fc(point('a')));
    const fid = useLayersStore.getState().layers[0].features[0].id;
    store.selectFeature(fid);
    expect(useLayersStore.getState().selection).toEqual({ layerId, featureId: fid });
    store.selectFeature('does-not-exist');
    expect(useLayersStore.getState().selection).toBeNull();
  });

  it('setFeaturesVisibility batches hide/show', () => {
    const store = useLayersStore.getState();
    store.addLayer(fc(point('a'), point('b'), point('c')));
    const ids = useLayersStore.getState().layers[0].features.map((f) => f.id);
    store.setFeaturesVisibility(ids, false);
    expect(useLayersStore.getState().hiddenFeatureIds.size).toBe(3);
    store.setFeaturesVisibility(ids.slice(0, 2), true);
    expect(useLayersStore.getState().hiddenFeatureIds.size).toBe(1);
  });

  it('setLayerVisible flips the layer flag immutably', () => {
    const store = useLayersStore.getState();
    const id = store.addLayer(fc(point('a')));
    const before = useLayersStore.getState().layers[0];
    store.setLayerVisible(id, false);
    const after = useLayersStore.getState().layers[0];
    expect(after.visible).toBe(false);
    expect(after).not.toBe(before); // immutability — renderers diff by identity
    expect(after.features).toBe(before.features); // features untouched → no rebuild
  });
});

describe('helpers', () => {
  it('allFeatures / combinedCollection / selectedFeature', () => {
    const store = useLayersStore.getState();
    store.addLayer(fc(point('a')));
    store.addLayer(fc(point('b'), point('c')));
    const state = useLayersStore.getState();
    expect(allFeatures(state.layers)).toHaveLength(3);
    const combined = combinedCollection(state.layers);
    expect(combined.type).toBe('FeatureCollection');

    const fid = state.layers[1].features[1].id;
    state.selectFeature(fid);
    expect(selectedFeature(useLayersStore.getState())!.id).toBe(fid);
  });
});
