import { setWorkerUrl } from 'maplibre-gl';

declare const __MAPLIBRE_WORKER_DEV__: string;

let configured = false;

/**
 * Call before creating the first map. In production MapLibre is served
 * unbundled (vite.config.ts `maplibreVendor`) and finds its worker next to
 * itself. The dev server pre-bundles MapLibre, so point it at the worker file
 * explicitly.
 */
export function configureMapLibre(): void {
  if (configured) return;
  configured = true;
  if (import.meta.env.DEV) setWorkerUrl(new URL(__MAPLIBRE_WORKER_DEV__, window.location.origin).href);
}
