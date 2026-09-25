/**
 * A value built on first demand from a dynamically imported module, so
 * features most sessions never use (imagery, terrain, the chase camera) stay
 * out of the initial bundle.
 */
export interface Lazy<T> {
  /** The value once loaded, else null (never triggers a load). */
  get(): T | null;
  /**
   * Ask for the value: starts loading unless it's loaded, loading, or a recent
   * attempt failed (retried after a back-off). `onReady` runs once per load.
   * Safe to call every frame.
   */
  request(): void;
  /** Load (once) and resolve with the value; null if disposed first or it failed. */
  load(): Promise<T | null>;
  /** Dispose the value (now, or as soon as a pending load lands). */
  dispose(): void;
}

export interface LazyOptions<T> {
  destroy?: (value: T) => void;
  /** Called once when a load requested through `request()` completes. */
  onReady?: (value: T) => void;
  /** Wait this long after a failed load before trying again. */
  retryAfterMs?: number;
}

export function lazy<T>(create: () => Promise<T>, options: LazyOptions<T> = {}): Lazy<T> {
  const { destroy, onReady, retryAfterMs = 10_000 } = options;
  let value: T | null = null;
  let pending: Promise<T | null> | null = null;
  let failedAt = -Infinity;
  let disposed = false;

  const load = (): Promise<T | null> => {
    if (disposed) return Promise.resolve(null);
    pending ??= create().then(
      (v) => {
        if (disposed) {
          destroy?.(v);
          return null;
        }
        value = v;
        return v;
      },
      (err: unknown) => {
        // A chunk that failed (offline, a deploy replaced it) may load later.
        pending = null;
        failedAt = Date.now();
        console.error('[geojson.app] failed to load a map module', err);
        return null;
      },
    );
    return pending;
  };

  return {
    get: () => value,
    load,
    request() {
      if (value !== null || pending || disposed || Date.now() - failedAt < retryAfterMs) return;
      void load().then((v) => {
        if (v !== null) onReady?.(v);
      });
    },
    dispose() {
      disposed = true;
      if (value !== null) destroy?.(value);
      value = null;
    },
  };
}
