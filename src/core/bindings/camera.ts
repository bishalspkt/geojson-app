import type * as maplibregl from 'maplibre-gl';
import { findFeature, useLayersStore } from '@/state/layers-store';
import { useUiStore, type FocusRequest, type ViewInsets } from '@/state/ui-store';
import { executeFocus, type FocusPadding } from '../camera/focus';
import { easeInOutQuad } from '../camera/flight';
import type { EngineBinding } from './types';

/** Room around fitted targets; the map's padding (covered edges) comes on top. */
const fitPadding = (kind: FocusRequest['target']['kind']): FocusPadding => (kind === 'bounds' ? 80 : 60);

/** A flight is re-aimed when the covered area changes by more than this (px); smaller changes wait for it to land. */
const REAIM_PX = 8;

const samePadding = (a: maplibregl.PaddingOptions, b: ViewInsets, tolerance = 0.5) =>
  Math.abs((a.top ?? 0) - b.top) <= tolerance &&
  Math.abs((a.right ?? 0) - b.right) <= tolerance &&
  Math.abs((a.bottom ?? 0) - b.bottom) <= tolerance &&
  Math.abs((a.left ?? 0) - b.left) <= tolerance;

/**
 * Camera focus requests (`ui-store.requestFocus`): runs the flight and
 * reports when it settles, so stories can start playback on arrival.
 *
 * The map's padding mirrors `ui-store.viewInsets` (the story panel, a phone's
 * bottom sheet), so every camera move — flights, fits, the chase camera, a
 * zoom about the centre — centres on the part of the map that's visible, and
 * 3D views put their vanishing point there too.
 */
export function bindCamera(map: maplibregl.Map): EngineBinding {
  let detachFlight: (() => void) | null = null;
  /** The request whose move is under way, and the padding it's heading for. */
  let flying: { request: FocusRequest; padding: ViewInsets } | null = null;

  /** Change the padding without moving what's on screen (what's in the new visible middle becomes the centre). */
  const keepView = (padding: ViewInsets) => {
    const { clientWidth: w, clientHeight: h } = map.getContainer();
    const at: [number, number] = [padding.left + (w - padding.left - padding.right) / 2, padding.top + (h - padding.top - padding.bottom) / 2];
    const center = map.unproject(at);
    const back = map.project(center);
    // Past the horizon (steep pitch) there's no ground to keep in place: just shift.
    if (Math.hypot(back.x - at[0], back.y - at[1]) > 2) map.setPadding({ ...padding });
    else map.jumpTo({ center, padding: { ...padding } });
  };

  const run = (request: FocusRequest | null) => {
    if (!request) return;
    detachFlight?.();
    const insets = useUiStore.getState().viewInsets;
    flying = { request, padding: insets };
    const kind = request.target.kind;
    // Fits are computed against the current padding, so bring it up to date first.
    if ((kind === 'bounds' || kind === 'feature') && !samePadding(map.getPadding(), insets)) map.setPadding({ ...insets });
    executeFocus(
      map,
      request.target,
      (fid) => findFeature(useLayersStore.getState().layers, fid)?.feature ?? null,
      { padding: fitPadding(kind), viewPadding: { ...insets } },
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
      flying = null;
      // The covered area changed slightly during the move.
      const insets = useUiStore.getState().viewInsets;
      if (!samePadding(map.getPadding(), insets)) keepView(insets);
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

  /** The panel opened, closed or resized. */
  const onInsets = (insets: ViewInsets) => {
    if (flying) {
      // E.g. a phone's sheet resizing for the new chapter just after the flight began: re-aim it.
      if (!samePadding(flying.padding, insets, REAIM_PX)) run(flying.request);
      return; // anything smaller is applied on landing
    }
    if (!samePadding(map.getPadding(), insets)) keepView(insets);
  };

  // A request issued before the map loaded (e.g. a story opened from the URL) is honoured now.
  const pending = useUiStore.getState().focusRequest;
  if (pending) run(pending);
  else onInsets(useUiStore.getState().viewInsets);
  const unsubscribe = [
    useUiStore.subscribe((s) => s.focusRequest, run),
    useUiStore.subscribe((s) => s.viewInsets, onInsets),
  ];

  return {
    destroy() {
      for (const u of unsubscribe) u();
      detachFlight?.();
      flying = null;
    },
  };
}
