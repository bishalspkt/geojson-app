import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ImageryId, ImageryLayer, LayerOrigin } from '@/types';

/** What callers supply; everything else gets a default. */
export type ImageryInput = Omit<ImageryLayer, 'id' | 'visible' | 'opacity' | 'origin'> & {
  id?: ImageryId;
  visible?: boolean;
  opacity?: number;
  origin?: LayerOrigin;
};

export interface ImageryState {
  /** Ordered bottom → top. Imagery always renders beneath data layers. */
  layers: ImageryLayer[];

  /** Add (or replace, when `id` matches) an imagery layer. Returns its id. */
  addImagery(input: ImageryInput): ImageryId;
  removeImagery(id: ImageryId): void;
  setImageryVisible(id: ImageryId, visible: boolean): void;
  setImageryOpacity(id: ImageryId, opacity: number): void;
  clearImagery(opts?: { origin?: LayerOrigin }): void;
}

let nextImagerySeq = 1;

/** Test hook: reset the session-scoped imagery id counter. */
export function resetImageryIdCounter() {
  nextImagerySeq = 1;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const useImageryStore = create<ImageryState>()(
  subscribeWithSelector((set) => ({
    layers: [],

    addImagery(input) {
      const id = input.id ?? `R${nextImagerySeq++}`;
      const layer: ImageryLayer = {
        ...input,
        id,
        visible: input.visible ?? true,
        opacity: clamp01(input.opacity ?? 1),
        origin: input.origin ?? 'upload',
      };
      set((s) => {
        const idx = s.layers.findIndex((l) => l.id === id);
        if (idx === -1) return { layers: [...s.layers, layer] };
        const layers = [...s.layers];
        layers[idx] = layer; // replace in place, keeping z-order
        return { layers };
      });
      return id;
    },

    removeImagery(id) {
      set((s) => ({ layers: s.layers.filter((l) => l.id !== id) }));
    },

    setImageryVisible(id, visible) {
      set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, visible } : l)) }));
    },

    setImageryOpacity(id, opacity) {
      set((s) => ({
        layers: s.layers.map((l) => (l.id === id ? { ...l, opacity: clamp01(opacity) } : l)),
      }));
    },

    clearImagery(opts = {}) {
      set((s) => ({ layers: opts.origin ? s.layers.filter((l) => l.origin !== opts.origin) : [] }));
    },
  })),
);
