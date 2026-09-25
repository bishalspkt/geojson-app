import type { Feature } from 'geojson';

/**
 * Invariant 7: internal bookkeeping (every `_`-prefixed property: `_fid`,
 * `_t0`/`_t1`, `_search_result`, …) never leaves the app — not in copies,
 * exports, or protocol events.
 */
export function withoutInternalProperties(properties: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(properties ?? {})) if (!k.startsWith('_')) out[k] = v;
  return out;
}

/** A feature safe to hand to the outside world. */
export function externalFeature(f: { geometry: unknown; properties: unknown }): Feature {
  return {
    type: 'Feature',
    geometry: f.geometry,
    properties: withoutInternalProperties(f.properties as Record<string, unknown> | null),
  } as Feature;
}
