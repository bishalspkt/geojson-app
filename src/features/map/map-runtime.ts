import * as maplibregl from 'maplibre-gl';
import { buildBasemapStyle } from '@/core/basemap/style';
import { startMapEngine } from '@/core/engine';
import { configureMapLibre } from '@/core/maplibre-setup';
import { useMapStore } from '@/state/map-store';
import { useSettingsStore } from '@/state/settings-store';
import { notify } from '@/state/notify-store';
import { getTool } from '@/extensions/tools/registry';
import type { EmbedConfig } from '@/integrations/embed/params';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '@/integrations/embed/params';

/**
 * Everything that needs MapLibre, loaded as its own chunk: the page shell
 * (logo, search, toolbar) renders while MapLibre and the engine download
 * (index.html preloads MapLibre so they arrive as early as before).
 */
export function mountMap(
  container: HTMLElement,
  embed: EmbedConfig,
  { onMove }: { onMove: (map: maplibregl.Map) => void },
): () => void {
  configureMapLibre();
  const map = new maplibregl.Map({
    container,
    style: buildBasemapStyle(useSettingsStore.getState().theme),
    center: embed.enabled ? embed.center : DEFAULT_CENTER,
    zoom: embed.enabled ? embed.zoom : DEFAULT_ZOOM,
    interactive: embed.interactive,
    attributionControl: false,
    // Oblique views of 3D terrain (stories, valley fly-throughs).
    maxPitch: 85,
    // Reduced motion: no label cross-fades (MapLibre already skips non-essential camera animation).
    ...(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? { fadeDuration: 0 } : {}),
  });
  map.addControl(
    new maplibregl.AttributionControl({
      compact: embed.enabled ? embed.attribution === 'compact' : true,
      customAttribution: '',
    }),
  );
  // A lost WebGL context (GPU reset, backgrounded tab on mobile) is recoverable by reloading.
  map.on('webglcontextlost', () => notify('The map lost its graphics context. Reload the page if it stays blank.'));

  const { setMap, setReady } = useMapStore.getState();
  setMap(map);

  const move = () => onMove(map);
  map.on('move', move);

  let stopEngine: (() => void) | undefined;
  map.on('load', () => {
    stopEngine = startMapEngine(map, {
      embedEnabled: embed.enabled,
      contextMenu: !embed.enabled || (embed.interactive && embed.chrome !== 'none'),
      clickOpensContextMenu: embed.enabled && embed.interactive,
      resolveTool: getTool,
    });
    setReady(true);
  });

  return () => {
    stopEngine?.();
    map.off('move', move);
    setMap(null);
    map.remove();
  };
}
