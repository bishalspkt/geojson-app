import { useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { FeatureCollection, Feature, Geometry } from 'geojson';
import { useEmbed } from '@/services/embed-context';
import { useGeoJson, createGeoJsonActions } from '@/services';
import { useMapInstance } from '@/services/map';
import { MapTheme, MapProjection } from '@/types';
import {
  PROTOCOL_SOURCE,
  PROTOCOL_VERSION,
  ProtocolCommand,
  ProtocolEvent,
  ProtocolResponse,
  EmbedEventName,
  EmbedMethod,
  isProtocolMessage,
} from '@/embed/protocol';

const VALID_THEMES: MapTheme[] = ['light', 'dark', 'white', 'grayscale', 'black'];
const VALID_PROJECTIONS: MapProjection[] = ['mercator', 'globe'];

const CUSTOM_LAYER_PREFIX = 'embed-custom-';

type Lng = number;
type Lat = number;
type LngLat = [Lng, Lat];
type Bounds = [LngLat, LngLat];

function send(target: Window, message: ProtocolResponse | ProtocolEvent) {
  try {
    target.postMessage(message, '*');
  } catch (err) {
    // Most likely the parent went away. Nothing useful to do.
    console.warn('[geojson.app embed] postMessage failed:', err);
  }
}

function respondOk(target: Window, replyTo: string, result?: unknown) {
  send(target, { source: PROTOCOL_SOURCE, v: PROTOCOL_VERSION, replyTo, ok: true, result });
}

function respondErr(target: Window, replyTo: string, code: string, message: string) {
  send(target, {
    source: PROTOCOL_SOURCE,
    v: PROTOCOL_VERSION,
    replyTo,
    ok: false,
    error: { code, message },
  });
}

function emit(target: Window, event: EmbedEventName, payload?: unknown) {
  send(target, { source: PROTOCOL_SOURCE, v: PROTOCOL_VERSION, event, payload });
}

function isLngLat(v: unknown): v is LngLat {
  return Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number';
}

// Great-circle distance in meters. Matches what maplibre's LngLat.distanceTo
// would return; written out so we don't depend on maplibregl statics at runtime.
function haversineMeters(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371008.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dPhi = toRad(lat2 - lat1);
  const dLambda = toRad(lng2 - lng1);
  const s =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function isBounds(v: unknown): v is Bounds {
  return Array.isArray(v) && v.length === 2 && isLngLat(v[0]) && isLngLat(v[1]);
}

function isFeatureCollectionLike(v: unknown): v is FeatureCollection | Feature {
  if (!v || typeof v !== 'object') return false;
  const t = (v as { type?: unknown }).type;
  return t === 'FeatureCollection' || t === 'Feature';
}

function toFeatureCollection(input: FeatureCollection | Feature | string): FeatureCollection {
  const data: unknown = typeof input === 'string' ? JSON.parse(input) : input;
  if (!data || typeof data !== 'object') {
    throw new Error('setGeoJSON: data must be a Feature or FeatureCollection');
  }
  const t = (data as { type?: unknown }).type;
  if (t === 'FeatureCollection') return data as FeatureCollection;
  if (t === 'Feature') return { type: 'FeatureCollection', features: [data as Feature] };
  throw new Error(`setGeoJSON: unsupported GeoJSON type "${String(t)}"`);
}

export function EmbedBridge() {
  const embed = useEmbed();
  const mapRef = useMapInstance();
  const { state, dispatch } = useGeoJson();
  const actions = useMemo(() => createGeoJsonActions(dispatch), [dispatch]);

  // Stable refs so the message handler effect doesn't need to re-bind on every state change.
  const stateRef = useRef(state);
  const actionsRef = useRef(actions);
  const mapInstanceRef = mapRef;
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { actionsRef.current = actions; }, [actions]);

  // Track parent origin for messaging. `useMemo` so the value is referentially
  // stable across renders and safe to put in effect dep arrays.
  const parent = useMemo(
    () => (window.parent !== window ? window.parent : null),
    [],
  );

  // Track custom layers added via addLayer/removeLayer.
  const customLayersRef = useRef<Set<string>>(new Set());

  // Track previous settings to emit theme:change / projection:change.
  const prevThemeRef = useRef<MapTheme>(embed.theme);
  const prevProjectionRef = useRef<MapProjection>(embed.projection);

  // ---- Settings change events ----
  useEffect(() => {
    if (!parent) return;
    if (state.mapSettings.theme !== prevThemeRef.current) {
      prevThemeRef.current = state.mapSettings.theme;
      emit(parent, 'theme:change', { theme: state.mapSettings.theme });
    }
    if (state.mapSettings.projection !== prevProjectionRef.current) {
      prevProjectionRef.current = state.mapSettings.projection;
      emit(parent, 'projection:change', { projection: state.mapSettings.projection });
    }
  }, [state.mapSettings.theme, state.mapSettings.projection, parent]);

  // ---- Map-driven events: load, move, moveend, click ----
  useEffect(() => {
    if (!parent) return;
    const m = mapInstanceRef.current;
    if (!m) return;

    // `move` is high-frequency — throttle via requestAnimationFrame.
    let moveScheduled = false;
    const onMove = () => {
      if (moveScheduled) return;
      moveScheduled = true;
      requestAnimationFrame(() => {
        moveScheduled = false;
        const c = m.getCenter();
        emit(parent, 'move', {
          center: [c.lng, c.lat] as LngLat,
          zoom: m.getZoom(),
          bearing: m.getBearing(),
          pitch: m.getPitch(),
        });
      });
    };

    const onMoveEnd = () => {
      const c = m.getCenter();
      const b = m.getBounds();
      emit(parent, 'moveend', {
        center: [c.lng, c.lat] as LngLat,
        zoom: m.getZoom(),
        bearing: m.getBearing(),
        pitch: m.getPitch(),
        bounds: [[b.getWest(), b.getSouth()], [b.getEast(), b.getNorth()]] as Bounds,
      });
    };

    const onClick = (e: maplibregl.MapMouseEvent) => {
      const features = m
        .queryRenderedFeatures(e.point)
        .filter((f) => {
          const sourceId = (f as unknown as { source?: string }).source;
          // Only surface uploaded / custom geojson features, not basemap.
          return (
            typeof sourceId === 'string' &&
            (sourceId.startsWith('uploaded-geojson') || sourceId.startsWith(CUSTOM_LAYER_PREFIX))
          );
        })
        .map((f) => ({
          type: 'Feature',
          geometry: f.geometry,
          properties: f.properties,
        } as Feature));

      emit(parent, 'click', {
        lngLat: [e.lngLat.lng, e.lngLat.lat] as LngLat,
        features,
      });
    };

    const bind = () => {
      m.on('move', onMove);
      m.on('moveend', onMoveEnd);
      m.on('click', onClick);
    };

    if (m.loaded()) {
      emit(parent, 'load');
      bind();
    } else {
      m.once('load', () => {
        emit(parent, 'load');
        bind();
      });
    }

    return () => {
      m.off('move', onMove);
      m.off('moveend', onMoveEnd);
      m.off('click', onClick);
    };
    // mapInstanceRef is a stable ref; .current is read inside the effect, so
    // it intentionally isn't in deps.
  }, [parent, mapInstanceRef]);

  // ---- Command handler ----
  useEffect(() => {
    if (!parent) return;

    function handle(method: EmbedMethod, args: unknown): unknown | Promise<unknown> {
      const m = mapInstanceRef.current;
      if (!m) throw new Error('Map not ready');
      const a = (args ?? {}) as Record<string, unknown>;

      switch (method) {
        case 'flyTo': {
          const opts: maplibregl.FlyToOptions = {};
          if (isLngLat(a.center)) opts.center = a.center;
          if (typeof a.zoom === 'number') opts.zoom = a.zoom;
          if (typeof a.bearing === 'number') opts.bearing = a.bearing;
          if (typeof a.pitch === 'number') opts.pitch = a.pitch;
          if (typeof a.duration === 'number') {
            opts.duration = a.duration;
          } else if (opts.center) {
            // Scale duration with distance so long-distance flyovers don't whizz by
            // too fast to make sense of. Sqrt curve ramps quickly from a 1.5s floor
            // to a 3.5s cap for intercontinental jumps.
            const from = m.getCenter();
            const [tgtLng, tgtLat] = opts.center as [number, number];
            const meters = haversineMeters(from.lng, from.lat, tgtLng, tgtLat);
            const t = Math.sqrt(Math.min(1, meters / 10_000_000));
            opts.duration = 1500 + t * 2000;
          }
          m.flyTo(opts);
          return undefined;
        }
        case 'jumpTo': {
          const opts: maplibregl.JumpToOptions = {};
          if (isLngLat(a.center)) opts.center = a.center;
          if (typeof a.zoom === 'number') opts.zoom = a.zoom;
          if (typeof a.bearing === 'number') opts.bearing = a.bearing;
          if (typeof a.pitch === 'number') opts.pitch = a.pitch;
          m.jumpTo(opts);
          return undefined;
        }
        case 'fitBounds': {
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
          if (typeof theme !== 'string' || !VALID_THEMES.includes(theme as MapTheme)) {
            throw new Error(`setTheme: invalid theme "${String(theme)}"`);
          }
          actionsRef.current.setMapSettings({
            theme: theme as MapTheme,
            projection: stateRef.current.mapSettings.projection,
          });
          return undefined;
        }
        case 'setProjection': {
          const projection = a.projection;
          if (typeof projection !== 'string' || !VALID_PROJECTIONS.includes(projection as MapProjection)) {
            throw new Error(`setProjection: invalid projection "${String(projection)}"`);
          }
          actionsRef.current.setMapSettings({
            theme: stateRef.current.mapSettings.theme,
            projection: projection as MapProjection,
          });
          return undefined;
        }
        case 'setGeoJSON': {
          const data = a.data ?? a;
          if (typeof data !== 'string' && !isFeatureCollectionLike(data)) {
            throw new Error('setGeoJSON: expected { data: GeoJSON } or a GeoJSON object/string');
          }
          const fc = toFeatureCollection(data as FeatureCollection | Feature | string);
          actionsRef.current.loadGeoJson(fc);
          return undefined;
        }
        case 'addLayer': {
          const id = typeof a.id === 'string' ? a.id : null;
          if (!id) throw new Error('addLayer: id is required');
          if (!isFeatureCollectionLike(a.data)) {
            throw new Error('addLayer: data must be a FeatureCollection or Feature');
          }
          const fc = toFeatureCollection(a.data as FeatureCollection | Feature);
          addCustomLayer(m, id, fc, a.paint as Record<string, unknown> | undefined);
          customLayersRef.current.add(id);
          return undefined;
        }
        case 'removeLayer': {
          const id = typeof a.id === 'string' ? a.id : null;
          if (!id) throw new Error('removeLayer: id is required');
          removeCustomLayer(m, id);
          customLayersRef.current.delete(id);
          return undefined;
        }
        case 'clearLayers': {
          for (const id of customLayersRef.current) removeCustomLayer(m, id);
          customLayersRef.current.clear();
          return undefined;
        }
        case 'getCenter': {
          const c = m.getCenter();
          return [c.lng, c.lat] as LngLat;
        }
        case 'getZoom':
          return m.getZoom();
        case 'getBearing':
          return m.getBearing();
        case 'getBounds': {
          const b = m.getBounds();
          return [[b.getWest(), b.getSouth()], [b.getEast(), b.getNorth()]] as Bounds;
        }
        default:
          throw new Error(`Unknown method "${method}"`);
      }
    }

    function onMessage(ev: MessageEvent) {
      if (!isProtocolMessage(ev.data)) return;
      const msg = ev.data as ProtocolCommand;
      if (typeof msg.id !== 'string' || typeof msg.method !== 'string') return;
      try {
        const result = handle(msg.method, msg.args);
        Promise.resolve(result)
          .then((value) => respondOk(parent!, msg.id, value))
          .catch((err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            respondErr(parent!, msg.id, 'method_failed', message);
            emit(parent!, 'error', { code: 'method_failed', message, where: msg.method });
          });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        respondErr(parent!, msg.id, 'method_failed', message);
        emit(parent!, 'error', { code: 'method_failed', message, where: msg.method });
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [parent, mapInstanceRef]);

  return null;
}

// ----- Custom layer helpers -----

function addCustomLayer(
  map: maplibregl.Map,
  id: string,
  data: FeatureCollection,
  paint?: Record<string, unknown>,
) {
  const sourceId = CUSTOM_LAYER_PREFIX + id;
  const layerId = CUSTOM_LAYER_PREFIX + id + '-layer';
  removeCustomLayer(map, id);

  map.addSource(sourceId, { type: 'geojson', data });

  // Pick layer type from first feature's geometry; fall back to fill.
  const first = data.features[0]?.geometry as Geometry | undefined;
  const t = first?.type;
  let layer: maplibregl.LayerSpecification;
  if (t === 'Point' || t === 'MultiPoint') {
    layer = {
      id: layerId,
      type: 'circle',
      source: sourceId,
      paint: {
        'circle-radius': 6,
        'circle-color': '#1d4ed8',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.5,
        ...(paint ?? {}),
      },
    } as maplibregl.LayerSpecification;
  } else if (t === 'LineString' || t === 'MultiLineString') {
    layer = {
      id: layerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#1d4ed8',
        'line-width': 2,
        ...(paint ?? {}),
      },
    } as maplibregl.LayerSpecification;
  } else {
    layer = {
      id: layerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': '#1d4ed8',
        'fill-opacity': 0.35,
        'fill-outline-color': '#1d4ed8',
        ...(paint ?? {}),
      },
    } as maplibregl.LayerSpecification;
  }
  map.addLayer(layer);
}

function removeCustomLayer(map: maplibregl.Map, id: string) {
  const sourceId = CUSTOM_LAYER_PREFIX + id;
  const layerId = CUSTOM_LAYER_PREFIX + id + '-layer';
  if (map.getLayer(layerId)) map.removeLayer(layerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);
}
