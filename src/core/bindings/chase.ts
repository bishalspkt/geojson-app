import type * as maplibregl from 'maplibre-gl';
import { shallow } from 'zustand/shallow';
import { useLayersStore } from '@/state/layers-store';
import { playbackRate, useTimeStore } from '@/state/time-store';
import { lazy } from '../lazy';
import type { EngineBinding } from './types';

/**
 * The chase camera: while the timeline follows a track, the camera rides its
 * head. Loaded the first time a timeline asks to follow something.
 */
export function bindChaseCamera(map: maplibregl.Map): EngineBinding {
  const follower = lazy(
    () =>
      import('../time/follow').then((m) =>
        m.createTrackFollower(map, { onPace: (pace) => useTimeStore.getState().setPace(pace) }),
      ),
    { destroy: (f) => f.destroy(), onReady: () => sync() },
  );

  const sync = () => {
    const state = useTimeStore.getState();
    const following = state.enabled && state.extent && state.follow ? state.follow : null;
    const f = follower.get();
    if (!f) {
      // Runs every frame during playback: request() starts one load and backs off after a failure.
      if (following) follower.request();
      return;
    }
    const layer = following ? useLayersStore.getState().layers.find((l) => l.id === following.layerId) : undefined;
    f.update({
      layer,
      follow: following,
      t: following ? state.current : 0,
      rate: playbackRate(state),
      playing: state.playing,
    });
  };

  const cleanups = [
    useTimeStore.subscribe((s) => [s.enabled, s.current, s.extent, s.follow, s.speed, s.duration] as const, sync, {
      equalityFn: shallow,
    }),
    useTimeStore.subscribe(
      (s) => s.playing,
      (playing) => {
        if (playing) follower.get()?.resume();
        sync();
      },
    ),
  ];
  sync();

  return {
    destroy() {
      for (const c of cleanups) c();
      follower.dispose();
    },
  };
}
