import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLayersStore, resetLayerIdCounter } from '@/state/layers-store';
import { useImageryStore } from '@/state/imagery-store';
import { useCompareStore } from '@/state/compare-store';
import { useSettingsStore, DEFAULT_SETTINGS } from '@/state/settings-store';
import { useTimeStore } from '@/state/time-store';
import { useUiStore } from '@/state/ui-store';
import { useStoryStore } from '@/state/story-store';
import { registerSourceProvider } from '@/extensions/sources/registry';
import { geojsonUrlProvider } from '@/extensions/sources/builtin/geojson';
import { parseStory, StoryError } from './schema';
import { chapterIndexOf, chapterVisibility, goToChapter } from './chapter';
import { closeStory, loadStory } from './loader';

registerSourceProvider(geojsonUrlProvider);

const BASE = 'https://geojson.app/stories/demo/story.json';

const doc = () => ({
  version: 1,
  title: 'Demo',
  theme: 'dark',
  layers: [
    { id: 'rivers', type: 'geojson', name: 'Rivers', url: 'data/rivers.geojson' },
    {
      id: 'villages',
      type: 'geojson',
      name: 'Villages',
      url: 'data/villages.geojson',
      temporal: { startField: 'arrival' },
      display: { labelField: 'name' },
    },
    {
      id: 'before',
      type: 'imagery',
      name: 'Before',
      source: { type: 'image', url: 'img/before.jpg', coordinates: [[85, 28], [86, 28], [86, 27], [85, 27]] },
    },
    {
      id: 'after',
      type: 'imagery',
      name: 'After',
      source: { type: 'xyz', tiles: ['https://tiles.example/{time}/{z}/{x}/{y}.jpg'] },
      time: { format: 'date', default: '2024-10-05' },
    },
  ],
  chapters: [
    { id: 'intro', title: 'Intro', body: 'Hello', camera: { center: [85.3, 27.7], zoom: 7 }, layers: ['rivers'] },
    {
      id: 'flow',
      title: 'Flow',
      body: 'Watch',
      camera: { center: [85.5, 27.9], zoom: 12, pitch: 60, bearing: 30, duration: 10 },
      layers: ['rivers', 'villages'],
      terrain: true,
      exaggeration: 2,
      time: { start: '2024-08-16T14:00:00+05:45', end: '2024-08-16T16:00:00+05:45', duration: 12, windowMinutes: 30, autoplay: false, timeZone: 'Asia/Kathmandu' },
    },
    {
      id: 'compare',
      title: 'Before/after',
      body: '',
      camera: { center: [85.5, 27.9], zoom: 13 },
      layers: ['villages'],
      compare: { left: 'before', right: 'after', leftLabel: '2023', rightLabel: '2024', position: 0.4 },
    },
  ],
});

describe('parseStory', () => {
  it('parses and resolves relative URLs against the document', () => {
    const story = parseStory(doc(), BASE);
    expect(story.title).toBe('Demo');
    expect(story.theme).toBe('dark');
    const rivers = story.layers[0];
    expect(rivers.type === 'geojson' && rivers.url).toBe('https://geojson.app/stories/demo/data/rivers.geojson');
    const before = story.layers[2];
    expect(before.type === 'imagery' && before.source.type === 'image' && before.source.url).toBe(
      'https://geojson.app/stories/demo/img/before.jpg',
    );
    const after = story.layers[3];
    expect(after.type === 'imagery' && after.source.type === 'xyz' && after.source.tiles[0]).toContain('{time}');
    expect(story.chapters[1].camera).toEqual({ center: [85.5, 27.9], zoom: 12, pitch: 60, bearing: 30, duration: 10 });
  });

  it('keeps template braces when resolving relative tile URLs', () => {
    const d = doc();
    (d.layers[3] as { source: { tiles: string[] } }).source.tiles = ['tiles/{z}/{x}/{y}.png'];
    const story = parseStory(d, BASE);
    const after = story.layers[3];
    expect(after.type === 'imagery' && after.source.type === 'xyz' && after.source.tiles[0]).toBe(
      'https://geojson.app/stories/demo/tiles/{z}/{x}/{y}.png',
    );
  });

  it('rejects structural problems with a location', () => {
    expect(() => parseStory({ ...doc(), version: 2 }, BASE)).toThrow(StoryError);
    expect(() => parseStory({ ...doc(), chapters: [] }, BASE)).toThrow('.chapters');
    const badLayer = doc();
    badLayer.chapters[0].layers = ['nope'];
    expect(() => parseStory(badLayer, BASE)).toThrow('unknown layer "nope"');
    const badCompare = doc();
    (badCompare.chapters[2].compare as { left: string }).left = 'rivers';
    expect(() => parseStory(badCompare, BASE)).toThrow('unknown imagery layer "rivers"');
    const badTime = doc();
    (badTime.chapters[1].time as { end: string }).end = '2020-01-01';
    expect(() => parseStory(badTime, BASE)).toThrow('start < end');
    const dup = doc();
    dup.layers.push({ ...dup.layers[0] });
    expect(() => parseStory(dup, BASE)).toThrow('duplicate layer id');
  });

  it('refuses non-http URLs', () => {
    const d = doc();
    (d.layers[0] as { url: string }).url = 'javascript:alert(1)';
    expect(() => parseStory(d, BASE)).toThrow('unsupported URL scheme');
  });
});

describe('chapters', () => {
  const story = parseStory(doc(), BASE);

  it('computes visibility, hiding left-side imagery on the main map', () => {
    expect(chapterVisibility(story, story.chapters[2])).toEqual({
      data: { 'story:rivers': false, 'story:villages': true },
      imagery: { 'story:before': false, 'story:after': true },
    });
  });

  it('resolves chapter references by index, numeric string, or id', () => {
    expect(chapterIndexOf(story, 1)).toBe(1);
    expect(chapterIndexOf(story, '2')).toBe(2);
    expect(chapterIndexOf(story, 'flow')).toBe(1);
    expect(chapterIndexOf(story, 'missing')).toBe(-1);
    expect(chapterIndexOf(story, 9)).toBe(-1);
  });
});

describe('loadStory', () => {
  const files: Record<string, unknown> = {
    [BASE]: doc(),
    'https://geojson.app/stories/demo/data/rivers.geojson': {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [[85, 27], [86, 28]] }, properties: {} }],
    },
    'https://geojson.app/stories/demo/data/villages.geojson': {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [85.5, 27.9] }, properties: { name: 'A', arrival: '2024-08-16T14:30:00+05:45' } },
      ],
    },
  };

  beforeEach(() => {
    resetLayerIdCounter();
    useLayersStore.setState({ layers: [], selection: null, hiddenFeatureIds: new Set() });
    useImageryStore.setState({ layers: [] });
    useSettingsStore.setState({ ...DEFAULT_SETTINGS });
    useUiStore.setState({ focusRequest: null });
    useStoryStore.getState().close();
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const body = files[url];
      return body
        ? new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
        : new Response('{}', { status: 404 });
    }));
  });

  afterEach(() => {
    closeStory();
    vi.unstubAllGlobals();
  });

  it('loads layers in document order and opens the first chapter', async () => {
    await loadStory(BASE, { waitForAll: true });
    const s = useStoryStore.getState();
    expect(s.status).toBe('ready');
    expect(s.chapterIndex).toBe(0);
    expect(useLayersStore.getState().layers.map((l) => [l.id, l.visible])).toEqual([
      ['story:rivers', true],
      ['story:villages', false],
    ]);
    expect(useLayersStore.getState().layers[1].temporal).toEqual({ startField: 'arrival' });
    expect(useImageryStore.getState().layers.map((l) => l.id)).toEqual(['story:before', 'story:after']);
    expect(useSettingsStore.getState().theme).toBe('dark');
    expect(useUiStore.getState().focusRequest?.target).toMatchObject({ kind: 'camera', zoom: 7 });
  });

  it('applies terrain, timeline, and compare per chapter', async () => {
    await loadStory(BASE, { waitForAll: true });
    goToChapter('flow');
    expect(useSettingsStore.getState()).toMatchObject({ terrain: true, terrainExaggeration: 2, hillshade: true });
    const t = useTimeStore.getState();
    expect(t.enabled).toBe(true);
    expect(t.extentLocked).toBe(true);
    expect(t.window).toBe(30 * 60_000);
    expect(t.timeZone).toBe('Asia/Kathmandu');
    expect(t.current).toBe(Date.parse('2024-08-16T14:00:00+05:45'));

    goToChapter(2);
    expect(useTimeStore.getState().enabled).toBe(false);
    expect(useCompareStore.getState()).toMatchObject({ active: true, left: ['story:before'], position: 0.4 });
    expect(useImageryStore.getState().layers.map((l) => [l.id, l.visible])).toEqual([
      ['story:before', false],
      ['story:after', true],
    ]);
    expect(useSettingsStore.getState().terrain).toBe(false);
  });

  it('reports failed layers without failing the story, and closing cleans up', async () => {
    const riversUrl = 'https://geojson.app/stories/demo/data/rivers.geojson';
    const rivers = files[riversUrl];
    delete files[riversUrl];
    try {
      await loadStory(BASE, { chapter: 'compare', waitForAll: true });
    } finally {
      files[riversUrl] = rivers;
    }
    expect(useStoryStore.getState().layerErrors[0]).toContain('Rivers');
    expect(useStoryStore.getState().chapterIndex).toBe(2);
    closeStory();
    expect(useLayersStore.getState().layers).toHaveLength(0);
    expect(useImageryStore.getState().layers).toHaveLength(0);
    expect(useCompareStore.getState().active).toBe(false);
    expect(useStoryStore.getState().status).toBe('idle');
  });

  it('opens after the opening chapter\'s layers and streams the rest', async () => {
    const story = await loadStory(BASE, { chapter: 'intro' });
    expect(story.title).toBe('Demo');
    expect(useStoryStore.getState().status).toBe('ready');
    // Only rivers is needed by the intro chapter; villages arrives in the background.
    expect(useLayersStore.getState().layers.map((l) => l.id)).toContain('story:rivers');
    await vi.waitFor(() => expect(useStoryStore.getState().pendingLayers).toBe(0));
    expect(useLayersStore.getState().layers.map((l) => [l.id, l.visible])).toEqual([
      ['story:rivers', true],
      ['story:villages', false],
    ]);
  });

  it('surfaces fetch/validation errors in the store', async () => {
    await expect(loadStory('https://geojson.app/missing.json')).rejects.toThrow('404');
    expect(useStoryStore.getState()).toMatchObject({ status: 'error' });
  });
});
