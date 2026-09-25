import { ingest, type IngestResult, type SourceInput } from '@/extensions/sources/registry';
import type { LayerOrigin } from '@/types';
import { useMapStore } from '@/state/map-store';
import { useStoryStore } from '@/state/story-store';
import { closeStory } from '@/stories';
import { track } from '@/lib/analytics';
import { setPanelWithPolicy } from './panel-policy';

export type ImportSource = 'file_upload' | 'drag_and_drop' | 'url' | 'sample';

const ORIGIN: Record<ImportSource, LayerOrigin> = {
  file_upload: 'upload',
  drag_and_drop: 'upload',
  url: 'url',
  sample: 'sample',
};

/**
 * The user importing data from the UI (file picker, drop, link, demo):
 * replaces what's on the map — an open story included — shows the layers
 * panel, and records the import.
 */
export async function importData(
  input: SourceInput,
  { source, name, props = {} }: { source: ImportSource; name?: string; props?: Record<string, unknown> },
): Promise<IngestResult> {
  if (useStoryStore.getState().status !== 'idle') await closeStory();
  const result = await ingest(input, { replace: true, origin: ORIGIN[source], name });
  setPanelWithPolicy('layers');
  const center = useMapStore.getState().map?.getCenter();
  track('geojson_uploaded', {
    source,
    feature_count: result.featureCount,
    map_center_lat: center?.lat ?? null,
    map_center_lng: center?.lng ?? null,
    ...props,
  });
  return result;
}

/** A readable message for a failed import of `what` ("the link", `"file.json"`). */
export function importErrorMessage(err: unknown, what: string): string {
  const detail = err instanceof Error ? err.message : String(err);
  if (detail.includes('No source provider')) return `Couldn't load ${what} — use a .json or .geojson file under 25 MB.`;
  if (err instanceof SyntaxError) return `Couldn't load ${what}: it isn't valid JSON.`;
  return `Couldn't load ${what}: ${detail}`;
}

export function fileProps(file: File): Record<string, unknown> {
  return { file_name: file.name, file_size_bytes: file.size };
}
