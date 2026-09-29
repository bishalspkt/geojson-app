import type { StoryDocument, StoryGeoJsonLayer } from '@/types';
import { useLayersStore } from '@/state/layers-store';
import { useImageryStore } from '@/state/imagery-store';
import { useSettingsStore } from '@/state/settings-store';
import { useStoryStore } from '@/state/story-store';
import { loadSource, LoadedData } from '@/extensions/sources/registry';
import { parseStory, storyLayerId } from './schema';
import { applyChapter, chapterDataLayers, chapterIndexOf, chapterVisibility, resetStoryState } from './chapter';
import { resolveStoryRef } from './ref';

let loadSeq = 0;
/** Stops following the open story's chapters (layer loading). */
let stopFollowing: (() => void) | null = null;

export interface LoadStoryOptions {
  chapter?: number | string;
  /** Resolve only once every layer has loaded (SDK callers). Default: after the opening chapter's layers. */
  waitForAll?: boolean;
}

/**
 * Load a story: fetch + validate the document, add its imagery, load the data
 * layers the opening chapter needs and open that chapter. Other layers load as
 * the reader gets near them (see `openStory`). Layers that fail to load are
 * reported, not fatal. `url` may be a built-in story's slug (`resolveStoryRef`).
 */
export async function loadStory(url: string, opts: LoadStoryOptions = {}): Promise<StoryDocument> {
  const seq = ++loadSeq;
  const store = useStoryStore.getState();
  const docUrl = resolveStoryRef(url, typeof window !== 'undefined' ? window.location.href : 'http://localhost/');
  store.setLoading(docUrl);

  try {
    const response = await fetch(docUrl);
    if (!response.ok) throw new Error(`Story fetch failed: ${response.status}`);
    const story = parseStory(await response.json(), docUrl);
    return await openStory(story, { ...opts, seq });
  } catch (err) {
    if (seq === loadSeq) {
      useStoryStore.getState().setError(err instanceof Error ? err.message : String(err));
    }
    throw err;
  }
}

/**
 * Open an already-parsed story (SDK callers may pass documents inline).
 *
 * Data layers load on demand so low-end devices only download, parse and hold
 * what the reader is near: the opening chapter's layers before it opens, the
 * next chapter's right after, and so on as the reader moves. Layers no chapter
 * uses are only loaded for `waitForAll`.
 */
export async function openStory(
  story: StoryDocument,
  opts: LoadStoryOptions & { seq?: number } = {},
): Promise<StoryDocument> {
  const seq = opts.seq ?? ++loadSeq;
  const stale = () => seq !== loadSeq;
  stopFollowing?.();
  stopFollowing = null;
  resetStoryState();
  if (story.theme) useSettingsStore.getState().setTheme(story.theme);

  const imagery = useImageryStore.getState();
  for (const layer of story.layers) {
    if (layer.type !== 'imagery') continue;
    imagery.addImagery({
      id: storyLayerId(layer.id),
      name: layer.name,
      source: layer.source,
      opacity: layer.opacity ?? 1,
      visible: false,
      origin: 'story',
      attribution: layer.attribution,
      description: layer.description,
      time: layer.time,
      legend: layer.legend,
      placement: layer.placement,
      adjust: layer.adjust,
    });
  }

  const found = chapterIndexOf(story, opts.chapter ?? 0);
  const index = found >= 0 ? found : 0;
  const dataLayers = story.layers.filter((l): l is StoryGeoJsonLayer => l.type === 'geojson');
  const order = dataLayers.map((l) => storyLayerId(l.id));
  const byId = new Map(dataLayers.map((l) => [l.id, l]));
  const layersOf = (i: number) =>
    story.chapters[i] ? chapterDataLayers(story.chapters[i]).flatMap((id) => byId.get(id) ?? []) : [];

  /** Add a loaded layer, visible iff the chapter being read right now shows it. */
  const add = (layer: StoryGeoJsonLayer, data: LoadedData) => {
    const current = useStoryStore.getState().story === story ? useStoryStore.getState().chapterIndex : index;
    const visible = chapterVisibility(story, story.chapters[current]).data[storyLayerId(layer.id)] ?? false;
    useLayersStore.getState().addLayer(data.collection, {
      layerId: storyLayerId(layer.id),
      name: layer.name,
      origin: 'story',
      visible,
      paint: layer.paint,
      display: layer.display,
      temporal: layer.temporal === false ? undefined : layer.temporal,
      legend: layer.legend,
      attribution: layer.attribution,
    });
    useLayersStore.getState().reorderLayers(order);
  };
  const fail = (layer: StoryGeoJsonLayer, reason: unknown) => {
    const message = `${layer.name}: ${reason instanceof Error ? reason.message : String(reason)}`;
    console.warn('[geojson.app story] layer failed:', message);
    useStoryStore.getState().addLayerError(message);
  };

  // Each layer is fetched once (a failure is reported once) and added once.
  const loads = new Map<string, Promise<LoadedData | null>>();
  const added = new Set<string>();
  const pending = (delta: number) => {
    if (!stale()) useStoryStore.getState().setPendingLayers(useStoryStore.getState().pendingLayers + delta);
  };
  const fetchLayer = (layer: StoryGeoJsonLayer): Promise<LoadedData | null> => {
    let load = loads.get(layer.id);
    if (!load) {
      pending(1);
      load = loadSource({ kind: 'url', url: layer.url })
        .catch((err: unknown) => {
          if (!stale()) fail(layer, err);
          return null;
        })
        .finally(() => pending(-1));
      loads.set(layer.id, load);
    }
    return load;
  };
  const addOnce = (layer: StoryGeoJsonLayer, data: LoadedData | null) => {
    if (!data || stale() || added.has(layer.id)) return;
    added.add(layer.id);
    add(layer, data);
  };
  const load = (layers: StoryGeoJsonLayer[]) =>
    Promise.all(layers.map(async (layer) => addOnce(layer, await fetchLayer(layer))));
  /** The chapter being read, then (prefetched) the one after it. */
  const loadAround = async (i: number) => {
    await load(layersOf(i));
    if (!stale()) await load(layersOf(i + 1));
  };

  // The opening chapter's layers (in parallel), then the story opens with them.
  const opening = layersOf(index);
  const results = await Promise.all(opening.map(fetchLayer));
  if (stale()) return story;
  // Set the index before `ready` so listeners never see the previous story's chapter.
  useStoryStore.getState().setChapterIndex(index);
  useStoryStore.getState().setReady(story);
  opening.forEach((layer, i) => addOnce(layer, results[i]));
  applyChapter(story, index);

  stopFollowing = useStoryStore.subscribe(
    (s) => s.chapterIndex,
    (i) => {
      if (!stale()) void loadAround(i);
    },
  );
  const around = loadAround(index);
  if (opts.waitForAll) await Promise.all([around, load(dataLayers)]);
  return story;
}

/** Close the open story and remove its layers. */
export function closeStory(): void {
  loadSeq++;
  stopFollowing?.();
  stopFollowing = null;
  resetStoryState();
  useStoryStore.getState().close();
}
