import type * as maplibregl from 'maplibre-gl';
import { findFeature, useLayersStore } from '@/state/layers-store';
import { useUiStore, type FocusRequest, type ViewInsets } from '@/state/ui-store';
import { executeFocus, type FocusPadding } from '../camera/focus';
import { easeInOutQuad } from '../camera/flight';
import type { EngineBinding } from './types';

const hasInsets = (i: ViewInsets) => i.top + i.right + i.bottom + i.left > 0;

/** Padding that keeps a target clear of whatever UI covers the map (`ui-store.viewInsets`). */
function paddingFor(kind: FocusRequest['target']['kind']): FocusPadding {
  const base = kind === 'bounds' ? 80 : 60;
  const insets = useUiStore.getState().viewInsets;
  if (!hasInsets(insets)) return base;
  return { top: base + insets.top, right: base + insets.right, bottom: base + insets.bottom, left: base + insets.left };
}

/**
 * Camera focus requests (`ui-store.requestFocus`): runs the flight and
 * reports when it settles, so stories can start playback on arrival.
 */
export function bindCamera(map: maplibregl.Map): EngineBinding {
  let detachFlight: (() => void) | null = null;

  const run = (request: FocusRequest | null) => {
    if (!request) return;
    detachFlight?.();
    const insets = useUiStore.getState().viewInsets;
    executeFocus(
      map,
      request.target,
      (fid) => findFeature(useLayersStore.getState().layers, fid)?.feature ?? null,
      {
        padding: paddingFor(request.target.kind),
        offset: [(insets.left - insets.right) / 2, (insets.top - insets.bottom) / 2],
      },
    );
    // A reader's gesture mid-flight hands the camera to them.
    let interrupted = false;
    const onGesture = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) interrupted = true;
    };
    map.on('movestart', onGesture);
    const settled = () => {
      map.off('movestart', onGesture);
      detachFlight = null;
      useUiStore.getState().markFocusSettled(request.seq);
    };
    // A gesture stops the flight (moveend → here) before its own movestart
    // fires on the next frame; look two frames later so a reader who took
    // over the camera isn't pulled back to the chapter's zoom.
    let frame = 0;
    const landed = () => {
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(judgeLanding);
      });
      detachFlight = () => {
        cancelAnimationFrame(frame);
        map.off('movestart', onGesture);
      };
    };
    const judgeLanding = () => {
      if (interrupted || map.isMoving()) {
        settled();
        return;
      }
      const target = request.target;
      const current = useUiStore.getState().focusRequest?.seq === request.seq;
      // A flight that ends over terrain whose height wasn't known when it
      // started (a cold load from a link) keeps its altitude and lands up to
      // a zoom level too far out (still so in MapLibre 6.11). Glide in.
      if (target.kind === 'camera' && current && map.getTerrain() && Math.abs(map.getZoom() - target.zoom) > 0.05) {
        map.easeTo({ zoom: target.zoom, duration: 900, easing: easeInOutQuad, essential: true });
        map.once('moveend', settled);
        detachFlight = () => {
          map.off('moveend', settled);
          map.off('movestart', onGesture);
        };
      } else settled();
    };
    if (map.isMoving()) {
      map.once('moveend', landed);
      detachFlight = () => {
        map.off('moveend', landed);
        map.off('movestart', onGesture);
      };
    } else landed();
  };

  // A request issued before the map loaded (e.g. a story opened from the URL) is honoured now.
  run(useUiStore.getState().focusRequest);
  const unsubscribe = useUiStore.subscribe((s) => s.focusRequest, run);

  return {
    destroy() {
      unsubscribe();
      detachFlight?.();
    },
  };
}
