import { beforeEach, describe, expect, it } from 'vitest';
import { resetLayerIdCounter, useLayersStore } from '@/state/layers-store';
import { useSettingsStore, DEFAULT_SETTINGS } from '@/state/settings-store';
import { useUiStore } from '@/state/ui-store';
import { registerSourceProvider } from '@/extensions/sources/registry';
import { geojsonDataProvider } from '@/extensions/sources/builtin/geojson';
import { executeCommand, resetExecutorState, PRIMARY_LAYER_ID } from './executor';
import { isCommandName, COMMAND_NAMES } from './commands';

registerSourceProvider(geojsonDataProvider);

const FC = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [85.32, 27.71] }, properties: { name: 'KTM' } },
  ],
};

beforeEach(() => {
  resetLayerIdCounter();
  resetExecutorState();
  useLayersStore.setState({ layers: [], selection: null, hiddenFeatureIds: new Set() });
  useSettingsStore.setState({ ...DEFAULT_SETTINGS });
  useUiStore.setState({ focusRequest: null });
});

describe('command schema', () => {
  it('isCommandName accepts every declared command and rejects others', () => {
    for (const name of COMMAND_NAMES) expect(isCommandName(name)).toBe(true);
    expect(isCommandName('destroyEverything')).toBe(false);
  });
});

describe('appearance commands', () => {
  it('setTheme validates against the theme list', async () => {
    await executeCommand('setTheme', { theme: 'dark' });
    expect(useSettingsStore.getState().theme).toBe('dark');
    await expect(executeCommand('setTheme', { theme: 'chartreuse' })).rejects.toThrow(
      'setTheme: invalid theme "chartreuse"',
    );
  });

  it('setProjection validates', async () => {
    await executeCommand('setProjection', { projection: 'globe' });
    expect(useSettingsStore.getState().projection).toBe('globe');
    await expect(executeCommand('setProjection', { projection: 'flat-earth' })).rejects.toThrow();
  });
});

describe('camera commands without a live map', () => {
  it('reject with "Map not ready"', async () => {
    await expect(executeCommand('flyTo', { center: [0, 0] })).rejects.toThrow('Map not ready');
    await expect(executeCommand('getZoom', {})).rejects.toThrow('Map not ready');
  });
});

describe('data commands', () => {
  it('setGeoJSON creates the reserved primary layer and auto-fits', async () => {
    await executeCommand('setGeoJSON', { data: FC });
    const layers = useLayersStore.getState().layers;
    expect(layers).toHaveLength(1);
    expect(layers[0].id).toBe(PRIMARY_LAYER_ID);
    expect(useUiStore.getState().focusRequest?.target.kind).toBe('bounds');

    // Calling again replaces the primary in place.
    await executeCommand('setGeoJSON', { data: FC });
    expect(useLayersStore.getState().layers).toHaveLength(1);
  });

  it('addLayer with id "primary" can never collide with the reserved primary layer', async () => {
    await executeCommand('setGeoJSON', { data: FC });
    await executeCommand('addLayer', { id: 'primary', data: FC });
    const layers = useLayersStore.getState().layers;
    expect(layers).toHaveLength(2);
    expect(layers.map((l) => l.id)).toContain(PRIMARY_LAYER_ID);
    expect(layers.map((l) => l.id)).toContain('sdk-primary');

    // clearLayers removes only caller layers, never the primary dataset.
    await executeCommand('clearLayers', {});
    const after = useLayersStore.getState().layers;
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe(PRIMARY_LAYER_ID);
  });

  it('addLayer applies paint overrides and listLayers reports caller ids', async () => {
    await executeCommand('addLayer', {
      id: 'route',
      data: FC,
      paint: { 'circle-color': '#ff5722' },
      name: 'My Route',
    });
    const layer = useLayersStore.getState().layers[0];
    expect(layer.paint).toEqual({ 'circle-color': '#ff5722' });

    const listed = (await executeCommand('listLayers', {})) as { id: string; name: string }[];
    expect(listed).toEqual([
      expect.objectContaining({ id: 'route', name: 'My Route', origin: 'sdk', featureCount: 1, visible: true }),
    ]);
  });

  it('addLayer validates required args', async () => {
    await expect(executeCommand('addLayer', { data: FC })).rejects.toThrow('addLayer: id is required');
    await expect(executeCommand('addLayer', { id: 'x' })).rejects.toThrow('addLayer: data is required');
  });

  it('removeLayer removes by caller id', async () => {
    await executeCommand('addLayer', { id: 'route', data: FC });
    await executeCommand('removeLayer', { id: 'route' });
    expect(useLayersStore.getState().layers).toHaveLength(0);
  });

  it('setLayerVisibility resolves caller ids and rejects unknown layers', async () => {
    await executeCommand('addLayer', { id: 'route', data: FC });
    await executeCommand('setLayerVisibility', { id: 'route', visible: false });
    expect(useLayersStore.getState().layers[0].visible).toBe(false);

    await expect(executeCommand('setLayerVisibility', { id: 'ghost', visible: true })).rejects.toThrow(
      'unknown layer',
    );
    await expect(executeCommand('setLayerVisibility', { id: 'route', visible: 'yes' })).rejects.toThrow(
      'visible must be boolean',
    );
  });
});
