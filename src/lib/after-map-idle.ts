import { whenMapReady } from '@/state/map-store';
import { onIdle } from './idle';

/**
 * Run `fn` once the map has drawn its first complete view (MapLibre `idle`:
 * tiles, glyphs and sprites loaded) and the browser is idle. Use it for work
 * that must not compete with the first map render for bandwidth or CPU —
 * analytics, prefetching panels. `maxWaitMs` bounds the wait (e.g. a tile
 * server that never answers). Returns a cancel function.
 */
export function afterMapIdle(fn: () => void, { maxWaitMs = 20_000 } = {}): () => void {
  let done = false;
  let cancelIdle: (() => void) | null = null;
  const fire = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    cancelIdle = onIdle(fn, { timeout: 3000 });
  };
  const timer = setTimeout(fire, maxWaitMs);
  let detach: (() => void) | null = null;
  const stopWaiting = whenMapReady((map) => {
    // `idle` fires after every complete render; if the map is already idle, trigger a repaint to get one.
    map.once('idle', fire);
    map.triggerRepaint();
    detach = () => map.off('idle', fire);
  });
  return () => {
    done = true;
    clearTimeout(timer);
    stopWaiting();
    detach?.();
    cancelIdle?.();
  };
}
