import type * as maplibregl from 'maplibre-gl';
import { shallow } from 'zustand/shallow';
import { useImageryStore } from '@/state/imagery-store';
import { useTimeStore } from '@/state/time-store';
import { lazy } from '../lazy';
import { currentRenderTime } from '../time/render-time';
import type { EngineBinding } from './types';

/** Imagery layers. The renderer (and the COG decoder) load with the first imagery layer. */
export function bindImagery(map: maplibregl.Map): EngineBinding {
  const renderer = lazy(() => import('../imagery/renderer').then((m) => m.createImageryRenderer(map)), {
    destroy: (r) => r.destroy(),
    onReady: () => sync(),
  });

  const setTime = () => {
    const time = currentRenderTime();
    renderer.get()?.setTime(time ? time.t : null);
  };

  const sync = () => {
    const layers = useImageryStore.getState().layers;
    const r = renderer.get();
    if (r) {
      r.sync(layers);
      setTime();
    } else if (layers.length > 0) {
      renderer.request();
    }
  };

  sync();
  const cleanups = [
    useImageryStore.subscribe((s) => s.layers, sync),
    useTimeStore.subscribe((s) => [s.enabled, s.current, s.extent] as const, setTime, { equalityFn: shallow }),
  ];

  return {
    restyle() {
      renderer.get()?.reset();
      sync();
    },
    destroy() {
      for (const c of cleanups) c();
      renderer.dispose();
    },
  };
}
