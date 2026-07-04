import maplibregl from 'maplibre-gl';
import { Feature } from 'geojson';
import { useLayersStore } from '@/state/layers-store';
import { useSettingsStore } from '@/state/settings-store';
import { whenMapReady } from '@/state/map-store';
import { queryDataFeatures } from '@/core/layers/interactions';
import { executeCommand } from '../executor';
import { isCommandName } from '../commands';
import {
  PROTOCOL_SOURCE,
  PROTOCOL_VERSION,
  ProtocolCommand,
  ProtocolEvent,
  ProtocolResponse,
  EmbedEventName,
  isProtocolMessage,
} from './protocol';

type LngLat = [number, number];
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

/** Strip internal bookkeeping before features cross the protocol boundary. */
function cleanFeature(f: { geometry: unknown; properties: unknown }): Feature {
  const properties = { ...(f.properties as Record<string, unknown> | null) };
  delete properties._fid;
  delete properties._search_result;
  return { type: 'Feature', geometry: f.geometry, properties } as Feature;
}

/**
 * The in-iframe half of the embed protocol: receives commands from the host
 * page, executes them via the shared command executor, and pushes events back.
 * Framework-agnostic — started once from the app shell when embed mode is on.
 */
export function startEmbedBridge(): () => void {
  const parent = window.parent !== window ? window.parent : null;
  if (!parent) return () => {};

  const cleanups: (() => void)[] = [];

  // ---- Settings change events ----
  cleanups.push(
    useSettingsStore.subscribe(
      (s) => s.theme,
      (theme) => emit(parent, 'theme:change', { theme }),
    ),
  );
  cleanups.push(
    useSettingsStore.subscribe(
      (s) => s.projection,
      (projection) => emit(parent, 'projection:change', { projection }),
    ),
  );

  // ---- Map-driven events: load, move, moveend, click ----
  cleanups.push(
    whenMapReady((m) => {
      emit(parent, 'load');

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
          bounds: [
            [b.getWest(), b.getSouth()],
            [b.getEast(), b.getNorth()],
          ] as Bounds,
        });
      };

      const onClick = (e: maplibregl.MapMouseEvent) => {
        // Only surface data-layer features, never the basemap.
        const features = queryDataFeatures(m, useLayersStore.getState().layers, e.point).map(
          cleanFeature,
        );
        emit(parent, 'click', { lngLat: [e.lngLat.lng, e.lngLat.lat] as LngLat, features });
      };

      m.on('move', onMove);
      m.on('moveend', onMoveEnd);
      m.on('click', onClick);
      cleanups.push(() => {
        m.off('move', onMove);
        m.off('moveend', onMoveEnd);
        m.off('click', onClick);
      });
    }),
  );

  // ---- Command handling ----
  const onMessage = (ev: MessageEvent) => {
    if (!isProtocolMessage(ev.data)) return;
    const msg = ev.data as ProtocolCommand;
    if (typeof msg.id !== 'string' || typeof msg.method !== 'string') return;

    const fail = (message: string) => {
      respondErr(parent, msg.id, 'method_failed', message);
      emit(parent, 'error', { code: 'method_failed', message, where: msg.method });
    };

    if (!isCommandName(msg.method)) {
      fail(`Unknown method "${msg.method}"`);
      return;
    }

    executeCommand(msg.method, msg.args)
      .then((value) => respondOk(parent, msg.id, value))
      .catch((err: unknown) => fail(err instanceof Error ? err.message : String(err)));
  };

  window.addEventListener('message', onMessage);
  cleanups.push(() => window.removeEventListener('message', onMessage));

  return () => {
    for (const cleanup of cleanups.reverse()) cleanup();
  };
}
