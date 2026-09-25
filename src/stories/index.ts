import type { StoryDocument } from '@/types';
import type { LoadStoryOptions } from './loader';

/**
 * Public story API — a lazy facade. Story code (schema validation, loader,
 * chapter transitions) loads the first time a story is opened, so sessions
 * that never open one don't pay for it. Inside the story feature itself
 * (StoryPanel, tests) import `./runtime` or the modules directly.
 */
export type { LoadStoryOptions } from './loader';

const runtime = () => import('./runtime');

export async function loadStory(url: string, opts?: LoadStoryOptions): Promise<StoryDocument> {
  return (await runtime()).loadStory(url, opts);
}

/** Go to a chapter by index or id; false when no story is open or the chapter doesn't exist. */
export async function goToChapter(ref: number | string): Promise<boolean> {
  return (await runtime()).goToChapter(ref);
}

export async function closeStory(): Promise<void> {
  (await runtime()).closeStory();
}

/** Start fetching the story code (e.g. when a story link is hovered). */
export function preloadStoryRuntime(): void {
  void runtime();
}
