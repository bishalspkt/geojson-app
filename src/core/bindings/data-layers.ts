import type * as maplibregl from 'maplibre-gl';
import { shallow } from 'zustand/shallow';
import { useLayersStore, selectedFeature } from '@/state/layers-store';
import { useToolsStore } from '@/state/tools-store';
import { useTimeStore } from '@/state/time-store';
import { createLayerRenderer } from '../layers/renderer';
import { ensureHighlightOverlay, setHighlightedFeature, HIGHLIGHT_LAYER_IDS } from '../overlays/highlight';
import { ensureMeasureOverlay, setMeasurePoints, MEASURE_LAYER_IDS } from '../overlays/measure';
import { LOCATE_LAYER_IDS } from '../overlays/locate';
import { currentRenderTime, derivedTimeExtent } from '../time/render-time';
import { startTimePlayer } from '../time/player';
import type { EngineBinding } from './types';

/**
 * Data layers, the selection highlight, the measure overlay, and timeline
 * playback (time filters, pulses and track trails are part of the renderer).
 */
export function bindDataLayers(map: maplibregl.Map, opts: { isDark: () => boolean }): EngineBinding {
  const renderer = createLayerRenderer(map, { isDark: opts.isDark });

  const raiseSystemOverlays = () => {
    for (const id of [...HIGHLIGHT_LAYER_IDS, ...MEASURE_LAYER_IDS, ...LOCATE_LAYER_IDS]) {
      if (map.getLayer(id)) map.moveLayer(id);
    }
  };

  const syncLayers = () => {
    const { layers, hiddenFeatureIds } = useLayersStore.getState();
    renderer.sync(layers, hiddenFeatureIds);
    raiseSystemOverlays();
  };

  const syncHighlight = () => {
    const state = useLayersStore.getState();
    const feature = selectedFeature(state);
    const hidden = feature ? state.hiddenFeatureIds.has(feature.id) : false;
    setHighlightedFeature(map, hidden ? null : feature);
  };

  const syncMeasure = () => setMeasurePoints(map, useToolsStore.getState().measurePoints);
  const syncTime = () => renderer.setTime(currentRenderTime());
  const syncDerivedExtent = () =>
    useTimeStore.getState().setDerivedExtent(derivedTimeExtent(useLayersStore.getState().layers));

  const paint = () => {
    ensureHighlightOverlay(map);
    ensureMeasureOverlay(map);
    syncTime();
    syncLayers();
    syncHighlight();
    syncMeasure();
  };

  syncDerivedExtent();
  paint();

  const cleanups = [
    useLayersStore.subscribe(
      (s) => [s.layers, s.hiddenFeatureIds] as const,
      () => {
        syncDerivedExtent();
        syncLayers();
        syncHighlight();
      },
      { equalityFn: shallow },
    ),
    useLayersStore.subscribe((s) => s.selection, syncHighlight),
    useToolsStore.subscribe((s) => s.measurePoints, syncMeasure),
    useTimeStore.subscribe((s) => [s.enabled, s.current, s.window, s.extent] as const, syncTime, {
      equalityFn: shallow,
    }),
    startTimePlayer(),
  ];

  return {
    restyle() {
      renderer.reset();
      paint();
    },
    destroy() {
      for (const c of cleanups) c();
      renderer.destroy();
    },
  };
}
