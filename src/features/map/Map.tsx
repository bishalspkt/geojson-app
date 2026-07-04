import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map.css';
import { usePostHog } from '@posthog/react';
import { buildBasemapStyle, generateStarfieldBackground, startMapEngine } from '@/core';
import { useMapStore } from '@/state/map-store';
import { useSettingsStore } from '@/state/settings-store';
import { useUiStore } from '@/state/ui-store';
import { getTool } from '@/extensions/tools/registry';
import { ingest } from '@/extensions/sources/registry';
import { useEmbed } from '@/integrations/embed/embed-context';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '@/integrations/embed/params';

const STARFIELD_BG = generateStarfieldBackground();

/**
 * Mounts MapLibre and hands it to the core engine. All map behavior
 * (rendering, selection, tools, camera) lives in `src/core` — this component
 * only owns the DOM shell: container, starfield, and drag-drop import.
 */
export default function Map() {
  const embed = useEmbed();
  const posthog = usePostHog();
  const containerRef = useRef<HTMLDivElement>(null);
  const isGlobe = useSettingsStore((s) => s.projection === 'globe');

  // --- Map + engine lifecycle ---
  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: buildBasemapStyle(useSettingsStore.getState().theme),
      center: embed.enabled ? embed.center : DEFAULT_CENTER,
      zoom: embed.enabled ? embed.zoom : DEFAULT_ZOOM,
      interactive: embed.interactive,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.AttributionControl({
        compact: embed.enabled ? embed.attribution === 'compact' : true,
        customAttribution: '',
      }),
    );

    const { setMap, setReady } = useMapStore.getState();
    setMap(map);

    let stopEngine: (() => void) | undefined;
    map.on('load', () => {
      stopEngine = startMapEngine(map, {
        embedEnabled: embed.enabled,
        embedChromeFull: embed.enabled && embed.chrome === 'full',
        enableContextMenu: !embed.enabled || (embed.interactive && embed.chrome !== 'none'),
        embedClickContextMenu: embed.enabled && embed.interactive,
        resolveTool: getTool,
      });
      setReady(true);
    });

    return () => {
      stopEngine?.();
      useMapStore.getState().setMap(null);
      map.remove();
    };
    // The embed config is parsed once per page load and never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Starfield parallax (globe projection) ---
  const starfieldRef = useRef<HTMLDivElement>(null);
  const mapForParallax = useMapStore((s) => s.map);
  useEffect(() => {
    if (!mapForParallax) return;
    const m = mapForParallax;
    const onMove = () => {
      if (!starfieldRef.current) return;
      const center = m.getCenter();
      const bearing = m.getBearing();
      const offsetX = center.lng * 1.5 + bearing * 0.5;
      const offsetY = -center.lat * 1.5;
      starfieldRef.current.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    };
    m.on('move', onMove);
    return () => {
      m.off('move', onMove);
    };
  }, [mapForParallax]);

  // --- Drag-and-drop GeoJSON files ---
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      ingest({ kind: 'file', file }, { replace: true, origin: 'upload' })
        .then((result) => {
          useUiStore.getState().setActivePanel('layers');
          const center = useMapStore.getState().map?.getCenter();
          posthog.capture('geojson_uploaded', {
            source: 'drag_and_drop',
            file_name: file.name,
            file_size_bytes: file.size,
            feature_count: result.featureCount,
            map_center_lat: center?.lat ?? null,
            map_center_lng: center?.lng ?? null,
          });
        })
        .catch(() => {
          /* not a loadable file — ignore */
        });
    },
    [posthog],
  );

  return (
    <div
      className="map-wrap"
      {...(!embed.enabled
        ? {
            onDragEnter: handleDragEnter,
            onDragLeave: handleDragLeave,
            onDragOver: handleDragOver,
            onDrop: handleDrop,
          }
        : {})}
    >
      {isGlobe && (
        <div
          ref={starfieldRef}
          className="starfield"
          style={{ backgroundImage: STARFIELD_BG, backgroundColor: '#0a0e1a' }}
        />
      )}
      <div
        ref={containerRef}
        className="map"
        style={{ backgroundColor: isGlobe ? 'transparent' : undefined }}
      />
      {isDragging && (
        <div className="drop-overlay">
          <div className="drop-overlay-inner">Drop GeoJSON file to load</div>
        </div>
      )}
    </div>
  );
}
