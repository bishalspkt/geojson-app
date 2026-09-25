import { beforeEach, describe, expect, it } from 'vitest';
import { resetLayerIdCounter, useLayersStore } from '@/state/layers-store';
import { useSettingsStore, DEFAULT_SETTINGS } from '@/state/settings-store';
import { useUiStore } from '@/state/ui-store';
import { useImageryStore } from '@/state/imagery-store';
import { useCompareStore } from '@/state/compare-store';
import { useTimeStore } from '@/state/time-store';
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

describe('imagery, terrain, time and compare commands', () => {
  beforeEach(() => {
    useImageryStore.setState({ layers: [] });
    useCompareStore.getState().stop();
    useTimeStore.setState({ enabled: false, extent: null, extentLocked: false, playing: false, window: null });
  });

  it('addImagery validates and namespaces caller ids; listImagery reports them back', async () => {
    await executeCommand('addImagery', {
      id: 'sat',
      tiles: ['https://tiles.example/{time}/{z}/{x}/{y}.jpg'],
      opacity: 0.6,
      time: { format: 'date', default: '2024-10-05' },
    });
    const layer = useImageryStore.getState().layers[0];
    expect(layer).toMatchObject({ id: 'sdk-sat', origin: 'sdk', opacity: 0.6 });
    expect(layer.time).toEqual({ format: 'date', default: '2024-10-05' });
    expect(await executeCommand('listImagery', {})).toEqual([
      { id: 'sat', name: 'sat', origin: 'sdk', visible: true, opacity: 0.6 },
    ]);
    await expect(executeCommand('addImagery', { id: 'x', tiles: ['javascript:alert(1)'] })).rejects.toThrow(
      'http(s)',
    );
    await expect(executeCommand('addImagery', { id: 'x', url: 'https://a/b.png' })).rejects.toThrow('corners');
    await executeCommand('removeImagery', { id: 'sat' });
    expect(useImageryStore.getState().layers).toHaveLength(0);
  });

  it('setTerrain toggles terrain with hillshade following by default', async () => {
    await executeCommand('setTerrain', { enabled: true, exaggeration: 2 });
    expect(useSettingsStore.getState()).toMatchObject({ terrain: true, terrainExaggeration: 2, hillshade: true });
    await executeCommand('setTerrain', { enabled: false });
    expect(useSettingsStore.getState()).toMatchObject({ terrain: false, hillshade: false });
    await expect(executeCommand('setTerrain', { enabled: 'yes' })).rejects.toThrow();
  });

  it('setTime configures, locks the extent, and plays', async () => {
    await executeCommand('setTime', {
      start: '2024-09-27',
      end: '2024-09-29',
      current: '2024-09-28',
      window: 3_600_000,
      timeZone: 'Asia/Kathmandu',
      playing: true,
    });
    const t = useTimeStore.getState();
    expect(t).toMatchObject({ enabled: true, extentLocked: true, window: 3_600_000, playing: true });
    expect(t.extent).toEqual([Date.UTC(2024, 8, 27), Date.UTC(2024, 8, 29)]);
    expect(t.current).toBe(Date.UTC(2024, 8, 28));
    await expect(executeCommand('setTime', { start: '2024-09-29', end: '2024-09-27' })).rejects.toThrow(
      'start < end',
    );
    await executeCommand('setTime', { enabled: false });
    expect(useTimeStore.getState().enabled).toBe(false);
  });

  it('setCompare resolves caller imagery ids and rejects unknown ones', async () => {
    await executeCommand('addImagery', { id: 'before', tiles: ['https://t.example/{z}/{x}/{y}.png'] });
    await executeCommand('setCompare', { left: 'before', leftLabel: '2023', position: 0.3 });
    expect(useCompareStore.getState()).toMatchObject({ active: true, left: ['sdk-before'], leftLabel: '2023', position: 0.3 });
    await expect(executeCommand('setCompare', { left: 'ghost' })).rejects.toThrow('unknown imagery');
    await executeCommand('setCompare', { enabled: false });
    expect(useCompareStore.getState().active).toBe(false);
  });

  it('story commands validate input', async () => {
    await expect(executeCommand('loadStory', { url: 'javascript:1' })).rejects.toThrow('http(s)');
    await expect(executeCommand('setStoryChapter', { chapter: 1 })).rejects.toThrow('is a story open');
  });
});
