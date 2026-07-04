import maplibregl from 'maplibre-gl';
import { shallow } from 'zustand/shallow';
import { IdentifiedFeature } from '@/types';
import { useLayersStore, findFeature, selectedFeature } from '@/state/layers-store';
import { useSettingsStore } from '@/state/settings-store';
import { useToolsStore } from '@/state/tools-store';
import { useUiStore } from '@/state/ui-store';
import { buildBasemapStyle } from './basemap/style';
import { createLayerRenderer } from './layers/renderer';
import { attachLayerInteractions, queryDataFeatures } from './layers/interactions';
import { ensureHighlightOverlay, setHighlightedFeature, HIGHLIGHT_LAYER_IDS } from './overlays/highlight';
import { ensureMeasureOverlay, setMeasurePoints, MEASURE_LAYER_IDS } from './overlays/measure';
import { LOCATE_LAYER_IDS } from './overlays/locate';
import { executeFocus, FocusPadding } from './camera/focus';
import { MapTool } from './tools';

export const CONTEXT_MENU_EVENT = 'geojson-context-menu';

/** Payload dispatched on window when the user right-clicks the map. */
export interface MapContextMenuContext {
  feature: IdentifiedFeature | null;
  lngLat: { lng: number; lat: number };
  isEmbed: boolean;
}

export interface MapEngineOptions {
  embedEnabled: boolean;
  /** Embed with chrome=full keeps a left panel open; focus padding accounts for it. */
  embedChromeFull: boolean;
  /** Dispatch right-click context-menu events. */
  enableContextMenu: boolean;
  /** Embed + interactive: plain clicks on features also open the context menu. */
  embedClickContextMenu: boolean;
  /** Resolve an active tool id to its definition (from the tools registry). */
  resolveTool?: (id: string) => MapTool | undefined;
}

function featurePadding(map: maplibregl.Map, opts: MapEngineOptions): FocusPadding {
  const w = map.getContainer().clientWidth;
  const h = map.getContainer().clientHeight;
  if (opts.embedEnabled && opts.embedChromeFull) {
    return { top: 60, right: 60, bottom: 60, left: 60 + Math.min(280, w * 0.4) };
  }
  if (w < 640) {
    // Mobile: the layers panel occupies the bottom half; keep the target visible above it.
    return { top: 60, right: 40, bottom: Math.round(h * 0.5) + 60, left: 40 };
  }
  return 60;
}

function boundsPadding(map: maplibregl.Map, opts: MapEngineOptions): FocusPadding {
  const w = map.getContainer().clientWidth;
  if (opts.embedEnabled && opts.embedChromeFull) {
    return { top: 100, right: 100, bottom: 100, left: 100 + Math.min(280, w * 0.4) };
  }
  return 100;
}

/**
 * Binds the zustand stores to a live MapLibre map: layer rendering, selection
 * highlight, measure overlay, theme/projection swaps, camera focus requests,
 * pointer interactions, tools, and context-menu dispatch.
 *
 * Returns a cleanup function. This module is framework-agnostic — it uses the
 * stores' vanilla subscribe/getState API only.
 */
export function startMapEngine(map: maplibregl.Map, opts: MapEngineOptions): () => void {
  const renderer = createLayerRenderer(map);
  const cleanups: (() => void)[] = [() => renderer.destroy()];

  const raiseSystemOverlays = () => {
    for (const id of [...HIGHLIGHT_LAYER_IDS, ...MEASURE_LAYER_IDS, ...LOCATE_LAYER_IDS]) {
      if (map.getLayer(id)) map.moveLayer(id);
    }
  };
  renderer.onMutation = raiseSystemOverlays;

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

  const syncMeasure = () => {
    setMeasurePoints(map, useToolsStore.getState().measurePoints);
  };

  // --- Initial paint ---
  map.setProjection({ type: useSettingsStore.getState().projection });
  ensureHighlightOverlay(map);
  ensureMeasureOverlay(map);
  syncLayers();
  syncHighlight();
  syncMeasure();

  // --- Data layers ---
  cleanups.push(
    useLayersStore.subscribe(
      (s) => [s.layers, s.hiddenFeatureIds] as const,
      () => {
        syncLayers();
        syncHighlight();
      },
      { equalityFn: shallow },
    ),
  );

  // --- Selection highlight ---
  cleanups.push(useLayersStore.subscribe((s) => s.selection, syncHighlight));

  // --- Measure overlay ---
  cleanups.push(useToolsStore.subscribe((s) => s.measurePoints, syncMeasure));

  // --- Theme (basemap style swap preserves data + overlays) ---
  cleanups.push(
    useSettingsStore.subscribe(
      (s) => s.theme,
      (theme) => {
        // Register BEFORE setStyle — for inline styles 'style.load' can fire
        // within the setStyle call itself.
        map.once('style.load', () => {
          map.setProjection({ type: useSettingsStore.getState().projection });
          ensureHighlightOverlay(map);
          ensureMeasureOverlay(map);
          renderer.reset();
          syncLayers();
          syncHighlight();
          syncMeasure();
        });
        map.setStyle(buildBasemapStyle(theme));
      },
    ),
  );

  // --- Projection ---
  cleanups.push(
    useSettingsStore.subscribe(
      (s) => s.projection,
      (projection) => map.setProjection({ type: projection }),
    ),
  );

  // --- Camera focus requests ---
  cleanups.push(
    useUiStore.subscribe(
      (s) => s.focusRequest,
      (request) => {
        if (!request) return;
        const padding =
          request.target.kind === 'bounds'
            ? boundsPadding(map, opts)
            : featurePadding(map, opts);
        executeFocus(
          map,
          request.target,
          (fid) => findFeature(useLayersStore.getState().layers, fid)?.feature ?? null,
          { padding },
        );
      },
    ),
  );

  // --- Pointer interactions (hover + select) ---
  cleanups.push(
    attachLayerInteractions(map, {
      getLayers: () => useLayersStore.getState().layers,
      isSuppressed: () => useToolsStore.getState().activeTool !== null,
      onFeatureClick: (fid) => {
        const { selection, selectFeature } = useLayersStore.getState();
        selectFeature(selection?.featureId === fid ? null : fid);
      },
    }),
  );

  // --- Context menu ---
  if (opts.enableContextMenu) {
    const dispatchContextMenu = (e: maplibregl.MapMouseEvent, featureOnly: boolean) => {
      if (useToolsStore.getState().activeTool !== null) return;
      const layers = useLayersStore.getState().layers;
      const hit = queryDataFeatures(map, layers, e.point)[0];
      const fid = hit?.properties?._fid as string | undefined;
      const feature = fid ? (findFeature(layers, fid)?.feature ?? null) : null;

      if (featureOnly && !feature) return;
      e.preventDefault();

      const detail = {
        x: e.originalEvent.clientX,
        y: e.originalEvent.clientY,
        context: {
          feature,
          lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat },
          isEmbed: opts.embedEnabled,
        } satisfies MapContextMenuContext,
      };
      window.dispatchEvent(new CustomEvent(CONTEXT_MENU_EVENT, { detail }));
    };

    const onContextMenu = (e: maplibregl.MapMouseEvent) => dispatchContextMenu(e, false);
    map.on('contextmenu', onContextMenu);
    cleanups.push(() => map.off('contextmenu', onContextMenu));

    if (opts.embedClickContextMenu) {
      const onEmbedClick = (e: maplibregl.MapMouseEvent) => dispatchContextMenu(e, true);
      map.on('click', onEmbedClick);
      cleanups.push(() => map.off('click', onEmbedClick));
    }
  }

  // --- Tools (exclusive pointer modes) ---
  let activeToolDef: MapTool | undefined;
  const onToolClick = (e: maplibregl.MapMouseEvent) => {
    activeToolDef?.onMapClick?.({ lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat } }, { map });
  };
  map.on('click', onToolClick);
  cleanups.push(() => map.off('click', onToolClick));

  const applyTool = (toolId: string | null) => {
    if (activeToolDef) {
      activeToolDef.onDeactivate?.({ map });
      map.getCanvas().style.cursor = '';
      activeToolDef = undefined;
    }
    if (toolId) {
      activeToolDef = opts.resolveTool?.(toolId);
      if (activeToolDef) {
        map.getCanvas().style.cursor = activeToolDef.cursor ?? 'crosshair';
        activeToolDef.onActivate?.({ map });
      }
    }
  };
  applyTool(useToolsStore.getState().activeTool);
  cleanups.push(useToolsStore.subscribe((s) => s.activeTool, applyTool));
  cleanups.push(() => applyTool(null));

  return () => {
    for (const cleanup of cleanups.reverse()) cleanup();
  };
}
