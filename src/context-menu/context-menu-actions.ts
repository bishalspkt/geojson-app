import { contextMenuRegistry, ContextMenuContext } from './context-menu-registry';
import { getBoundingBox } from '@/lib/map-utils';

export function registerBuiltinActions(): void {
  contextMenuRegistry.register({
    id: 'zoom-to-feature',
    label: 'Zoom to Feature',
    group: 'navigate',
    order: 0,
    execute: (ctx: ContextMenuContext) => {
      if (!ctx.mapInstance) return;
      const bbox = getBoundingBox(ctx.feature);
      ctx.mapInstance.fitBounds(bbox, { padding: 60, maxZoom: 15, maxDuration: 2000 });
    },
  });

  contextMenuRegistry.register({
    id: 'copy-properties',
    label: 'Copy Properties',
    group: 'data',
    order: 0,
    execute: (ctx: ContextMenuContext) => {
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
    execute: (ctx: ContextMenuContext) => {
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
    execute: (ctx: ContextMenuContext) => {
      ctx.actions.removeFeature(ctx.feature.id);
    },
  });
}
