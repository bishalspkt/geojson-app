import { Feature, FeatureCollection } from 'geojson';
import { LayerId, LayerOrigin } from '@/types';
import { useLayersStore } from '@/state/layers-store';
import { useUiStore } from '@/state/ui-store';
import { getBoundingBox } from '@/core/camera/focus';

/** The ways data can enter the app. Providers declare which they understand. */
export type SourceInput =
  | { kind: 'file'; file: File }
  | { kind: 'url'; url: string }
  | { kind: 'text'; text: string }
  | { kind: 'data'; data: unknown; name?: string };

export interface LoadedData {
  collection: FeatureCollection;
  name: string;
}

export interface SourceProvider {
  id: string;
  label: string;
  canHandle(input: SourceInput): boolean;
  load(input: SourceInput): Promise<LoadedData>;
}

const providers: SourceProvider[] = [];

export function registerSourceProvider(provider: SourceProvider): void {
  providers.push(provider);
}

export function listSourceProviders(): SourceProvider[] {
  return [...providers];
}

/** Normalize arbitrary parsed JSON into a FeatureCollection, or throw. */
export function toFeatureCollection(data: unknown): FeatureCollection {
  if (!data || typeof data !== 'object') {
    throw new Error('Not a GeoJSON object');
  }
  const g = data as { type?: string };
  if (g.type === 'FeatureCollection') return data as FeatureCollection;
  if (g.type === 'Feature') {
    return { type: 'FeatureCollection', features: [data as Feature] };
  }
  throw new Error(`Unsupported GeoJSON type: ${g.type ?? 'unknown'}`);
}

export interface IngestOptions {
  /** Replace all existing layers (classic file-load) instead of adding a layer. */
  replace?: boolean;
  origin?: LayerOrigin;
  name?: string;
  layerId?: LayerId;
  /** Raw MapLibre paint overrides for the new layer (see DataLayer.paint). */
  paint?: Record<string, unknown>;
  /** Fit the camera to the new data (default true). */
  fit?: boolean;
}

export interface IngestResult {
  layerId: LayerId;
  name: string;
  featureCount: number;
}

/**
 * The one entry point for data ingestion: find a provider, load, add the
 * layer, and focus the camera. UI surfaces (panels, drag-drop, URL loader,
 * embed bridge) all call this.
 */
export async function ingest(input: SourceInput, opts: IngestOptions = {}): Promise<IngestResult> {
  const provider = providers.find((p) => p.canHandle(input));
  if (!provider) throw new Error('No source provider can handle this input');

  const { collection, name } = await provider.load(input);
  const layers = useLayersStore.getState();

  const layerName = opts.name ?? name;
  const layerOpts = {
    name: layerName,
    origin: opts.origin,
    layerId: opts.layerId,
    paint: opts.paint,
  };
  const layerId = opts.replace
    ? layers.replaceLayers(collection, layerOpts)
    : layers.addLayer(collection, layerOpts);

  if (opts.fit !== false && collection.features.length > 0) {
    try {
      useUiStore.getState().requestFocus({ kind: 'bounds', bounds: getBoundingBox(collection) });
    } catch {
      // Unfittable geometry (e.g. empty coords) — leave the camera alone.
    }
  }

  return { layerId, name: layerName, featureCount: collection.features.length };
}
