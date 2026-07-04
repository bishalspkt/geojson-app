import maplibregl from 'maplibre-gl';
import { DataLayer, FeatureId } from '@/types';
import { interactiveLayerIds } from './ids';

export interface InteractionHandlers {
  getLayers(): DataLayer[];
  /** True while an exclusive tool (measure, draw…) owns the pointer. */
  isSuppressed(): boolean;
  onFeatureClick(featureId: FeatureId): void;
}

/**
 * Map-level pointer wiring for data layers: hover feature-state + cursor,
 * and click-to-select. Uses queryRenderedFeatures against the interactive
 * layer ids so handlers survive layer add/remove without rebinding.
 */
export function attachLayerInteractions(
  map: maplibregl.Map,
  handlers: InteractionHandlers,
): () => void {
  let hovered: { source: string; id: string | number } | null = null;

  const clearHover = () => {
    if (hovered) {
      map.setFeatureState(hovered, { hover: false });
      hovered = null;
    }
  };

  const existingInteractiveIds = () =>
    interactiveLayerIds(handlers.getLayers()).filter((id) => map.getLayer(id));

  const queryAt = (point: maplibregl.PointLike) => {
    const layerIds = existingInteractiveIds();
    if (layerIds.length === 0) return [];
    return map.queryRenderedFeatures(point, { layers: layerIds });
  };

  const onMouseMove = (e: maplibregl.MapMouseEvent) => {
    if (handlers.isSuppressed()) return;
    const hit = queryAt(e.point)[0];
    if (!hit || hit.id == null) {
      if (hovered) {
        clearHover();
        map.getCanvas().style.cursor = '';
      }
      return;
    }
    if (hovered && hovered.source === hit.source && hovered.id === hit.id) return;
    clearHover();
    hovered = { source: hit.source, id: hit.id };
    map.setFeatureState(hovered, { hover: true });
    map.getCanvas().style.cursor = 'pointer';
  };

  const onMouseOut = () => {
    clearHover();
    if (!handlers.isSuppressed()) map.getCanvas().style.cursor = '';
  };

  const onClick = (e: maplibregl.MapMouseEvent) => {
    if (handlers.isSuppressed()) return;
    const hit = queryAt(e.point)[0];
    const fid = hit?.properties?._fid as FeatureId | undefined;
    if (fid) handlers.onFeatureClick(fid);
  };

  map.on('mousemove', onMouseMove);
  map.on('mouseout', onMouseOut);
  map.on('click', onClick);

  return () => {
    clearHover();
    map.off('mousemove', onMouseMove);
    map.off('mouseout', onMouseOut);
    map.off('click', onClick);
  };
}

/** Query data-layer features at a screen point (context menu, embed click events). */
export function queryDataFeatures(
  map: maplibregl.Map,
  layers: DataLayer[],
  point: maplibregl.PointLike,
): maplibregl.MapGeoJSONFeature[] {
  const layerIds = interactiveLayerIds(layers).filter((id) => map.getLayer(id));
  if (layerIds.length === 0) return [];
  return map.queryRenderedFeatures(point, { layers: layerIds });
}
