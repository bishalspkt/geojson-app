import { MapTool } from '@/core/tools';
import { useToolsStore } from '@/state/tools-store';

/** Distance measurement: each map click appends a point to the running path. */
export const measureTool: MapTool = {
  id: 'measure',
  cursor: 'crosshair',
  onMapClick(e) {
    useToolsStore.getState().addMeasurePoint({ lng: e.lngLat.lng, lat: e.lngLat.lat });
  },
};
