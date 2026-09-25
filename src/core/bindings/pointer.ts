import type * as maplibregl from 'maplibre-gl';
import { CONTEXT_MENU_EVENT, type MapContextMenuContext } from '../events';
import { findFeature, useLayersStore } from '@/state/layers-store';
import { useToolsStore } from '@/state/tools-store';
import { useUiStore } from '@/state/ui-store';
import { attachLayerInteractions, queryDataFeatures } from '../layers/interactions';
import type { MapTool } from '../tools';
import type { EngineBinding } from './types';

export { CONTEXT_MENU_EVENT } from '../events';
export type { MapContextMenuContext } from '../events';

export interface PointerBindingOptions {
  isEmbed: boolean;
  /** Dispatch right-click context-menu events. */
  contextMenu: boolean;
  /** Plain clicks on features also open the context menu (interactive embeds). */
  clickOpensContextMenu: boolean;
  /** Resolve an active tool id to its definition (from the tools registry). */
  resolveTool?: (id: string) => MapTool | undefined;
}

/** Hover, click-to-select, the context menu, and exclusive tools (measure, …). */
export function bindPointer(map: maplibregl.Map, opts: PointerBindingOptions): EngineBinding {
  const cleanups: (() => void)[] = [];
  const toolActive = () => useToolsStore.getState().activeTool !== null;

  cleanups.push(
    attachLayerInteractions(map, {
      getLayers: () => useLayersStore.getState().layers,
      isSuppressed: toolActive,
      onFeatureClick: (fid) => {
        const { selection, selectFeature } = useLayersStore.getState();
        selectFeature(selection?.featureId === fid ? null : fid);
      },
      onHover: (fid, point) => {
        useUiStore.getState().setHover(fid && point ? { featureId: fid, x: point.x, y: point.y } : null);
      },
    }),
  );

  if (opts.contextMenu) {
    const dispatch = (e: maplibregl.MapMouseEvent, featureOnly: boolean) => {
      if (toolActive()) return;
      const layers = useLayersStore.getState().layers;
      const fid = queryDataFeatures(map, layers, e.point)[0]?.properties?._fid as string | undefined;
      const feature = fid ? (findFeature(layers, fid)?.feature ?? null) : null;
      if (featureOnly && !feature) return;
      e.preventDefault();
      const context: MapContextMenuContext = {
        feature,
        lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat },
        isEmbed: opts.isEmbed,
      };
      window.dispatchEvent(
        new CustomEvent(CONTEXT_MENU_EVENT, {
          detail: { x: e.originalEvent.clientX, y: e.originalEvent.clientY, context },
        }),
      );
    };
    const onContextMenu = (e: maplibregl.MapMouseEvent) => dispatch(e, false);
    map.on('contextmenu', onContextMenu);
    cleanups.push(() => map.off('contextmenu', onContextMenu));
    if (opts.clickOpensContextMenu) {
      const onClick = (e: maplibregl.MapMouseEvent) => dispatch(e, true);
      map.on('click', onClick);
      cleanups.push(() => map.off('click', onClick));
    }
  }

  // --- Tools (exclusive pointer modes) ---
  let tool: MapTool | undefined;
  const onToolClick = (e: maplibregl.MapMouseEvent) => {
    tool?.onMapClick?.({ lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat } }, { map });
  };
  map.on('click', onToolClick);
  cleanups.push(() => map.off('click', onToolClick));

  const applyTool = (toolId: string | null) => {
    if (tool) {
      tool.onDeactivate?.({ map });
      map.getCanvas().style.cursor = '';
      tool = undefined;
    }
    if (toolId) {
      tool = opts.resolveTool?.(toolId);
      if (tool) {
        map.getCanvas().style.cursor = tool.cursor ?? 'crosshair';
        tool.onActivate?.({ map });
      }
    }
  };
  applyTool(useToolsStore.getState().activeTool);
  cleanups.push(useToolsStore.subscribe((s) => s.activeTool, applyTool));
  cleanups.push(() => applyTool(null));

  return {
    destroy() {
      for (const c of cleanups.reverse()) c();
    },
  };
}
