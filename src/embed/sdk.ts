/**
 * GeoJSON.app Embed SDK
 *
 * Usage:
 *   <script src="https://geojson.app/embed.js"></script>
 *   <script>
 *     GeoJSONApp("create", {
 *       element: "#my-map",
 *       center: [144.9, -37.8],
 *       zoom: 10,
 *       theme: "dark",
 *       geojson: "https://example.com/data.geojson",
 *     });
 *   </script>
 */

interface EmbedOptions {
  element: string | HTMLElement;
  center?: [number, number];
  zoom?: number;
  theme?: 'light' | 'dark' | 'white' | 'grayscale' | 'black';
  projection?: 'mercator' | 'globe';
  geojson?: string;
  interactive?: boolean;
  controls?: boolean;
  width?: string;
  height?: string;
}

interface EmbedInstance {
  iframe: HTMLIFrameElement;
  destroy: () => void;
}

const ORIGIN = (() => {
  const scripts = document.getElementsByTagName('script');
  for (let i = scripts.length - 1; i >= 0; i--) {
    const src = scripts[i].src;
    if (src && src.includes('embed.js')) {
      try {
        const url = new URL(src);
        return url.origin;
      } catch {
        break;
      }
    }
  }
  return 'https://geojson.app';
})();

function buildEmbedUrl(options: EmbedOptions): string {
  const params = new URLSearchParams();
  params.set('embed', '1');

  if (options.center) {
    params.set('center', options.center.join(','));
  }
  if (options.zoom != null) {
    params.set('zoom', String(options.zoom));
  }
  if (options.theme) {
    params.set('theme', options.theme);
  }
  if (options.projection) {
    params.set('projection', options.projection);
  }
  if (options.geojson) {
    params.set('geojson', options.geojson);
  }
  if (options.interactive === false) {
    params.set('interactive', 'false');
  }
  if (options.controls) {
    params.set('controls', 'true');
  }

  return `${ORIGIN}/?${params.toString()}`;
}

function resolveElement(el: string | HTMLElement): HTMLElement | null {
  if (typeof el === 'string') {
    return document.querySelector(el);
  }
  return el;
}

function createEmbed(options: EmbedOptions): EmbedInstance {
  const container = resolveElement(options.element);
  if (!container) {
    throw new Error(`[geojson.app] Element not found: ${options.element}`);
  }

  const iframe = document.createElement('iframe');
  iframe.src = buildEmbedUrl(options);
  iframe.style.width = options.width || '100%';
  iframe.style.height = options.height || '100%';
  iframe.style.border = 'none';
  iframe.style.display = 'block';
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute(
    'allow',
    'geolocation; clipboard-write',
  );
  iframe.setAttribute('loading', 'lazy');
  iframe.title = 'GeoJSON.app Map';

  // Ensure container has dimensions if it's empty
  if (!container.style.minHeight && container.offsetHeight === 0) {
    container.style.minHeight = '400px';
  }

  container.appendChild(iframe);

  // ResizeObserver for responsive sizing
  let observer: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
    });
    observer.observe(container);
  }

  return {
    iframe,
    destroy() {
      observer?.disconnect();
      iframe.remove();
    },
  };
}

// Public API — queued command pattern (like GTM, Cal.com, etc.)
type Command = ['create', EmbedOptions];
type QueuedFn = {
  (...args: Command): void;
  q?: Command[];
  _instances?: Map<string | HTMLElement, EmbedInstance>;
};

function processCommand(args: Command) {
  const [action, options] = args;
  if (action === 'create') {
    const instance = createEmbed(options);
    const api = (window as unknown as Record<string, unknown>).GeoJSONApp as QueuedFn;
    if (!api._instances) api._instances = new Map();
    api._instances.set(options.element, instance);
  }
}

function init() {
  const existing = (window as unknown as Record<string, unknown>).GeoJSONApp as QueuedFn | undefined;
  const queue = existing?.q || [];

  const api: QueuedFn = function (...args: Command) {
    processCommand(args);
  };

  api.q = [];
  api._instances = existing?._instances || new Map();
  (window as unknown as Record<string, unknown>).GeoJSONApp = api;

  // Process any queued commands
  for (const cmd of queue) {
    processCommand(cmd);
  }
}

// Auto-init when script loads
init();
