import { contextMenuRegistry, ContextMenuContext } from './context-menu-registry';
import { getBoundingBox } from '@/lib/map-utils';

function formatDatetime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function registerBuiltinActions(): void {
  // --- Actions that always appear (no feature required) ---

  contextMenuRegistry.register({
    id: 'add-marker',
    label: 'Add Marker',
    group: 'edit',
    order: 0,
    isVisible: (ctx) => !ctx.isEmbed,
    execute: (ctx: ContextMenuContext) => {
      const name = `Marker_${formatDatetime()}`;
      ctx.actions.addFeature({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ctx.lngLat.lng, ctx.lngLat.lat] },
        properties: { name },
      });
    },
  });

  contextMenuRegistry.register({
    id: 'measure-distance',
    label: 'Measure Distance',
    group: 'edit',
    order: 1,
    execute: (ctx: ContextMenuContext) => {
      ctx.actions.clearMeasurePoints();
      ctx.actions.setMeasuring(true);
      ctx.actions.addMeasurePoint({ lng: ctx.lngLat.lng, lat: ctx.lngLat.lat });
    },
  });

  // --- Actions that require a feature ---

  contextMenuRegistry.register({
    id: 'zoom-to-feature',
    label: 'Zoom to Feature',
    group: 'navigate',
    order: 0,
    isVisible: (ctx) => ctx.feature !== null,
    execute: (ctx: ContextMenuContext) => {
      if (!ctx.mapInstance || !ctx.feature) return;
      const bbox = getBoundingBox(ctx.feature);
      ctx.mapInstance.fitBounds(bbox, { padding: 60, maxZoom: 15, maxDuration: 2000 });
    },
  });

  contextMenuRegistry.register({
    id: 'copy-properties',
    label: 'Copy Properties',
    group: 'data',
    order: 0,
    isVisible: (ctx) => ctx.feature !== null && !ctx.isEmbed,
    execute: (ctx: ContextMenuContext) => {
      if (!ctx.feature) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props: Record<string, any> = { ...ctx.feature.properties };
      delete props._fid;
      delete props._featureIndex;
      navigator.clipboard.writeText(JSON.stringify(props, null, 2));
    },
  });

  contextMenuRegistry.register({
    id: 'copy-geojson',
    label: 'Copy as GeoJSON',
    group: 'data',
    order: 1,
    isVisible: (ctx) => ctx.feature !== null && !ctx.isEmbed,
    execute: (ctx: ContextMenuContext) => {
      if (!ctx.feature) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cleanProps: Record<string, any> = { ...ctx.feature.properties };
      delete cleanProps._fid;
      delete cleanProps._featureIndex;
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
    execute: (ctx: ContextMenuContext) => {
      if (!ctx.feature) return;
      ctx.actions.removeFeature(ctx.feature.id);
    },
  });
}
