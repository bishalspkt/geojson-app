import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { FeatureId, MapFocusTarget, PanelType } from '@/types';

export interface FocusRequest {
  /** Monotonic sequence so the camera engine can distinguish repeat requests. */
  seq: number;
  target: MapFocusTarget;
}

export interface UiState {
  activePanel: PanelType | null;
  focusRequest: FocusRequest | null;
  /** Feature whose properties dialog is open (null = closed). */
  propertiesFeatureId: FeatureId | null;

  setActivePanel(panel: PanelType | null): void;
  togglePanel(panel: PanelType): void;
  requestFocus(target: MapFocusTarget): void;
  showProperties(featureId: FeatureId | null): void;
}

let nextFocusSeq = 1;

export const useUiStore = create<UiState>()(
  subscribeWithSelector((set) => ({
    activePanel: null,
    focusRequest: null,
    propertiesFeatureId: null,

    setActivePanel: (panel) => set({ activePanel: panel }),
    togglePanel: (panel) =>
      set((state) => ({ activePanel: state.activePanel === panel ? null : panel })),
    requestFocus: (target) => set({ focusRequest: { seq: nextFocusSeq++, target } }),
    showProperties: (featureId) => set({ propertiesFeatureId: featureId }),
  })),
);
