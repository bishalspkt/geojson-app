import * as maplibregl from 'maplibre-gl';
import { shallow } from 'zustand/shallow';
import { useLayersStore } from '@/state/layers-store';
import { useSettingsStore } from '@/state/settings-store';
import { useImageryStore } from '@/state/imagery-store';
import { useCompareStore } from '@/state/compare-store';
import { useTimeStore } from '@/state/time-store';
import { buildBasemapStyle } from '../basemap/style';
import { installStyleImageResolver } from '../basemap/sprites';
import { applyTerrain } from '../basemap/terrain';
import { createLayerRenderer } from '../layers/renderer';
import { createImageryRenderer } from '../imagery/renderer';
import { currentRenderTime } from '../time/render-time';
import { isDarkTheme } from '../basemap/theme';

/**
 * The "before" side of a swipe comparison: a non-interactive map stacked over
 * the main map (the host clips it to the left of the divider). It mirrors the
 * main map's camera, basemap, terrain, data layers and timeline, but draws the
 * compare store's `left` imagery instead of the main map's imagery.
 *
 * Returns a cleanup function that removes the secondary map.
 */
export function startCompareMap(container: HTMLElement, main: maplibregl.Map): () => void {
  const settings = useSettingsStore.getState();
  const secondary = new maplibregl.Map({
    container,
    style: buildBasemapStyle(settings.theme),
    interactive: false,
    attributionControl: false,
    center: main.getCenter(),
    zoom: main.getZoom(),
    bearing: main.getBearing(),
    pitch: main.getPitch(),
    maxPitch: 85,
  });

  const renderer = createLayerRenderer(secondary, {
    isDark: () => isDarkTheme(useSettingsStore.getState().theme),
  });
  const imagery = createImageryRenderer(secondary, {
    include: (l) => useCompareStore.getState().left.includes(l.id),
    forceVisible: true,
  });
  const cleanups: (() => void)[] = [installStyleImageResolver(secondary)];
  let loaded = false;

  const syncCamera = () => {
    secondary.jumpTo({
      center: main.getCenter(),
      zoom: main.getZoom(),
      bearing: main.getBearing(),
      pitch: main.getPitch(),
      roll: main.getRoll(),
      elevation: main.getCenterElevation(),
    });
  };

  const syncAll = () => {
    if (!loaded) return;
    secondary.setProjection({ type: useSettingsStore.getState().projection });
    applyTerrain(secondary, useSettingsStore.getState());
    imagery.sync(useImageryStore.getState().layers);
    const { layers, hiddenFeatureIds } = useLayersStore.getState();
    renderer.setTime(currentRenderTime());
    renderer.sync(layers, hiddenFeatureIds);
    const time = currentRenderTime();
    imagery.setTime(time ? time.t : null);
    syncCamera();
  };

  secondary.on('load', () => {
    loaded = true;
    syncAll();
  });

  main.on('move', syncCamera);
  cleanups.push(() => main.off('move', syncCamera));

  const onResize = () => {
    secondary.resize();
    syncCamera();
  };
  main.on('resize', onResize);
  cleanups.push(() => main.off('resize', onResize));

  cleanups.push(
    useLayersStore.subscribe(
      (s) => [s.layers, s.hiddenFeatureIds] as const,
      () => {
        if (!loaded) return;
        const { layers, hiddenFeatureIds } = useLayersStore.getState();
        renderer.sync(layers, hiddenFeatureIds);
      },
      { equalityFn: shallow },
    ),
  );
  cleanups.push(
    useImageryStore.subscribe(
      (s) => s.layers,
      (layers) => loaded && imagery.sync(layers),
    ),
  );
  cleanups.push(
    useCompareStore.subscribe(
      (s) => s.left,
      () => loaded && imagery.sync(useImageryStore.getState().layers),
    ),
  );
  cleanups.push(
    useTimeStore.subscribe(
      (s) => [s.enabled, s.current, s.window, s.extent] as const,
      () => {
        if (!loaded) return;
        const time = currentRenderTime();
        renderer.setTime(time);
        imagery.setTime(time ? time.t : null);
      },
      { equalityFn: shallow },
    ),
  );
  cleanups.push(
    useSettingsStore.subscribe(
      (s) => [s.terrain, s.terrainExaggeration, s.hillshade, s.projection] as const,
      () => {
        if (!loaded) return;
        secondary.setProjection({ type: useSettingsStore.getState().projection });
        applyTerrain(secondary, useSettingsStore.getState());
        syncCamera();
      },
      { equalityFn: shallow },
    ),
  );
  cleanups.push(
    useSettingsStore.subscribe(
      (s) => s.theme,
      (theme) => {
        loaded = false;
        secondary.once('style.load', () => {
          loaded = true;
          imagery.reset();
          renderer.reset();
          syncAll();
        });
        secondary.setStyle(buildBasemapStyle(theme));
      },
    ),
  );

  return () => {
    for (const cleanup of cleanups.reverse()) cleanup();
    renderer.destroy();
    imagery.destroy();
    secondary.remove();
  };
}
