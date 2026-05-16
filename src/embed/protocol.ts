/**
 * postMessage protocol v1 — shared shape used by both the in-iframe bridge
 * and the embed.js host SDK.
 *
 * Host → Iframe (command):
 *   { source, v, id, method, args }
 *
 * Iframe → Host (response):
 *   { source, v, replyTo, ok: true, result }      // success
 *   { source, v, replyTo, ok: false, error }     // failure
 *
 * Iframe → Host (event push):
 *   { source, v, event, payload }
 */

export const PROTOCOL_SOURCE = 'geojson.app.embed';
export const PROTOCOL_VERSION = 1;

export type EmbedMethod =
  | 'flyTo'
  | 'jumpTo'
  | 'fitBounds'
  | 'setTheme'
  | 'setProjection'
  | 'setGeoJSON'
  | 'addLayer'
  | 'removeLayer'
  | 'clearLayers'
  | 'getCenter'
  | 'getZoom'
  | 'getBearing'
  | 'getBounds';

export type EmbedEventName =
  | 'load'
  | 'move'
  | 'moveend'
  | 'click'
  | 'theme:change'
  | 'projection:change'
  | 'error';

export interface ProtocolCommand {
  source: typeof PROTOCOL_SOURCE;
  v: number;
  id: string;
  method: EmbedMethod;
  args?: unknown;
}

export interface ProtocolResponse {
  source: typeof PROTOCOL_SOURCE;
  v: number;
  replyTo: string;
  ok: boolean;
  result?: unknown;
  error?: { code: string; message: string };
}

export interface ProtocolEvent {
  source: typeof PROTOCOL_SOURCE;
  v: number;
  event: EmbedEventName;
  payload?: unknown;
}

export function isProtocolMessage(data: unknown): data is { source: string; v: number } {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return d.source === PROTOCOL_SOURCE && d.v === PROTOCOL_VERSION;
}
