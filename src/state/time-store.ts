import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { LayerId, TimeExtent } from '@/types';

/** Camera follows the head of an animated track while the timeline plays. */
export interface TimeFollow {
  layerId: LayerId;
  zoom?: number;
  pitch?: number;
  /** Fixed bearing, or 'track' to turn with the direction of travel. */
  bearing?: number | 'track';
  /**
   * Slow the timeline down while the followed front is fast, so it never
   * crosses more than this fraction of the view per second (e.g. 0.2).
   * Omit for constant-rate playback.
   */
  maxViewSpeed?: number;
}

/** A moment on the timeline with a line of narration (shown as the playhead passes it). */
export interface TimeCaption {
  /** Epoch ms. */
  t: number;
  text: string;
}

export interface TimeConfigureOptions {
  extent?: TimeExtent | null;
  /** Lock the extent so data changes don't re-derive it (stories, SDK). */
  lockExtent?: boolean;
  current?: number;
  /** Seconds a full pass over the extent takes at 1× speed. */
  duration?: number;
  speed?: number;
  loop?: boolean;
  /** Sliding window in ms; null = cumulative. */
  window?: number | null;
  /** IANA zone for labels (e.g. "Asia/Kathmandu"); null = viewer's zone. */
  timeZone?: string | null;
  playing?: boolean;
  follow?: TimeFollow | null;
  /** Narration captions; sorted by time on the way in. */
  captions?: TimeCaption[];
}

export interface TimeState {
  /** Timeline shown and time filtering applied to temporal layers. */
  enabled: boolean;
  extent: TimeExtent | null;
  extentLocked: boolean;
  /** Current timeline instant, epoch ms. */
  current: number;
  playing: boolean;
  duration: number;
  speed: number;
  loop: boolean;
  window: number | null;
  timeZone: string | null;
  follow: TimeFollow | null;
  /** Playback-rate multiplier (0–1] set by the chase camera's slow motion; 1 otherwise. */
  pace: number;
  /** Narration captions, sorted by time. */
  captions: TimeCaption[];

  enable(opts?: TimeConfigureOptions): void;
  disable(): void;
  configure(opts: TimeConfigureOptions): void;
  /** Data-derived extent; ignored while the extent is locked. */
  setDerivedExtent(extent: TimeExtent | null): void;
  setCurrent(t: number): void;
  play(): void;
  pause(): void;
  togglePlay(): void;
  setSpeed(speed: number): void;
  setWindow(ms: number | null): void;
  setLoop(loop: boolean): void;
  setPace(pace: number): void;
  /** Advance playback by a real-time delta (ms). No-op unless playing. */
  tick(realDeltaMs: number): void;
}

export const DEFAULT_TIME_DURATION_S = 30;

const clamp = (t: number, extent: TimeExtent | null) =>
  extent ? Math.min(extent[1], Math.max(extent[0], t)) : t;

/** Event milliseconds per real millisecond at full pace. */
export function playbackRate(state: Pick<TimeState, 'extent' | 'duration' | 'speed'>): number {
  const { extent } = state;
  if (!extent || extent[1] <= extent[0]) return 0;
  return ((extent[1] - extent[0]) / (Math.max(0.1, state.duration) * 1000)) * state.speed;
}

/** Pure playback step: returns the next instant and whether playback continues. */
export function advanceTime(
  state: Pick<TimeState, 'extent' | 'current' | 'duration' | 'speed' | 'loop'> & { pace?: number },
  realDeltaMs: number,
): { current: number; playing: boolean } {
  const { extent } = state;
  if (!extent || extent[1] <= extent[0]) return { current: state.current, playing: false };
  const span = extent[1] - extent[0];
  const rate = playbackRate(state) * (state.pace ?? 1);
  const next = state.current + realDeltaMs * rate;
  if (next < extent[1]) return { current: Math.max(extent[0], next), playing: true };
  if (state.loop) return { current: extent[0] + ((next - extent[0]) % span), playing: true };
  return { current: extent[1], playing: false };
}

export const useTimeStore = create<TimeState>()(
  subscribeWithSelector((set, get) => {
    const applyOptions = (opts: TimeConfigureOptions): Partial<TimeState> => {
      const s = get();
      const patch: Partial<TimeState> = {};
      if (opts.extent !== undefined) patch.extent = opts.extent;
      if (opts.lockExtent !== undefined) patch.extentLocked = opts.lockExtent;
      if (opts.duration !== undefined && opts.duration > 0) patch.duration = opts.duration;
      if (opts.speed !== undefined && opts.speed > 0) patch.speed = opts.speed;
      if (opts.loop !== undefined) patch.loop = opts.loop;
      if (opts.window !== undefined) patch.window = opts.window;
      if (opts.timeZone !== undefined) patch.timeZone = opts.timeZone;
      if (opts.playing !== undefined) patch.playing = opts.playing;
      if (opts.follow !== undefined) patch.follow = opts.follow;
      if (opts.captions !== undefined) {
        patch.captions = opts.captions.filter((c) => Number.isFinite(c.t) && c.text).sort((a, b) => a.t - b.t);
      }
      const extent = patch.extent !== undefined ? patch.extent : s.extent;
      const current = opts.current ?? (patch.extent !== undefined && extent ? extent[0] : s.current);
      patch.current = clamp(current, extent);
      return patch;
    };

    return {
      enabled: false,
      extent: null,
      extentLocked: false,
      current: 0,
      playing: false,
      duration: DEFAULT_TIME_DURATION_S,
      speed: 1,
      loop: false,
      window: null,
      timeZone: null,
      follow: null,
      pace: 1,
      captions: [],

      enable: (opts = {}) => set({ captions: [], ...applyOptions(opts), enabled: true, pace: 1 }),
      disable: () => set({ enabled: false, playing: false, follow: null, pace: 1, captions: [] }),
      configure: (opts) => set(applyOptions(opts)),

      setDerivedExtent: (extent) => {
        const s = get();
        if (s.extentLocked) return;
        const same = s.extent && extent && s.extent[0] === extent[0] && s.extent[1] === extent[1];
        if (same || (!s.extent && !extent)) return;
        // Keep the playhead where it was when possible; otherwise start at the beginning.
        const inside = extent && s.current >= extent[0] && s.current <= extent[1];
        set({ extent, current: extent ? (inside ? s.current : extent[1]) : 0 });
      },

      setCurrent: (t) => set({ current: clamp(t, get().extent) }),

      play: () => {
        const { extent, current } = get();
        if (!extent) return;
        // Replaying from the end restarts from the beginning.
        set({ playing: true, current: current >= extent[1] ? extent[0] : current });
      },
      pause: () => set({ playing: false }),
      togglePlay: () => (get().playing ? get().pause() : get().play()),
      setSpeed: (speed) => set({ speed: speed > 0 ? speed : 1 }),
      setWindow: (ms) => set({ window: ms !== null && ms > 0 ? ms : null }),
      setLoop: (loop) => set({ loop }),
      setPace: (pace) => {
        const p = Number.isFinite(pace) ? Math.min(1, Math.max(0.01, pace)) : 1;
        if (p !== get().pace) set({ pace: p });
      },

      tick: (realDeltaMs) => {
        const s = get();
        if (!s.playing) return;
        const next = advanceTime(s, realDeltaMs);
        set(next.playing ? { current: next.current } : { current: next.current, playing: false });
      },
    };
  }),
);
