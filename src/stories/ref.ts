/**
 * How stories are named in links. A built-in story (`public/stories/<slug>/`)
 * is addressed by its slug — `?story=bhotekoshi-2026` — and any other story by
 * its document URL (site-relative when same-origin). Both forms are accepted
 * wherever a story URL is (`?story=`, the SDK's `story`/`loadStory`).
 */

const SLUG = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i;
const BUILT_IN = /^\/stories\/([a-z0-9]+(?:[-_][a-z0-9]+)*)\/story\.json$/i;

export const isStorySlug = (ref: string) => SLUG.test(ref.trim());

/** Absolute document URL for a slug or a (relative) URL. */
export function resolveStoryRef(ref: string, base: string): string {
  const value = ref.trim();
  if (isStorySlug(value)) return new URL(`/stories/${value}/story.json`, base).toString();
  return new URL(value, base).toString();
}

/** The shortest link form of a story document: slug, site path, or full URL. */
export function storyRefFor(docUrl: string, origin: string): string {
  const doc = new URL(docUrl, origin);
  if (doc.origin !== origin) return doc.toString();
  const builtIn = BUILT_IN.exec(doc.pathname);
  if (builtIn && !doc.search && !doc.hash) return builtIn[1];
  return doc.pathname + doc.search;
}

/**
 * `/` and `:` are legal in a query string, so a story or data URL in a link
 * can stay readable instead of `%2Fstories%2F…`.
 */
export function readableSearch(search: string): string {
  return search.replace(/%2F/gi, '/').replace(/%3A/gi, ':');
}
