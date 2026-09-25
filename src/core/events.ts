import type { IdentifiedFeature } from '@/types';

/** Window event the engine dispatches when the user right-clicks the map. */
export const CONTEXT_MENU_EVENT = 'geojson-context-menu';

/** Payload of `CONTEXT_MENU_EVENT`. */
export interface MapContextMenuContext {
  feature: IdentifiedFeature | null;
  lngLat: { lng: number; lat: number };
  isEmbed: boolean;
}
