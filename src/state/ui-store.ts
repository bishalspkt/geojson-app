import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { FeatureId, MapFocusTarget, PanelType } from '@/types';

export interface FocusRequest {
  /** Monotonic sequence so the camera engine can distinguish repeat requests. */
  seq: number;
  target: MapFocusTarget;
}

/** Pixels of the map covered by UI on each side (e.g. an open story panel). */
export interface ViewInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const NO_INSETS: ViewInsets = { top: 0, right: 0, bottom: 0, left: 0 };

export interface UiState {
  activePanel: PanelType | null;
  focusRequest: FocusRequest | null;
  /** `seq` of the last focus request whose camera move has finished (or was taken over). */
  focusSettled: number;
  /** Feature whose properties dialog is open (null = closed). */
  propertiesFeatureId: FeatureId | null;
  /** Map area hidden behind UI; camera moves center on the visible remainder. */
  viewInsets: ViewInsets;
  /** Feature under the pointer (map-container pixel coords) for hover tooltips. */
  hover: { featureId: FeatureId; x: number; y: number } | null;

  setActivePanel(panel: PanelType | null): void;
  togglePanel(panel: PanelType): void;
  /** Ask the camera engine to move; returns the request's `seq`. */
  requestFocus(target: MapFocusTarget): number;
  markFocusSettled(seq: number): void;
  showProperties(featureId: FeatureId | null): void;
  setViewInsets(insets: ViewInsets): void;
  setHover(hover: { featureId: FeatureId; x: number; y: number } | null): void;
}

let nextFocusSeq = 1;

export const useUiStore = create<UiState>()(
  subscribeWithSelector((set) => ({
    activePanel: null,
    focusRequest: null,
    focusSettled: 0,
    propertiesFeatureId: null,
    viewInsets: NO_INSETS,
    hover: null,

    setActivePanel: (panel) => set({ activePanel: panel }),
    togglePanel: (panel) =>
      set((state) => ({ activePanel: state.activePanel === panel ? null : panel })),
    requestFocus: (target) => {
      const seq = nextFocusSeq++;
      set({ focusRequest: { seq, target } });
      return seq;
    },
    markFocusSettled: (seq) => set((state) => (seq > state.focusSettled ? { focusSettled: seq } : state)),
    showProperties: (featureId) => set({ propertiesFeatureId: featureId }),
    setViewInsets: (insets) => set({ viewInsets: insets }),
    setHover: (hover) => set({ hover }),
  })),
);
