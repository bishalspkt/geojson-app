import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { StoryDocument } from '@/types';

export type StoryStatus = 'idle' | 'loading' | 'ready' | 'error';

/** The open story (plain data) and where the reader is in it. */
export interface StoryState {
  status: StoryStatus;
  url: string | null;
  story: StoryDocument | null;
  chapterIndex: number;
  error: string | null;
  /** Story layers that failed to load (the story still opens without them). */
  layerErrors: string[];
  /** Data layers still loading in the background. */
  pendingLayers: number;

  setLoading(url: string): void;
  setReady(story: StoryDocument, layerErrors?: string[]): void;
  setError(message: string): void;
  setChapterIndex(index: number): void;
  setPendingLayers(count: number): void;
  addLayerError(message: string): void;
  close(): void;
}

export const useStoryStore = create<StoryState>()(
  subscribeWithSelector((set) => ({
    status: 'idle',
    url: null,
    story: null,
    chapterIndex: 0,
    error: null,
    layerErrors: [],
    pendingLayers: 0,

    setLoading: (url) => set({ status: 'loading', url, error: null, layerErrors: [], pendingLayers: 0 }),
    setReady: (story, layerErrors = []) => set({ status: 'ready', story, error: null, layerErrors }),
    setError: (message) => set({ status: 'error', error: message }),
    setChapterIndex: (chapterIndex) => set({ chapterIndex }),
    setPendingLayers: (pendingLayers) => set({ pendingLayers }),
    addLayerError: (message) => set((s) => ({ layerErrors: [...s.layerErrors, message] })),
    close: () =>
      set({ status: 'idle', url: null, story: null, chapterIndex: 0, error: null, layerErrors: [], pendingLayers: 0 }),
  })),
);
