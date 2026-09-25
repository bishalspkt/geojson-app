import { useEffect } from 'react';
import { MapPinned } from 'lucide-react';
import { useLayersStore } from '@/state/layers-store';
import { useStoryStore } from '@/state/story-store';
import MapSettings from './MapSettings';

const BASE_TITLE = 'geojson.app - Open Source Mapping & Geospatial Data Visualization';

/** What's on the map, for the document title: the open story, the dataset name, or a layer count. */
function useDocumentTitle() {
  const label = useLayersStore((s) => {
    const data = s.layers.filter((l) => l.origin !== 'search' && l.origin !== 'draw' && l.origin !== 'story');
    if (data.length === 0) return null;
    return data.length === 1 ? data[0].name : `${data.length} layers`;
  });
  const story = useStoryStore((s) => (s.status === 'ready' ? s.story?.title : null));
  const title = story ?? label;
  useEffect(() => {
    document.title = title ? `${title} · geojson.app` : BASE_TITLE;
  }, [title]);
}

/** Logo pill (top left) with the map settings menu. */
export default function Brand() {
  useDocumentTitle();
  return (
    <div className="fixed left-3 top-3 z-40 flex h-11 items-center gap-2 rounded-2xl bg-brand pl-3.5 pr-1.5 text-white shadow-lg shadow-brand/30">
      <MapPinned className="h-4 w-4" aria-hidden />
      <h1 className="font-heading text-sm font-extrabold tracking-tight">geojson.app</h1>
      <span className="mx-0.5 h-4 w-px bg-white/25" aria-hidden />
      <MapSettings />
    </div>
  );
}
