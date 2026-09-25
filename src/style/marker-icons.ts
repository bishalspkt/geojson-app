import type * as maplibregl from 'maplibre-gl';

const MAKI_CDN = 'https://cdn.jsdelivr.net/npm/@mapbox/maki@8.0.1/icons';
const ICON_SIZE = 12;
const SDF_BUFFER = 5;
const CANVAS_SIZE = ICON_SIZE + SDF_BUFFER * 2;
/** Style-image id prefix for simplestyle `marker-symbol` icons. */
export const MARKER_IMAGE_PREFIX = 'maki-';
const SYMBOL_NAME = /^[a-z0-9-]{1,64}$/;

/**
 * Rasterised icons by symbol name, shared by every map instance (the main map,
 * the compare map, and each map after a style swap all need their own
 * `addImage`, but the SVG only has to be fetched and drawn once).
 */
const iconCache = new Map<string, Promise<ImageData | null>>();

/** Names the CDN answered 404 for — not worth asking again. */
const missing = new Set<string>();

function rasterisedIcon(symbolName: string): Promise<ImageData | null> {
  if (missing.has(symbolName)) return Promise.resolve(null);
  let pending = iconCache.get(symbolName);
  if (!pending) {
    pending = (async () => {
      try {
        const response = await fetch(`${MAKI_CDN}/${symbolName}.svg`);
        if (!response.ok) {
          if (response.status === 404) missing.add(symbolName);
          return null;
        }
        return await svgToImageData(await response.text());
      } catch {
        return null; // offline
      }
    })();
    iconCache.set(symbolName, pending);
    // Let a failed load be retried later (e.g. after going back online).
    void pending.then((data) => {
      if (!data) iconCache.delete(symbolName);
    });
  }
  return pending;
}

/** Drawn instead of a `marker-symbol` that Maki doesn't have (e.g. a typo). */
const FALLBACK_SYMBOL = 'marker';

/**
 * Ensures a Maki icon is in this map's image store: fetched from the CDN once,
 * rendered to canvas, added as an SDF image (so `marker-color` tints it).
 * Unknown names get a generic marker. Returns true if an icon is (now) in the map.
 */
export async function ensureMarkerIcon(map: maplibregl.Map, symbolName: string): Promise<boolean> {
  const imageId = MARKER_IMAGE_PREFIX + symbolName;
  if (map.hasImage(imageId)) return true;
  const imageData =
    (SYMBOL_NAME.test(symbolName) ? await rasterisedIcon(symbolName) : null) ?? (await rasterisedIcon(FALLBACK_SYMBOL));
  if (!imageData) return false;
  try {
    if (!map.hasImage(imageId)) map.addImage(imageId, imageData, { sdf: true, pixelRatio: 1 });
    return true;
  } catch {
    return false; // map removed meanwhile
  }
}

/** The MapLibre image id for a marker-symbol name. */
export function getMarkerImageId(symbolName: string): string {
  return MARKER_IMAGE_PREFIX + symbolName;
}

// -- SVG to ImageData conversion --

function svgToImageData(svgText: string): Promise<ImageData | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, SDF_BUFFER, SDF_BUFFER, ICON_SIZE, ICON_SIZE);
      resolve(ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
