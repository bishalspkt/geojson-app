/** A lazily loaded chunk failed to download (offline, or a deploy replaced it): only a reload helps. */
export function isChunkLoadError(error: Error): boolean {
  return /dynamically imported module|Importing a module script failed|error loading dynamically|Failed to fetch/i.test(error.message);
}

