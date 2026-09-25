import type * as maplibregl from 'maplibre-gl';
import { shallow } from 'zustand/shallow';
import { useSettingsStore } from '@/state/settings-store';
import { lazy } from '../lazy';
import type { EngineBinding } from './types';

/** 3D terrain, hillshade and sky. The module loads the first time either is switched on. */
export function bindTerrain(map: maplibregl.Map): EngineBinding {
  const terrain = lazy(() => import('../basemap/terrain'), { onReady: () => sync() });

  const sync = () => {
    const settings = useSettingsStore.getState();
    const mod = terrain.get();
    if (mod) mod.applyTerrain(map, settings);
    else if (settings.terrain || settings.hillshade) terrain.request();
  };

  sync();
  const unsubscribe = useSettingsStore.subscribe(
    (s) => [s.terrain, s.terrainExaggeration, s.hillshade] as const,
    sync,
    { equalityFn: shallow },
  );

  return {
    restyle: sync,
    destroy() {
      unsubscribe();
      terrain.dispose();
    },
  };
}
