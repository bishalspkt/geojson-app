import { ingest } from '@/extensions/sources/registry';
import { loadStory } from '@/stories';
import { notify } from '@/state/notify-store';
import { EmbedConfig } from '../embed/params';
import { PRIMARY_LAYER_ID } from '../commands';

/**
 * One-shot transport: load `?geojson=<url>` and/or `?story=<url>` into the
 * map at startup. Works both in embed mode and on shareable main-app links
 * (https://geojson.app/?geojson=…, https://geojson.app/?story=…).
 */
let started = false;

export function loadFromUrlParams(config: EmbedConfig): void {
  if (!config.geojsonUrl && !config.storyUrl) return;
  // One-shot per page load (guards React StrictMode's double-run of effects).
  if (started) return;
  started = true;

  if (config.storyUrl) {
    loadStory(config.storyUrl, { chapter: config.storyChapter ?? undefined }).catch((err: unknown) => {
      console.error('[geojson.app] Failed to load story from URL:', err);
      notify(`Couldn't open the story: ${err instanceof Error ? err.message : String(err)}`);
    });
  }
  if (!config.geojsonUrl) return;

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
    notify(`Couldn't load data from the link: ${err instanceof Error ? err.message : String(err)}`);
  });
}
