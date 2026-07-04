import maplibregl from 'maplibre-gl';
import { LayerId, MAP_THEMES, MapProjection, MapTheme } from '@/types';
import { getMap } from '@/state/map-store';
import { useLayersStore } from '@/state/layers-store';
import { useSettingsStore } from '@/state/settings-store';
import { sanitizeExternalLayerId } from '@/core/layers/ids';
import { ingest } from '@/extensions/sources/registry';
import {
  Bounds,
  CommandName,
  LayerInfo,
  LngLat,
  isBounds,
  isLngLat,
} from './commands';

/** Stable id for the primary dataset (`setGeoJSON`, `?geojson=` in embeds). */
export const PRIMARY_LAYER_ID: LayerId = 'sdk-primary';

const VALID_PROJECTIONS: MapProjection[] = ['mercator', 'globe'];

/** Caller-supplied custom-layer ids → internal layer ids (addLayer tracking). */
const customLayers = new Map<string, LayerId>();

function requireMap(): maplibregl.Map {
  const map = getMap();
  if (!map) throw new Error('Map not ready');
  return map;
}

// Great-circle distance in meters, for distance-scaled flyover durations.
function haversineMeters(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371008.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dPhi = toRad(lat2 - lat1);
  const dLambda = toRad(lng2 - lng1);
  const s =
    Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Execute one command against the live stores + map. Transport-independent:
 * the embed bridge, URL loader, and future MCP transport all end up here.
 * Throws on validation failure; transports convert throws into their own
 * error envelopes.
 */
export async function executeCommand(method: CommandName, args: unknown): Promise<unknown> {
  const a = (args ?? {}) as Record<string, unknown>;

  switch (method) {
    case 'flyTo': {
      const m = requireMap();
      const opts: maplibregl.FlyToOptions = {};
      if (isLngLat(a.center)) opts.center = a.center;
      if (typeof a.zoom === 'number') opts.zoom = a.zoom;
      if (typeof a.bearing === 'number') opts.bearing = a.bearing;
      if (typeof a.pitch === 'number') opts.pitch = a.pitch;
      if (typeof a.duration === 'number') {
        opts.duration = a.duration;
      } else if (opts.center) {
        // Scale duration with distance so long flyovers stay legible:
        // sqrt curve from a 1.5 s floor to a 3.5 s cap for intercontinental jumps.
        const from = m.getCenter();
        const [lng, lat] = opts.center as LngLat;
        const t = Math.sqrt(Math.min(1, haversineMeters(from.lng, from.lat, lng, lat) / 10_000_000));
        opts.duration = 1500 + t * 2000;
      }
      m.flyTo(opts);
      return undefined;
    }

    case 'jumpTo': {
      const m = requireMap();
      const opts: maplibregl.JumpToOptions = {};
      if (isLngLat(a.center)) opts.center = a.center;
      if (typeof a.zoom === 'number') opts.zoom = a.zoom;
      if (typeof a.bearing === 'number') opts.bearing = a.bearing;
      if (typeof a.pitch === 'number') opts.pitch = a.pitch;
      m.jumpTo(opts);
      return undefined;
    }

    case 'fitBounds': {
      const m = requireMap();
      const bounds = (a.bounds ?? a) as unknown;
      if (!isBounds(bounds)) throw new Error('fitBounds: bounds must be [[lng,lat],[lng,lat]]');
      const opts: maplibregl.FitBoundsOptions = {};
      if (typeof a.padding === 'number') opts.padding = a.padding;
      if (typeof a.duration === 'number') opts.duration = a.duration;
      if (typeof a.maxZoom === 'number') opts.maxZoom = a.maxZoom;
      m.fitBounds(bounds, opts);
      return undefined;
    }

    case 'setTheme': {
      const theme = a.theme;
      if (typeof theme !== 'string' || !MAP_THEMES.includes(theme as MapTheme)) {
        throw new Error(`setTheme: invalid theme "${String(theme)}"`);
      }
      useSettingsStore.getState().setTheme(theme as MapTheme);
      return undefined;
    }

    case 'setProjection': {
      const projection = a.projection;
      if (typeof projection !== 'string' || !VALID_PROJECTIONS.includes(projection as MapProjection)) {
        throw new Error(`setProjection: invalid projection "${String(projection)}"`);
      }
      useSettingsStore.getState().setProjection(projection as MapProjection);
      return undefined;
    }

    case 'setGeoJSON': {
      const data = a.data ?? a;
      // Replaces the primary data layer; custom layers (addLayer) are untouched.
      await ingest(
        { kind: 'data', data, name: 'Data' },
        { layerId: PRIMARY_LAYER_ID, origin: 'sdk', fit: true },
      );
      return undefined;
    }

    case 'addLayer': {
      const id = typeof a.id === 'string' ? a.id : null;
      if (!id) throw new Error('addLayer: id is required');
      if (a.data == null) throw new Error('addLayer: data is required');
      const layerId = sanitizeExternalLayerId(id);
      await ingest(
        { kind: 'data', data: a.data, name: typeof a.name === 'string' ? a.name : id },
        {
          layerId,
          origin: 'sdk',
          fit: false,
          paint: a.paint && typeof a.paint === 'object' ? (a.paint as Record<string, unknown>) : undefined,
        },
      );
      customLayers.set(id, layerId);
      return undefined;
    }

    case 'removeLayer': {
      const id = typeof a.id === 'string' ? a.id : null;
      if (!id) throw new Error('removeLayer: id is required');
      const layerId = customLayers.get(id) ?? sanitizeExternalLayerId(id);
      useLayersStore.getState().removeLayer(layerId);
      customLayers.delete(id);
      return undefined;
    }

    case 'clearLayers': {
      const { removeLayer } = useLayersStore.getState();
      for (const layerId of customLayers.values()) removeLayer(layerId);
      customLayers.clear();
      return undefined;
    }

    case 'listLayers': {
      const externalIdByInternal = new Map<LayerId, string>();
      for (const [ext, internal] of customLayers) externalIdByInternal.set(internal, ext);
      return useLayersStore.getState().layers.map(
        (l): LayerInfo => ({
          id: externalIdByInternal.get(l.id) ?? l.id,
          name: l.name,
          origin: l.origin,
          featureCount: l.features.length,
          visible: l.visible,
        }),
      );
    }

    case 'setLayerVisibility': {
      const id = typeof a.id === 'string' ? a.id : null;
      if (!id) throw new Error('setLayerVisibility: id is required');
      if (typeof a.visible !== 'boolean') throw new Error('setLayerVisibility: visible must be boolean');
      const state = useLayersStore.getState();
      const layerId = customLayers.get(id) ?? id;
      if (!state.layers.some((l) => l.id === layerId)) {
        throw new Error(`setLayerVisibility: unknown layer "${id}"`);
      }
      state.setLayerVisible(layerId, a.visible);
      return undefined;
    }

    case 'getCenter': {
      const c = requireMap().getCenter();
      return [c.lng, c.lat] as LngLat;
    }
    case 'getZoom':
      return requireMap().getZoom();
    case 'getBearing':
      return requireMap().getBearing();
    case 'getBounds': {
      const b = requireMap().getBounds();
      return [
        [b.getWest(), b.getSouth()],
        [b.getEast(), b.getNorth()],
      ] as Bounds;
    }
  }
}

/** Test hook: forget custom-layer tracking. */
export function resetExecutorState() {
  customLayers.clear();
}
