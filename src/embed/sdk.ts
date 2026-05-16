/**
 * GeoJSON.app Embed SDK (v2)
 *
 * Usage — one-shot (legacy):
 *   <script src="https://geojson.app/embed.js"></script>
 *   <script>
 *     GeoJSONApp("create", {
 *       element: "#my-map",
 *       geojson: "https://example.com/data.geojson",
 *       theme: "dark",
 *     });
 *   </script>
 *
 * Usage — imperative:
 *   const map = GeoJSONApp("create", {
 *     element: "#my-map",
 *     chrome: "none",
 *     interactive: true,
 *   });
 *   await map.ready();
 *   await map.flyTo({ center: [85.32, 27.71], zoom: 11, duration: 800 });
 *   const off = map.on("click", ({ lngLat, features }) => console.log(lngLat));
 */

import {
  PROTOCOL_SOURCE,
  PROTOCOL_VERSION,
  ProtocolCommand,
  ProtocolEvent,
  ProtocolResponse,
  EmbedEventName,
  EmbedMethod,
  isProtocolMessage,
} from './protocol';

// ---------- Public types ----------

type LngLat = [number, number];
type Bounds = [LngLat, LngLat];

// `unknown`-typed GeoJSON. Embedders pass MapLibre/GeoJSON objects; we don't
// pull in @types/geojson here to keep the bundle small.
type GeoJSONInput = string | Record<string, unknown>;

export interface EmbedOptions {
  element: string | HTMLElement;
  center?: LngLat;
  zoom?: number;
  theme?: 'light' | 'dark' | 'white' | 'grayscale' | 'black';
  projection?: 'mercator' | 'globe';
  geojson?: string;
  interactive?: boolean;
  /** @deprecated use `chrome` instead. `true` ≡ `chrome: 'full'`. */
  controls?: boolean;
  chrome?: 'full' | 'minimal' | 'none';
  attribution?: 'visible' | 'compact';
  width?: string;
  height?: string;
}

export interface FlyToArgs {
  center?: LngLat;
  zoom?: number;
  bearing?: number;
  pitch?: number;
  duration?: number;
}

export interface JumpToArgs {
  center?: LngLat;
  zoom?: number;
  bearing?: number;
  pitch?: number;
}

export interface FitBoundsArgs {
  padding?: number;
  duration?: number;
  maxZoom?: number;
}

export interface AddLayerArgs {
  id: string;
  data: GeoJSONInput;
  paint?: Record<string, unknown>;
}

export type EmbedInstance = {
  iframe: HTMLIFrameElement;
  destroy(): void;

  ready(): Promise<void>;

  flyTo(opts: FlyToArgs): Promise<void>;
  jumpTo(opts: JumpToArgs): Promise<void>;
  fitBounds(bounds: Bounds, opts?: FitBoundsArgs): Promise<void>;

  setTheme(theme: NonNullable<EmbedOptions['theme']>): Promise<void>;
  setProjection(projection: NonNullable<EmbedOptions['projection']>): Promise<void>;

  setGeoJSON(data: GeoJSONInput): Promise<void>;
  addLayer(spec: AddLayerArgs): Promise<void>;
  removeLayer(id: string): Promise<void>;
  clearLayers(): Promise<void>;

  getCenter(): Promise<LngLat>;
  getZoom(): Promise<number>;
  getBearing(): Promise<number>;
  getBounds(): Promise<Bounds>;

  on(event: EmbedEventName, cb: (payload: unknown) => void): () => void;
  off(event: EmbedEventName, cb: (payload: unknown) => void): void;
};

// ---------- Internal helpers ----------

const ORIGIN = (() => {
  const scripts = document.getElementsByTagName('script');
  for (let i = scripts.length - 1; i >= 0; i--) {
    const src = scripts[i].src;
    if (src && src.includes('embed.js')) {
      try {
        return new URL(src).origin;
      } catch {
        break;
      }
    }
  }
  return 'https://geojson.app';
})();

const DEFAULT_TIMEOUT_MS = 5000;

function uuid(): string {
  // RFC4122-ish v4. Good enough for correlation; not security-sensitive.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function buildEmbedUrl(options: EmbedOptions): string {
  const params = new URLSearchParams();
  params.set('embed', '1');

  if (options.center) params.set('center', options.center.join(','));
  if (options.zoom != null) params.set('zoom', String(options.zoom));
  if (options.theme) params.set('theme', options.theme);
  if (options.projection) params.set('projection', options.projection);
  if (options.geojson) params.set('geojson', options.geojson);
  if (options.interactive === false) params.set('interactive', 'false');

  if (options.chrome) {
    params.set('chrome', options.chrome);
  } else if (options.controls) {
    // Legacy back-compat: controls=true → chrome=full
    params.set('controls', 'true');
  }
  if (options.attribution) params.set('attribution', options.attribution);

  return `${ORIGIN}/?${params.toString()}`;
}

function resolveElement(el: string | HTMLElement): HTMLElement | null {
  return typeof el === 'string' ? document.querySelector(el) : el;
}

// ---------- Per-iframe controller ----------

interface Pending {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

function createController(iframe: HTMLIFrameElement, expectedOrigin: string) {
  const pending = new Map<string, Pending>();
  const listeners = new Map<EmbedEventName, Set<(payload: unknown) => void>>();
  const preReadyQueue: Array<() => void> = [];
  let isReady = false;
  let destroyed = false;

  let readyResolve!: () => void;
  let readyReject!: (err: Error) => void;
  const readyPromise = new Promise<void>((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  // Swallow unhandled rejection if no caller awaits ready() before destroy.
  readyPromise.catch(() => {});

  function onMessage(ev: MessageEvent) {
    // Only accept messages from our iframe's window.
    if (ev.source !== iframe.contentWindow) return;
    if (!isProtocolMessage(ev.data)) return;
    // Loose origin check — strict equality fails for some sandboxed cases. We
    // already verified the source window above, which is the strong guarantee.
    if (expectedOrigin !== '*' && ev.origin && ev.origin !== expectedOrigin) return;

    const data = ev.data as ProtocolResponse | ProtocolEvent;

    if ('replyTo' in data && typeof data.replyTo === 'string') {
      const entry = pending.get(data.replyTo);
      if (!entry) return;
      clearTimeout(entry.timer);
      pending.delete(data.replyTo);
      if (data.ok) {
        entry.resolve(data.result);
      } else {
        const err = data.error ?? { code: 'unknown', message: 'Unknown error' };
        entry.reject(makeEmbedError(err.code, err.message));
      }
      return;
    }

    if ('event' in data && typeof data.event === 'string') {
      const name = data.event as EmbedEventName;
      if (name === 'load' && !isReady) {
        isReady = true;
        readyResolve();
        const queued = preReadyQueue.splice(0);
        for (const run of queued) run();
      }
      const set = listeners.get(name);
      if (set) {
        for (const cb of Array.from(set)) {
          try {
            cb(data.payload);
          } catch (err) {
            console.error('[geojson.app embed] listener threw:', err);
          }
        }
      }
    }
  }

  window.addEventListener('message', onMessage);

  function call<T = unknown>(method: EmbedMethod, args?: unknown, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
    if (destroyed) {
      return Promise.reject(makeEmbedError('destroyed', 'Embed instance has been destroyed'));
    }

    const dispatch = (): Promise<T> => {
      const target = iframe.contentWindow;
      if (!target) {
        return Promise.reject(makeEmbedError('detached', 'iframe is detached'));
      }
      return new Promise<T>((resolve, reject) => {
        const id = uuid();
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(makeEmbedError('timeout', `${method} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        pending.set(id, {
          resolve: (v) => resolve(v as T),
          reject,
          timer,
        });
        const cmd: ProtocolCommand = {
          source: PROTOCOL_SOURCE,
          v: PROTOCOL_VERSION,
          id,
          method,
          args,
        };
        try {
          target.postMessage(cmd, expectedOrigin === '*' ? '*' : expectedOrigin);
        } catch (err) {
          clearTimeout(timer);
          pending.delete(id);
          reject(makeEmbedError('postmessage_failed', err instanceof Error ? err.message : String(err)));
        }
      });
    };

    if (isReady) return dispatch();

    // Buffer commands issued before the map fires `load`.
    return new Promise<T>((resolve, reject) => {
      preReadyQueue.push(() => dispatch().then(resolve, reject));
    });
  }

  function on(event: EmbedEventName, cb: (payload: unknown) => void): () => void {
    let set = listeners.get(event);
    if (!set) {
      set = new Set();
      listeners.set(event, set);
    }
    set.add(cb);
    return () => off(event, cb);
  }

  function off(event: EmbedEventName, cb: (payload: unknown) => void): void {
    listeners.get(event)?.delete(cb);
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    window.removeEventListener('message', onMessage);
    for (const entry of pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(makeEmbedError('destroyed', 'Embed instance has been destroyed'));
    }
    pending.clear();
    listeners.clear();
    if (!isReady) readyReject(makeEmbedError('destroyed', 'Embed destroyed before ready'));
  }

  return { call, on, off, ready: () => readyPromise, destroy };
}

function makeEmbedError(code: string, message: string): Error & { code: string } {
  const err = new Error(`[geojson.app embed] ${message}`) as Error & { code: string };
  err.code = code;
  return err;
}

// ---------- create() ----------

function createEmbed(options: EmbedOptions): EmbedInstance {
  const container = resolveElement(options.element);
  if (!container) {
    throw new Error(`[geojson.app] Element not found: ${String(options.element)}`);
  }

  const iframe = document.createElement('iframe');
  iframe.src = buildEmbedUrl(options);
  iframe.style.width = options.width || '100%';
  iframe.style.height = options.height || '100%';
  iframe.style.border = 'none';
  iframe.style.display = 'block';
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('allow', 'geolocation; clipboard-write');
  iframe.setAttribute('loading', 'lazy');
  iframe.title = 'GeoJSON.app Map';

  if (!container.style.minHeight && container.offsetHeight === 0) {
    container.style.minHeight = '400px';
  }

  container.appendChild(iframe);

  let observer: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
    });
    observer.observe(container);
  }

  const controller = createController(iframe, ORIGIN);

  const instance: EmbedInstance = {
    iframe,
    destroy() {
      observer?.disconnect();
      controller.destroy();
      iframe.remove();
    },
    ready: () => controller.ready(),

    flyTo: (args) => controller.call('flyTo', args).then(() => undefined),
    jumpTo: (args) => controller.call('jumpTo', args).then(() => undefined),
    fitBounds: (bounds, opts) =>
      controller.call('fitBounds', { bounds, ...(opts ?? {}) }).then(() => undefined),

    setTheme: (theme) => controller.call('setTheme', { theme }).then(() => undefined),
    setProjection: (projection) =>
      controller.call('setProjection', { projection }).then(() => undefined),

    setGeoJSON: (data) => controller.call('setGeoJSON', { data }).then(() => undefined),
    addLayer: (spec) => controller.call('addLayer', spec).then(() => undefined),
    removeLayer: (id) => controller.call('removeLayer', { id }).then(() => undefined),
    clearLayers: () => controller.call('clearLayers').then(() => undefined),

    getCenter: () => controller.call<LngLat>('getCenter'),
    getZoom: () => controller.call<number>('getZoom'),
    getBearing: () => controller.call<number>('getBearing'),
    getBounds: () => controller.call<Bounds>('getBounds'),

    on: (event, cb) => controller.on(event, cb),
    off: (event, cb) => controller.off(event, cb),
  };

  return instance;
}

// ---------- Public API — queued command + return-value pattern ----------

type Command = ['create', EmbedOptions];
type QueuedFn = {
  // The runtime function can be called as a command tag OR return an
  // EmbedInstance when invoked synchronously with ("create", opts).
  (...args: Command): EmbedInstance;
  q?: Command[];
  _instances?: Map<string | HTMLElement, EmbedInstance>;
};

function processCommand(args: Command): EmbedInstance | undefined {
  const [action, options] = args;
  if (action === 'create') {
    const instance = createEmbed(options);
    const api = (window as unknown as Record<string, unknown>).GeoJSONApp as QueuedFn;
    if (!api._instances) api._instances = new Map();
    api._instances.set(options.element, instance);
    return instance;
  }
  return undefined;
}

function init() {
  const existing = (window as unknown as Record<string, unknown>).GeoJSONApp as QueuedFn | undefined;
  const queue = existing?.q || [];

  const api: QueuedFn = function (...args: Command) {
    return processCommand(args) as EmbedInstance;
  };
  api.q = [];
  api._instances = existing?._instances || new Map();
  (window as unknown as Record<string, unknown>).GeoJSONApp = api;

  for (const cmd of queue) {
    processCommand(cmd);
  }
}

init();
