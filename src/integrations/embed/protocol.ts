/**
 * postMessage protocol v1 — shared shape used by both the in-iframe bridge
 * and the embed.js host SDK.
 *
 * Host → Iframe (command):
 *   { source, v, id, method, args }
 *
 * Iframe → Host (response):
 *   { source, v, replyTo, ok: true, result }      // success
 *   { source, v, replyTo, ok: false, error }      // failure
 *
 * Iframe → Host (event push):
 *   { source, v, event, payload }
 *
 * The envelope and the v1 method/event names are FROZEN (see
 * docs/developers-api.md → stability guarantees). New methods may be added;
 * existing ones never change shape within v1.
 */
import type { CommandName, EventName } from '../commands';

export const PROTOCOL_SOURCE = 'geojson.app.embed';
export const PROTOCOL_VERSION = 1;

/** Protocol methods are exactly the canonical command names. */
export type EmbedMethod = CommandName;
export type EmbedEventName = EventName;

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
