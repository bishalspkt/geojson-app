import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { MapProjection, MapSettings, MapTheme } from '@/types';

export interface SettingsState extends MapSettings {
  setTheme(theme: MapTheme): void;
  setProjection(projection: MapProjection): void;
  setSettings(settings: Partial<MapSettings>): void;
}

export const DEFAULT_SETTINGS: MapSettings = {
  theme: 'light',
  projection: 'mercator',
};

export const useSettingsStore = create<SettingsState>()(
  subscribeWithSelector((set) => ({
    ...DEFAULT_SETTINGS,
    setTheme: (theme) => set({ theme }),
    setProjection: (projection) => set({ projection }),
    setSettings: (settings) => set(settings),
  })),
);
