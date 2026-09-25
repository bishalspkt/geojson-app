import { useEffect, useMemo, useRef } from 'react';
import { Copy, Ruler, Trash2, Undo2 } from 'lucide-react';
import { distance } from '@turf/distance';
import type { MeasurePoint } from '@/types';
import { useToolsStore } from '@/state/tools-store';
import { useMapStore } from '@/state/map-store';
import { notify } from '@/state/notify-store';
import { track } from '@/lib/analytics';
import { keyBelongsToFocus } from '@/lib/keys';
import Panel from '../Panel';

function formatDistance(km: number): string {
  if (km < 1) return `${(km * 1000).toFixed(0)} m`;
  if (km < 100) return `${km.toFixed(2)} km`;
  return `${km.toFixed(1)} km`;
}

const segmentLengths = (points: MeasurePoint[]) =>
  points.slice(1).map((p, i) => distance([points[i].lng, points[i].lat], [p.lng, p.lat], { units: 'kilometers' }));

export default function MeasurePanel() {
  const points = useToolsStore((s) => s.measurePoints);
  const segments = useMemo(() => segmentLengths(points), [points]);
  const total = segments.reduce((sum, d) => sum + d, 0);
  const { undoMeasurePoint, clearMeasurePoints } = useToolsStore.getState();

  // Record when a measurement starts (first point placed).
  const prevCount = useRef(points.length);
  useEffect(() => {
    if (prevCount.current === 0 && points.length === 1) {
      const center = useMapStore.getState().map?.getCenter();
      track('measure_started', {
        start_lat: points[0].lat,
        start_lng: points[0].lng,
        map_center_lat: center?.lat ?? null,
        map_center_lng: center?.lng ?? null,
      });
    }
    prevCount.current = points.length;
  }, [points]);

  // Backspace / Ctrl+Z undo the last point while measuring.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const undoChord = (e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z';
      const typing = e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]');
      if (undoChord ? e.defaultPrevented || typing : e.key !== 'Backspace' || keyBelongsToFocus(e)) return;
      e.preventDefault();
      useToolsStore.getState().undoMeasurePoint();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const copyAsGeoJson = async () => {
    const feature = {
      type: 'Feature',
      properties: { distance_km: Number(total.toFixed(4)) },
      geometry: { type: 'LineString', coordinates: points.map((p) => [p.lng, p.lat]) },
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(feature));
      notify('Copied the path as GeoJSON', 'info');
    } catch {
      notify("Couldn't copy to the clipboard");
    }
  };

  const footer = points.length > 0 && (
    <div className="flex shrink-0 items-center gap-1 border-t border-glass-border px-2 py-1.5">
      <button type="button" onClick={undoMeasurePoint} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-muted-foreground hover:bg-hover hover:text-foreground">
        <Undo2 className="h-3.5 w-3.5" aria-hidden /> Undo
      </button>
      {points.length >= 2 && (
        <button type="button" onClick={copyAsGeoJson} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-muted-foreground hover:bg-hover hover:text-foreground">
          <Copy className="h-3.5 w-3.5" aria-hidden /> Copy GeoJSON
        </button>
      )}
      <span className="flex-1" />
      <button type="button" onClick={clearMeasurePoints} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" aria-hidden /> Clear
      </button>
    </div>
  );

  return (
    <Panel panelId="measure" footer={footer || undefined} className="p-3.5">
      {points.length < 2 ? (
        <div className="flex flex-col items-center gap-2 py-5 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <Ruler className="h-5 w-5" aria-hidden />
          </span>
          <p className="font-heading text-sm font-extrabold">
            {points.length === 0 ? 'Tap the map to start measuring' : 'Tap another point'}
          </p>
          <p className="text-xs text-muted-foreground">Each tap adds a point; distances update as you go.</p>
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-between">
            <span className="eyebrow">Total distance</span>
            <span className="font-heading text-2xl font-extrabold tabular-nums">{formatDistance(total)}</span>
          </div>
          <ol className="mt-3 flex flex-col">
            {points.map((pt, i) => (
              <li key={i} className="flex items-stretch gap-2.5">
                <span className="flex flex-col items-center">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold text-white ${i === 0 ? 'bg-primary' : 'bg-accent'}`}>{i + 1}</span>
                  {i < points.length - 1 && <span className="w-px flex-1 bg-border" />}
                </span>
                <span className="flex min-w-0 flex-1 items-start justify-between pb-2">
                  <span className="truncate text-xs text-muted-foreground tabular-nums">
                    {pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}
                  </span>
                  {i < segments.length && (
                    <span className="ml-2 shrink-0 text-xs font-bold text-accent tabular-nums">+{formatDistance(segments[i])}</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </Panel>
  );
}
