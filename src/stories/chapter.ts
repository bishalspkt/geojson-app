import type { StoryChapter, StoryDocument } from '@/types';
import { parseTime } from '@/core/time/temporal';
import { useLayersStore } from '@/state/layers-store';
import { useImageryStore } from '@/state/imagery-store';
import { useCompareStore } from '@/state/compare-store';
import { getMap } from '@/state/map-store';
import { useSettingsStore } from '@/state/settings-store';
import { useTimeStore } from '@/state/time-store';
import { useUiStore } from '@/state/ui-store';
import { useStoryStore } from '@/state/story-store';
import { idList, storyLayerId } from './schema';

const DEFAULT_STORY_DURATION_S = 20;
/** Extra wait after the camera arrives before autoplay starts. */
const AUTOPLAY_SETTLE_MS = 700;
/** Autoplay anyway if the camera never reports arriving (e.g. no map yet). */
const AUTOPLAY_FALLBACK_MS = 12_000;

let autoplayTimer: ReturnType<typeof setTimeout> | null = null;
let autoplayWatch: (() => void) | null = null;

/** Default divider: the middle of the map area the story panel leaves visible. */
function visibleCentre(): number {
  const width = getMap()?.getContainer().clientWidth ?? 0;
  if (!width) return 0.5;
  const { left, right } = useUiStore.getState().viewInsets;
  return Math.min(0.8, Math.max(0.2, (left + (width - left - right) / 2) / width));
}

let dividerWatch: (() => void) | null = null;

/**
 * Keep an untouched divider on the visible centre. The first chapter of a story
 * opened from a link is applied before the story panel has reported its width,
 * so its divider would otherwise stay at the middle of the whole window.
 */
function followVisibleCentre(position: number) {
  dividerWatch?.();
  let expected = position;
  dividerWatch = useUiStore.subscribe(
    (s) => s.viewInsets,
    () => {
      const compare = useCompareStore.getState();
      if (!compare.active || Math.abs(compare.position - expected) > 1e-6) {
        dividerWatch?.(); // the reader moved it, or the swipe ended
        dividerWatch = null;
        return;
      }
      expected = visibleCentre();
      compare.setPosition(expected);
      expected = useCompareStore.getState().position; // after clamping
    },
  );
}

function cancelAutoplay() {
  if (autoplayTimer !== null) {
    clearTimeout(autoplayTimer);
    autoplayTimer = null;
  }
  autoplayWatch?.();
  autoplayWatch = null;
}

/** Start playback shortly after the chapter's camera flight (`seq`) lands. */
function autoplayAfterFlight(seq: number, index: number) {
  const play = () => {
    cancelAutoplay();
    if (useStoryStore.getState().chapterIndex === index) useTimeStore.getState().play();
  };
  const arrived = () => {
    autoplayWatch?.();
    autoplayWatch = null;
    if (autoplayTimer !== null) clearTimeout(autoplayTimer);
    autoplayTimer = setTimeout(play, AUTOPLAY_SETTLE_MS);
  };
  if (useUiStore.getState().focusSettled >= seq) return arrived();
  autoplayWatch = useUiStore.subscribe(
    (s) => s.focusSettled,
    (settled) => settled >= seq && arrived(),
  );
  autoplayTimer = setTimeout(play, AUTOPLAY_FALLBACK_MS);
}

/** Visibility of every story layer for a chapter (compare sides included). */
export function chapterVisibility(story: StoryDocument, chapter: StoryChapter) {
  const visible = new Set(chapter.layers);
  const compareLeft = new Set(idList(chapter.compare?.left));
  for (const id of idList(chapter.compare?.right)) visible.add(id);
  const data: Record<string, boolean> = {};
  const imagery: Record<string, boolean> = {};
  for (const layer of story.layers) {
    if (layer.type === 'geojson') {
      data[storyLayerId(layer.id)] = visible.has(layer.id);
    } else {
      // Left-side imagery renders on the compare map only; hide it on the main map.
      imagery[storyLayerId(layer.id)] = visible.has(layer.id) && !compareLeft.has(layer.id);
    }
  }
  return { data, imagery };
}

/**
 * Put the map into a chapter's state: layer visibility, terrain, compare,
 * timeline, and camera. Pure store updates — the engines reconcile the map.
 */
export function applyChapter(story: StoryDocument, index: number): void {
  const chapter = story.chapters[index];
  if (!chapter) return;
  cancelAutoplay();

  const { data, imagery } = chapterVisibility(story, chapter);
  useLayersStore.getState().setLayersVisibility(data);
  const imageryStore = useImageryStore.getState();
  for (const [id, visible] of Object.entries(imagery)) {
    const layer = imageryStore.layers.find((l) => l.id === id);
    if (layer && layer.visible !== visible) imageryStore.setImageryVisible(id, visible);
  }

  // Terrain: chapters opt in; hillshade follows terrain unless stated.
  const terrain = chapter.terrain ?? false;
  useSettingsStore.getState().setSettings({
    terrain,
    terrainExaggeration: chapter.exaggeration ?? 1.5,
    hillshade: chapter.hillshade ?? terrain,
  });

  // Before/after comparison.
  dividerWatch?.();
  dividerWatch = null;
  if (chapter.compare) {
    useCompareStore.getState().start({
      left: idList(chapter.compare.left).map(storyLayerId),
      leftLabel: chapter.compare.leftLabel ?? null,
      rightLabel: chapter.compare.rightLabel ?? null,
      position: chapter.compare.position ?? visibleCentre(),
      leftOptions: (chapter.compare.leftOptions ?? []).map((o) => ({ ids: idList(o.layers).map(storyLayerId), label: o.label })),
      rightOptions: (chapter.compare.rightOptions ?? []).map((o) => ({ ids: idList(o.layers).map(storyLayerId), label: o.label })),
    });
    if (chapter.compare.position == null) followVisibleCentre(useCompareStore.getState().position);
  } else if (useCompareStore.getState().active) {
    useCompareStore.getState().stop();
  }

  // Timeline.
  const time = useTimeStore.getState();
  if (chapter.time) {
    const start = parseTime(chapter.time.start)!;
    const end = parseTime(chapter.time.end)!;
    const current = parseTime(chapter.time.current) ?? start;
    const window = chapter.time.windowMinutes ? chapter.time.windowMinutes * 60_000 : null;
    time.enable({
      extent: [start, end],
      lockExtent: true,
      current,
      duration: chapter.time.duration ?? DEFAULT_STORY_DURATION_S,
      speed: 1,
      window,
      loop: chapter.time.loop ?? false,
      timeZone: chapter.time.timeZone ?? null,
      playing: false,
      follow: chapter.time.follow
        ? {
            layerId: storyLayerId(chapter.time.follow.layer),
            zoom: chapter.time.follow.zoom,
            pitch: chapter.time.follow.pitch,
            bearing: chapter.time.follow.bearing,
            maxViewSpeed: chapter.time.follow.maxViewSpeed,
          }
        : null,
      captions: (chapter.time.captions ?? []).map((c) => ({ t: parseTime(c.time)!, text: c.text })),
    });
  } else if (time.enabled || time.extentLocked) {
    time.disable();
    time.configure({ lockExtent: false, window: null, timeZone: null });
  }

  const seq = useUiStore.getState().requestFocus({ kind: 'camera', ...chapter.camera });
  useStoryStore.getState().setChapterIndex(index);
  if (chapter.time?.autoplay) autoplayAfterFlight(seq, index);
}

/** Resolve a chapter reference (index or id) to an index, or -1. */
export function chapterIndexOf(story: StoryDocument, ref: number | string): number {
  if (typeof ref === 'number') return ref >= 0 && ref < story.chapters.length ? ref : -1;
  const asNumber = Number(ref);
  if (ref.trim() !== '' && Number.isInteger(asNumber)) return chapterIndexOf(story, asNumber);
  return story.chapters.findIndex((c) => c.id === ref);
}

export function goToChapter(ref: number | string): boolean {
  const story = useStoryStore.getState().story;
  if (!story) return false;
  const index = chapterIndexOf(story, ref);
  if (index < 0) return false;
  applyChapter(story, index);
  return true;
}

/** Leave story mode: drop story layers and restore neutral map state. */
export function resetStoryState(): void {
  cancelAutoplay();
  useLayersStore.getState().clearLayers({ origin: 'story' });
  useImageryStore.getState().clearImagery({ origin: 'story' });
  useCompareStore.getState().stop();
  const time = useTimeStore.getState();
  time.disable();
  time.configure({ lockExtent: false, window: null, timeZone: null });
}
