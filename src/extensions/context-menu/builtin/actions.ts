import { contextMenuRegistry } from '../registry';
import { useLayersStore } from '@/state/layers-store';
import { useToolsStore } from '@/state/tools-store';
import { useUiStore } from '@/state/ui-store';

function formatDatetime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function registerBuiltinContextMenuActions(): void {
  // --- Always available (no feature required) ---

  contextMenuRegistry.register({
    id: 'add-marker',
    label: 'Add Marker',
    group: 'edit',
    order: 0,
    isVisible: (ctx) => !ctx.isEmbed,
    execute: (ctx) => {
      useLayersStore.getState().addFeature(
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [ctx.lngLat.lng, ctx.lngLat.lat] },
          properties: { name: `Marker_${formatDatetime()}` },
        },
        { layerName: 'Annotations', origin: 'draw' },
      );
    },
  });

  contextMenuRegistry.register({
    id: 'measure-distance',
    label: 'Measure Distance',
    group: 'edit',
    order: 1,
    execute: (ctx) => {
      const tools = useToolsStore.getState();
      tools.clearMeasurePoints();
      tools.setActiveTool('measure');
      tools.addMeasurePoint({ lng: ctx.lngLat.lng, lat: ctx.lngLat.lat });
      useUiStore.getState().setActivePanel('measure');
    },
  });

  // --- Feature actions ---

  contextMenuRegistry.register({
    id: 'zoom-to-feature',
    label: 'Zoom to Feature',
    group: 'navigate',
    order: 0,
    isVisible: (ctx) => ctx.feature !== null,
    execute: (ctx) => {
      if (!ctx.feature) return;
      useUiStore.getState().requestFocus({ kind: 'feature', featureId: ctx.feature.id });
    },
  });

  contextMenuRegistry.register({
    id: 'view-properties',
    label: 'View Properties',
    group: 'data',
    order: 0,
    isVisible: (ctx) => ctx.feature !== null,
    execute: (ctx) => {
      if (!ctx.feature) return;
      useUiStore.getState().showProperties(ctx.feature.id);
    },
  });

  contextMenuRegistry.register({
    id: 'copy-geojson',
    label: 'Copy as GeoJSON',
    group: 'data',
    order: 1,
    isVisible: (ctx) => ctx.feature !== null && !ctx.isEmbed,
    execute: (ctx) => {
      if (!ctx.feature) return;
      const cleanProps: Record<string, unknown> = { ...ctx.feature.properties };
      delete cleanProps._fid;
      const clean = {
        type: 'Feature' as const,
        geometry: ctx.feature.geometry,
        properties: cleanProps,
      };
      navigator.clipboard.writeText(JSON.stringify(clean, null, 2));
    },
  });

  contextMenuRegistry.register({
    id: 'delete-feature',
    label: 'Delete Feature',
    group: 'danger',
    order: 0,
    isVisible: (ctx) => ctx.feature !== null && !ctx.isEmbed,
    execute: (ctx) => {
      if (!ctx.feature) return;
      useLayersStore.getState().removeFeature(ctx.feature.id);
    },
  });
}
