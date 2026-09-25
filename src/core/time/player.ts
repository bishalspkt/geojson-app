import { useTimeStore } from '@/state/time-store';

/** Longest frame delta fed to playback (ms) — avoids jumps after a background tab resumes. */
const MAX_FRAME_MS = 100;

/**
 * Drives timeline playback: while `playing`, advance the time store once per
 * animation frame. Framework-agnostic; returns a cleanup function.
 */
export function startTimePlayer(): () => void {
  let raf = 0;
  let last = 0;

  const frame = (now: number) => {
    const dt = last ? Math.min(MAX_FRAME_MS, now - last) : 16;
    last = now;
    useTimeStore.getState().tick(dt);
    if (useTimeStore.getState().playing) {
      raf = requestAnimationFrame(frame);
    } else {
      raf = 0;
      last = 0;
    }
  };

  const unsubscribe = useTimeStore.subscribe(
    (s) => s.playing,
    (playing) => {
      if (playing && !raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    },
    { fireImmediately: true },
  );

  return () => {
    unsubscribe();
    if (raf) cancelAnimationFrame(raf);
  };
}
