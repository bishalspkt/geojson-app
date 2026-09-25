import type { ImageryInput } from '@/state/imagery-store';

/**
 * Imagery presets: ready-made raster products (satellite scenes, rainfall,
 * water masks…) offered in the layers panel's "Add imagery" menu.
 * A preset turns an optional date into an imagery-store input.
 */
export interface ImageryPreset {
  id: string;
  name: string;
  /** One line shown under the name. */
  description: string;
  /** Picker section, e.g. "Satellite (daily)". */
  group: string;
  /** Presets with `dated` get a date picker; its value is passed to `create`. */
  dated?: { default: string; min?: string; max?: string };
  create(date: string | null): ImageryInput;
}

const presets = new Map<string, ImageryPreset>();

export function registerImageryPreset(preset: ImageryPreset): void {
  presets.set(preset.id, preset);
}

export function unregisterImageryPreset(id: string): void {
  presets.delete(id);
}

export function listImageryPresets(): ImageryPreset[] {
  return Array.from(presets.values());
}

export function getImageryPreset(id: string): ImageryPreset | undefined {
  return presets.get(id);
}
