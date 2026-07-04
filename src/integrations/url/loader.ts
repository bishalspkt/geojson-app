import { ingest } from '@/extensions/sources/registry';
import { EmbedConfig } from '../embed/params';
import { PRIMARY_LAYER_ID } from '../executor';

/**
 * One-shot transport: load `?geojson=<url>` into the map at startup.
 * Works both in embed mode and on shareable main-app links
 * (https://geojson.app/?geojson=…).
 */
let started = false;

export function loadFromUrlParams(config: EmbedConfig): void {
  if (!config.geojsonUrl) return;
  // One-shot per page load (guards React StrictMode's double-run of effects).
  if (started) return;
  started = true;

  ingest(
    { kind: 'url', url: config.geojsonUrl },
    {
      origin: 'url',
      // In embed mode this is the primary dataset that setGeoJSON replaces.
      layerId: config.enabled ? PRIMARY_LAYER_ID : undefined,
      fit: true,
    },
  ).catch((err: unknown) => {
    console.error('[geojson.app] Failed to load GeoJSON from URL:', err);
  });
}
