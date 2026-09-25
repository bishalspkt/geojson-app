import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ImageryId } from '@/types';

/** One choosable side of a comparison: which imagery shows, and its label. */
export interface CompareOption {
  ids: ImageryId[];
  label: string;
}

/**
 * Before/after swipe comparison. The main map keeps rendering normally (the
 * "after"/right side); a synchronized secondary map clipped to the left of the
 * divider shows `left` imagery instead of the main map's imagery.
 *
 * Either side may offer alternatives (e.g. several satellite scenes of the same
 * town); choosing one only changes store state — callers switch the imagery.
 */
export interface CompareState {
  active: boolean;
  /** Divider position as a fraction of the map width (0–1). */
  position: number;
  /** Imagery ids drawn on the left side (in this order, bottom → top). */
  left: ImageryId[];
  leftLabel: string | null;
  rightLabel: string | null;
  leftOptions: CompareOption[];
  rightOptions: CompareOption[];
  /** Index of the chosen option per side (−1 = none offered). */
  leftIndex: number;
  rightIndex: number;

  start(opts: {
    left: ImageryId[];
    leftLabel?: string | null;
    rightLabel?: string | null;
    position?: number;
    leftOptions?: CompareOption[];
    rightOptions?: CompareOption[];
  }): void;
  stop(): void;
  setPosition(position: number): void;
  chooseLeft(index: number): void;
  /** Record the right-side choice (the caller shows/hides the main map's imagery). */
  chooseRight(index: number): void;
}

const clampPosition = (p: number) => Math.min(0.98, Math.max(0.02, p));

export const useCompareStore = create<CompareState>()(
  subscribeWithSelector((set, get) => ({
    active: false,
    position: 0.5,
    left: [],
    leftLabel: null,
    rightLabel: null,
    leftOptions: [],
    rightOptions: [],
    leftIndex: -1,
    rightIndex: -1,

    start: ({ left, leftLabel = null, rightLabel = null, position, leftOptions = [], rightOptions = [] }) =>
      set((s) => ({
        active: true,
        left,
        leftLabel,
        rightLabel,
        leftOptions,
        rightOptions,
        leftIndex: leftOptions.length ? Math.max(0, leftOptions.findIndex((o) => o.ids.join() === left.join())) : -1,
        rightIndex: rightOptions.length ? 0 : -1,
        position: position !== undefined ? clampPosition(position) : s.position,
      })),
    stop: () =>
      set({ active: false, left: [], leftLabel: null, rightLabel: null, leftOptions: [], rightOptions: [], leftIndex: -1, rightIndex: -1 }),
    setPosition: (position) => set({ position: clampPosition(position) }),
    chooseLeft: (index) => {
      const option = get().leftOptions[index];
      if (option) set({ left: option.ids, leftLabel: option.label, leftIndex: index });
    },
    chooseRight: (index) => {
      const option = get().rightOptions[index];
      if (option) set({ rightLabel: option.label, rightIndex: index });
    },
  })),
);
