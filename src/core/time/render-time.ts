import type { DataLayer, TimeExtent } from '@/types';
import { useTimeStore } from '@/state/time-store';
import type { RenderTime } from '../layers/temporal-render';
import { layerTimeExtent, unionExtents } from './temporal';

/** Timeline state as the renderers need it (null = timeline off). */
export function currentRenderTime(): RenderTime | null {
  const s = useTimeStore.getState();
  if (!s.enabled || !s.extent) return null;
  return { t: s.current, window: s.window, extent: s.extent };
}

/** Per-layer extent cache keyed by the (immutable) features array. */
const extentCache = new WeakMap<DataLayer['features'], { temporal: DataLayer['temporal']; extent: TimeExtent | null }>();

function cachedLayerExtent(layer: DataLayer): TimeExtent | null {
  const hit = extentCache.get(layer.features);
  if (hit && hit.temporal === layer.temporal) return hit.extent;
  const extent = layerTimeExtent(layer);
  extentCache.set(layer.features, { temporal: layer.temporal, extent });
  return extent;
}

/** The timeline's natural extent: every visible temporal data layer. */
export function derivedTimeExtent(layers: DataLayer[]): TimeExtent | null {
  return unionExtents(layers.filter((l) => l.visible && l.temporal).map(cachedLayerExtent));
}
