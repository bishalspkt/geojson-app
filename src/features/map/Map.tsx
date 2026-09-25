import { useEffect, useRef, useState } from 'react';
import type * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map.css';
import { generateStarfieldBackground } from '@/core/basemap/starfield';
import { useSettingsStore } from '@/state/settings-store';
import { notify } from '@/state/notify-store';
import { useEmbed } from '@/integrations/embed/embed-context';
import { fileProps, importData, importErrorMessage } from '@/features/controls/import-data';

// Start fetching MapLibre + the engine as soon as the shell's code runs.
const runtime = import('./map-runtime');

const STARFIELD_BG = generateStarfieldBackground();

/** Whole-window file drop (main app only). */
function useFileDrop(enabled: boolean) {
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (++depth === 1) setDragging(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      if (--depth <= 0) {
        depth = 0;
        setDragging(false);
      }
    };
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      depth = 0;
      setDragging(false);
      // Already handled by a drop target inside the app (the Import panel's dropzone).
      if (e.defaultPrevented || !hasFiles(e)) return;
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      importData({ kind: 'file', file }, { source: 'drag_and_drop', props: fileProps(file) }).catch((err: unknown) =>
        notify(importErrorMessage(err, `"${file.name}"`)),
      );
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, [enabled]);
  return dragging;
}

/**
 * Mounts MapLibre and hands it to the core engine. All map behaviour
 * (rendering, selection, tools, camera) lives in `src/core` — this component
 * only owns the DOM shell: container, starfield, and file drop.
 */
export default function Map() {
  const embed = useEmbed();
  const containerRef = useRef<HTMLDivElement>(null);
  const starfieldRef = useRef<HTMLDivElement>(null);
  const isGlobe = useSettingsStore((s) => s.projection === 'globe');
  const dragging = useFileDrop(!embed.enabled);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    // Starfield parallax behind the globe.
    const onMove = (map: maplibregl.Map) => {
      const el = starfieldRef.current;
      if (!el) return;
      const c = map.getCenter();
      el.style.transform = `translate3d(${c.lng * 1.5 + map.getBearing() * 0.5}px, ${-c.lat * 1.5}px, 0)`;
    };
    runtime
      .then(({ mountMap }) => {
        if (!cancelled && containerRef.current) cleanup = mountMap(containerRef.current, embed, { onMove });
      })
      .catch(() => notify("The map couldn't load. Check your connection and reload the page."));
    return () => {
      cancelled = true;
      cleanup?.();
    };
    // The embed config is parsed once per page load and never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="map-wrap">
      {isGlobe && <div ref={starfieldRef} className="starfield" style={{ backgroundImage: STARFIELD_BG }} aria-hidden />}
      <div ref={containerRef} className="map" data-globe={isGlobe || undefined} />
      {dragging && (
        <div className="drop-overlay" aria-hidden>
          <div className="drop-overlay-inner">Drop a GeoJSON file to load it</div>
        </div>
      )}
    </div>
  );
}
