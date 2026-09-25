/** Run `fn` when the browser is idle (or after `fallbackMs` where idle callbacks don't exist). Returns a cancel function. */
export function onIdle(fn: () => void, { timeout = 4000, fallbackMs = 1500 } = {}): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(fn, { timeout });
    return () => window.cancelIdleCallback(handle);
  }
  const handle = setTimeout(fn, fallbackMs);
  return () => clearTimeout(handle);
}
