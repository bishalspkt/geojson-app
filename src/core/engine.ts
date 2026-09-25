import type * as maplibregl from 'maplibre-gl';
import { isDarkTheme } from './basemap/theme';
import { useSettingsStore } from '@/state/settings-store';
import { buildBasemapStyle } from './basemap/style';
import { installStyleImageResolver } from './basemap/sprites';
import { bindDataLayers } from './bindings/data-layers';
import { bindImagery } from './bindings/imagery';
import { bindTerrain } from './bindings/terrain';
import { bindChaseCamera } from './bindings/chase';
import { bindCamera } from './bindings/camera';
import { bindPointer, type PointerBindingOptions } from './bindings/pointer';
import type { EngineBinding } from './bindings/types';

export { CONTEXT_MENU_EVENT } from './bindings/pointer';
export type { MapContextMenuContext } from './bindings/pointer';
export { currentRenderTime, derivedTimeExtent } from './time/render-time';

export interface MapEngineOptions extends Omit<PointerBindingOptions, 'isEmbed'> {
  embedEnabled: boolean;
}

export { isDarkTheme };

/**
 * Binds the zustand stores to a live MapLibre map. Each concern is an
 * `EngineBinding` (bindings/): data layers + overlays + timeline, imagery,
 * terrain, the chase camera, camera focus, and pointer input. Imagery,
 * terrain and the chase camera load their code on first use.
 *
 * Returns a cleanup function. Framework-agnostic: stores are used through
 * their vanilla subscribe/getState API only.
 */
export function startMapEngine(map: maplibregl.Map, opts: MapEngineOptions): () => void {
  const stopImages = installStyleImageResolver(map);
  map.setProjection({ type: useSettingsStore.getState().projection });

  // Order matters on restyle: terrain first (hillshade sits under data),
  // imagery before data layers (imagery inserts beneath them).
  const bindings: EngineBinding[] = [
    bindTerrain(map),
    bindImagery(map),
    bindDataLayers(map, { isDark: () => isDarkTheme(useSettingsStore.getState().theme) }),
    bindChaseCamera(map),
    bindCamera(map),
    bindPointer(map, {
      isEmbed: opts.embedEnabled,
      contextMenu: opts.contextMenu,
      clickOpensContextMenu: opts.clickOpensContextMenu,
      resolveTool: opts.resolveTool,
    }),
  ];

  // A basemap swap drops every custom source and layer; rebuild them.
  let pendingRestyle: (() => void) | null = null;
  const unsubscribeTheme = useSettingsStore.subscribe(
    (s) => s.theme,
    (theme) => {
      if (pendingRestyle) map.off('style.load', pendingRestyle);
      const restyle = () => {
        pendingRestyle = null;
        map.setProjection({ type: useSettingsStore.getState().projection });
        for (const b of bindings) b.restyle?.();
      };
      pendingRestyle = restyle;
      // Register BEFORE setStyle — for inline styles 'style.load' can fire within the call.
      map.once('style.load', restyle);
      map.setStyle(buildBasemapStyle(theme));
    },
  );
  const unsubscribeProjection = useSettingsStore.subscribe(
    (s) => s.projection,
    (projection) => map.setProjection({ type: projection }),
  );

  return () => {
    unsubscribeTheme();
    unsubscribeProjection();
    if (pendingRestyle) map.off('style.load', pendingRestyle);
    for (const b of bindings.reverse()) b.destroy();
    stopImages();
  };
}
