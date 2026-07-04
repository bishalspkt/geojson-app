import { useRef, useState } from 'react';
import { FeatureCollection } from 'geojson';
import { usePostHog } from '@posthog/react';
import { Button } from '@/components/ui/button';
import { ingest } from '@/extensions/sources/registry';
import { useMapStore } from '@/state/map-store';
import Panel from '../Panel';
import { setPanelWithPolicy } from '../panel-policy';
import volcanoes from '@/assets/samples/volcanoes.json';
import wonders from '@/assets/samples/wonders.json';
import trainRoutes from '@/assets/samples/train-routes.json';
import nationalParks from '@/assets/samples/national-parks.json';

const SAMPLES: { name: string; data: unknown }[] = [
  { name: 'Volcanoes', data: volcanoes },
  { name: 'Wonders', data: wonders },
  { name: 'Train Routes', data: trainRoutes },
  { name: 'National Parks', data: nationalParks },
];

export default function UploadPanel() {
  const posthog = usePostHog();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const track = (source: string, featureCount: number, fileName?: string, fileSize?: number) => {
    const center = useMapStore.getState().map?.getCenter();
    posthog.capture('geojson_uploaded', {
      source,
      file_name: fileName ?? null,
      file_size_bytes: fileSize ?? null,
      feature_count: featureCount,
      map_center_lat: center?.lat ?? null,
      map_center_lng: center?.lng ?? null,
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const result = await ingest({ kind: 'file', file }, { replace: true, origin: 'upload' });
      setPanelWithPolicy('layers');
      track('file_upload', result.featureCount, file.name, file.size);
    } catch (err) {
      console.error('Error loading GeoJSON file:', err);
      const detail = err instanceof Error ? err.message : String(err);
      setError(
        detail.includes('No source provider')
          ? `Couldn't load "${file.name}" — use a .json or .geojson file under 25 MB.`
          : `Couldn't load "${file.name}": ${detail}`,
      );
    }
  };

  const importSample = (sample: { name: string; data: unknown }) => async (e: React.MouseEvent) => {
    e.preventDefault();
    const data = sample.data as FeatureCollection;
    const result = await ingest(
      { kind: 'data', data, name: sample.name },
      { replace: true, origin: 'sample' },
    );
    setPanelWithPolicy('layers');
    track('sample', result.featureCount, sample.name);
  };

  return (
    <Panel panelId="upload" className="p-3">
      <p>Upload a GeoJSON file to get started</p>
      <p className="text-gray-600 text-sm">You may select a .json or .geojson file that is less than 25MB in size.</p>
      {error && (
        <p className="text-xs font-semibold text-red-600 bg-red-50 rounded-lg px-2.5 py-1.5 mt-1" role="alert">
          {error}
        </p>
      )}
      <div className="py-2 mr-auto">
        <Button onClick={() => fileInputRef.current?.click()}>Upload GeoJSON</Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.geojson,application/geo+json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />
      <p className="text-xs">
        Try a demo:{' '}
        {SAMPLES.map((sample, i) => (
          <span key={sample.name}>
            <a
              href="#"
              className="font-bold text-primary hover:text-primary-dark underline underline-offset-2 transition-colors duration-150"
              onClick={importSample(sample)}
            >
              {sample.name}
            </a>
            {i < SAMPLES.length - 2 ? ', ' : i === SAMPLES.length - 2 ? ' or ' : ''}
          </span>
        ))}
      </p>
    </Panel>
  );
}
