import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { MeasurePoint } from '@/types';

export type ToolId = string;

export interface ToolsState {
  /** The single active interactive tool (exclusive pointer mode), or null. */
  activeTool: ToolId | null;
  measurePoints: MeasurePoint[];

  setActiveTool(tool: ToolId | null): void;
  addMeasurePoint(point: MeasurePoint): void;
  clearMeasurePoints(): void;
}

export const useToolsStore = create<ToolsState>()(
  subscribeWithSelector((set) => ({
    activeTool: null,
    measurePoints: [],

    setActiveTool: (tool) =>
      set((state) => ({
        activeTool: tool,
        // Leaving measure mode discards in-progress points.
        measurePoints: state.activeTool === 'measure' && tool !== 'measure' ? [] : state.measurePoints,
      })),
    addMeasurePoint: (point) =>
      set((state) => ({ measurePoints: [...state.measurePoints, point] })),
    clearMeasurePoints: () => set({ measurePoints: [] }),
  })),
);
