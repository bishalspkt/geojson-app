import type { StoryDocument, StoryGeoJsonLayer } from '@/types';
import { useLayersStore } from '@/state/layers-store';
import { useImageryStore } from '@/state/imagery-store';
import { useSettingsStore } from '@/state/settings-store';
import { useStoryStore } from '@/state/story-store';
import { loadSource, LoadedData } from '@/extensions/sources/registry';
import { parseStory, storyLayerId } from './schema';
import { applyChapter, chapterIndexOf, chapterVisibility, resetStoryState } from './chapter';

let loadSeq = 0;
/** Background layer fetches running at once. */
const BACKGROUND_CONCURRENCY = 3;

export interface LoadStoryOptions {
  chapter?: number | string;
  /** Resolve only once every layer has loaded (SDK callers). Default: after the opening chapter's layers. */
  waitForAll?: boolean;
}

function absoluteUrl(url: string): string {
  const base = typeof window !== 'undefined' ? window.location.href : 'http://localhost/';
  return new URL(url, base).toString();
}

/**
 * Load a story: fetch + validate the document, add its imagery, load the data
 * layers the opening chapter needs, open that chapter, then stream the other
 * layers in the background. Layers that fail to load are reported, not fatal.
 */
export async function loadStory(url: string, opts: LoadStoryOptions = {}): Promise<StoryDocument> {
  const seq = ++loadSeq;
  const store = useStoryStore.getState();
  const docUrl = absoluteUrl(url);
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

/** Open an already-parsed story (SDK callers may pass documents inline). */
export async function openStory(
  story: StoryDocument,
  opts: LoadStoryOptions & { seq?: number } = {},
): Promise<StoryDocument> {
  const seq = opts.seq ?? ++loadSeq;
  const stale = () => seq !== loadSeq;
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
  const needed = new Set(story.chapters[index].layers);
  const first = dataLayers.filter((l) => needed.has(l.id));
  const rest = dataLayers.filter((l) => !needed.has(l.id));

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

  // Opening chapter first (in parallel), then the story opens.
  const results = await Promise.allSettled(first.map((l) => loadSource({ kind: 'url', url: l.url })));
  if (stale()) return story;
  // Set the index before `ready` so listeners never see the previous story's chapter.
  useStoryStore.getState().setChapterIndex(index);
  useStoryStore.getState().setReady(story);
  first.forEach((layer, i) => {
    const r = results[i];
    if (r.status === 'fulfilled') add(layer, r.value);
    else fail(layer, r.reason);
  });
  applyChapter(story, index);

  // Everything else streams in behind the reader.
  const background = (async () => {
    useStoryStore.getState().setPendingLayers(rest.length);
    let next = 0;
    const worker = async () => {
      while (next < rest.length) {
        const layer = rest[next++];
        try {
          const data = await loadSource({ kind: 'url', url: layer.url });
          if (stale()) return;
          add(layer, data);
        } catch (err) {
          if (stale()) return;
          fail(layer, err);
        }
        useStoryStore.getState().setPendingLayers(useStoryStore.getState().pendingLayers - 1);
      }
    };
    await Promise.all(Array.from({ length: Math.min(BACKGROUND_CONCURRENCY, rest.length) }, worker));
  })();

  if (opts.waitForAll) await background;
  return story;
}

/** Close the open story and remove its layers. */
export function closeStory(): void {
  loadSeq++;
  resetStoryState();
  useStoryStore.getState().close();
}
