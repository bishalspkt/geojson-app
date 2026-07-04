import { beforeEach, describe, expect, it } from 'vitest';
import { Feature } from 'geojson';
import { resetLayerIdCounter, useLayersStore } from '@/state/layers-store';
import { useUiStore } from '@/state/ui-store';
import {
  geojsonDataProvider,
  geojsonTextProvider,
} from './builtin/geojson';
import { ingest, registerSourceProvider, toFeatureCollection } from './registry';

const point = (name: string): Feature => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [10, 20] },
  properties: { name },
});

// Module-level provider registry persists across tests; the built-ins we
// register here are exactly what main.tsx registers in the app.
registerSourceProvider(geojsonDataProvider);
registerSourceProvider(geojsonTextProvider);

beforeEach(() => {
  resetLayerIdCounter();
  useLayersStore.setState({ layers: [], selection: null, hiddenFeatureIds: new Set() });
  useUiStore.setState({ focusRequest: null });
});

describe('toFeatureCollection', () => {
  it('passes FeatureCollections through and wraps single Features', () => {
    const f = point('a');
    expect(toFeatureCollection({ type: 'FeatureCollection', features: [f] }).features).toHaveLength(1);
    expect(toFeatureCollection(f)).toEqual({ type: 'FeatureCollection', features: [f] });
  });

  it('rejects non-GeoJSON input with a readable error', () => {
    expect(() => toFeatureCollection(null)).toThrow('Not a GeoJSON object');
    expect(() => toFeatureCollection({ type: 'Polygon' })).toThrow('Unsupported GeoJSON type');
  });
});

describe('ingest', () => {
  it('adds a layer from parsed data and requests a camera fit', async () => {
    const result = await ingest(
      { kind: 'data', data: { type: 'FeatureCollection', features: [point('a')] }, name: 'Set' },
      { origin: 'sdk' },
    );
    expect(result.featureCount).toBe(1);
    const state = useLayersStore.getState();
    expect(state.layers).toHaveLength(1);
    expect(state.layers[0].origin).toBe('sdk');
    const focus = useUiStore.getState().focusRequest;
    expect(focus?.target.kind).toBe('bounds');
  });

  it('replace mode drops previous layers; fit:false leaves the camera alone', async () => {
    await ingest({ kind: 'data', data: point('old') }, {});
    useUiStore.setState({ focusRequest: null });
    await ingest({ kind: 'data', data: point('new'), name: 'Only' }, { replace: true, fit: false });
    const state = useLayersStore.getState();
    expect(state.layers).toHaveLength(1);
    expect(state.layers[0].name).toBe('Only');
    expect(useUiStore.getState().focusRequest).toBeNull();
  });

  it('parses JSON strings through the text provider', async () => {
    const raw = JSON.stringify({ type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] }, properties: {} });
    const result = await ingest({ kind: 'text', text: raw }, {});
    expect(result.featureCount).toBe(1);
  });

  it('throws when no provider can handle the input', async () => {
    await expect(ingest({ kind: 'url', url: 'https://example.com/x.geojson' })).rejects.toThrow(
      /no source provider/i,
    );
  });

  it('surfaces provider parse errors', async () => {
    await expect(ingest({ kind: 'text', text: '{not json' })).rejects.toThrow();
  });

  it('does not emit a focus request for empty collections', async () => {
    await ingest({ kind: 'data', data: { type: 'FeatureCollection', features: [] } }, {});
    expect(useUiStore.getState().focusRequest).toBeNull();
  });
});
