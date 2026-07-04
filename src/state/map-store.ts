import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type maplibregl from 'maplibre-gl';

/**
 * Holds the live MapLibre map instance so both React components and
 * framework-agnostic modules (core engines, integrations) can reach it.
 * The map object itself is mutable — treat this store as a handle, not state.
 */
export interface MapState {
  map: maplibregl.Map | null;
  /** True once the initial style has loaded and system overlays exist. */
  ready: boolean;

  setMap(map: maplibregl.Map | null): void;
  setReady(ready: boolean): void;
}

export const useMapStore = create<MapState>()(
  subscribeWithSelector((set) => ({
    map: null,
    ready: false,
    setMap: (map) => set(map ? { map } : { map: null, ready: false }),
    setReady: (ready) => set({ ready }),
  })),
);

/** Imperative accessor for non-React modules. Null until the map mounts. */
export function getMap(): maplibregl.Map | null {
  return useMapStore.getState().map;
}

/** Run `fn` now if the map is ready, otherwise once it becomes ready. */
export function whenMapReady(fn: (map: maplibregl.Map) => void): () => void {
  const { map, ready } = useMapStore.getState();
  if (map && ready) {
    fn(map);
    return () => {};
  }
  return useMapStore.subscribe(
    (state) => state.ready,
    (isReady) => {
      const m = useMapStore.getState().map;
      if (isReady && m) fn(m);
    },
  );
}
