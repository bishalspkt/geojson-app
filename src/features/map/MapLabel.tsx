import { MapPinned } from 'lucide-react';
import { useEffect } from 'react';
import MapSettingsButton from './MapSettings';
import { useLayersStore } from '@/state/layers-store';

const BASE_TITLE = 'geojson.app - Open Source Mapping & Geospatial Data Visualization';

/** Subtitle under the logo: the loaded dataset name, or a layer count. */
function useDatasetLabel(): string | null {
  return useLayersStore((s) => {
    const dataLayers = s.layers.filter((l) => l.origin !== 'search' && l.origin !== 'draw');
    if (dataLayers.length === 0) return null;
    if (dataLayers.length === 1) return dataLayers[0].name;
    return `${dataLayers.length} layers`;
  });
}

export default function MapLabel() {
  const datasetLabel = useDatasetLabel();

  useEffect(() => {
    document.title = datasetLabel ? `${datasetLabel} - ${BASE_TITLE}` : BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [datasetLabel]);

  return (
    <div className="fixed top-3 left-3 z-10 flex flex-col gap-0.5">
      <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-black/10">
        <MapPinned className="h-4 w-4" />
        <h1 className="font-extrabold text-sm tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>geojson.app</h1>
        <div className="w-px h-4 bg-white/25" />
        <MapSettingsButton />
      </div>
      {datasetLabel && (
        <span className="px-3.5 text-[11px] font-semibold text-gray-500 truncate max-w-[180px]" title={datasetLabel}>
          {datasetLabel}
        </span>
      )}
    </div>
  );
}
