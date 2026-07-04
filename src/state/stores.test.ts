import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from './ui-store';
import { useToolsStore } from './tools-store';
import { useSettingsStore, DEFAULT_SETTINGS } from './settings-store';

beforeEach(() => {
  useUiStore.setState({ activePanel: null, focusRequest: null, propertiesFeatureId: null });
  useToolsStore.setState({ activeTool: null, measurePoints: [] });
  useSettingsStore.setState({ ...DEFAULT_SETTINGS });
});

describe('ui store', () => {
  it('togglePanel opens and closes exclusively', () => {
    const ui = useUiStore.getState();
    ui.togglePanel('layers');
    expect(useUiStore.getState().activePanel).toBe('layers');
    ui.togglePanel('layers');
    expect(useUiStore.getState().activePanel).toBeNull();
  });

  it('requestFocus issues monotonically increasing sequence numbers', () => {
    const ui = useUiStore.getState();
    ui.requestFocus({ kind: 'feature', featureId: 'L1/0' });
    const first = useUiStore.getState().focusRequest!.seq;
    ui.requestFocus({ kind: 'feature', featureId: 'L1/0' });
    const second = useUiStore.getState().focusRequest!.seq;
    expect(second).toBeGreaterThan(first); // same target twice must still re-fire
  });
});

describe('tools store', () => {
  it('leaving measure mode discards in-progress points', () => {
    const tools = useToolsStore.getState();
    tools.setActiveTool('measure');
    tools.addMeasurePoint({ lng: 0, lat: 0 });
    tools.addMeasurePoint({ lng: 1, lat: 1 });
    expect(useToolsStore.getState().measurePoints).toHaveLength(2);

    tools.setActiveTool(null);
    expect(useToolsStore.getState().measurePoints).toHaveLength(0);
  });

  it('re-activating the same tool keeps points', () => {
    const tools = useToolsStore.getState();
    tools.setActiveTool('measure');
    tools.addMeasurePoint({ lng: 0, lat: 0 });
    tools.setActiveTool('measure');
    expect(useToolsStore.getState().measurePoints).toHaveLength(1);
  });
});

describe('settings store', () => {
  it('setSettings merges partial updates', () => {
    const settings = useSettingsStore.getState();
    settings.setSettings({ theme: 'dark' });
    expect(useSettingsStore.getState().theme).toBe('dark');
    expect(useSettingsStore.getState().projection).toBe(DEFAULT_SETTINGS.projection);
    settings.setProjection('globe');
    expect(useSettingsStore.getState().projection).toBe('globe');
  });
});
