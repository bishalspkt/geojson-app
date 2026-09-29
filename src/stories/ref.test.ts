import { describe, expect, it } from 'vitest';
import { readableSearch, resolveStoryRef, storyRefFor } from './ref';

const SITE = 'https://geojson.app';

describe('story refs', () => {
  it('resolves slugs to built-in story documents', () => {
    expect(resolveStoryRef('bhotekoshi-2026', `${SITE}/?story=bhotekoshi-2026`)).toBe(`${SITE}/stories/bhotekoshi-2026/story.json`);
  });

  it('resolves paths and URLs as before (old links keep working)', () => {
    expect(resolveStoryRef('/stories/bhotekoshi-2026/story.json', `${SITE}/`)).toBe(`${SITE}/stories/bhotekoshi-2026/story.json`);
    expect(resolveStoryRef('https://example.org/s/story.json', `${SITE}/`)).toBe('https://example.org/s/story.json');
    expect(resolveStoryRef('story.json', `${SITE}/`)).toBe(`${SITE}/story.json`);
  });

  it('writes the shortest form', () => {
    expect(storyRefFor(`${SITE}/stories/bhotekoshi-2026/story.json`, SITE)).toBe('bhotekoshi-2026');
    expect(storyRefFor(`${SITE}/stories/x/other.json`, SITE)).toBe('/stories/x/other.json');
    expect(storyRefFor(`${SITE}/stories/x/story.json?v=2`, SITE)).toBe('/stories/x/story.json?v=2');
    expect(storyRefFor('https://example.org/s/story.json', SITE)).toBe('https://example.org/s/story.json');
  });

  it('round-trips', () => {
    for (const doc of [`${SITE}/stories/a-b/story.json`, `${SITE}/x/y.json`, 'https://example.org/s.json']) {
      expect(resolveStoryRef(storyRefFor(doc, SITE), `${SITE}/`)).toBe(doc);
    }
  });

  it('keeps URL punctuation readable in links', () => {
    const params = new URLSearchParams({ story: 'https://example.org/s/story.json', chapter: 'a' });
    const search = readableSearch(`?${params}`);
    expect(search).toBe('?story=https://example.org/s/story.json&chapter=a');
    expect(new URLSearchParams(search).get('story')).toBe('https://example.org/s/story.json');
  });
});
