import maplibregl from 'maplibre-gl';

const MAKI_CDN = 'https://cdn.jsdelivr.net/npm/@mapbox/maki@8.0.1/icons';
const ICON_SIZE = 15;
const SDF_BUFFER = 3;
const CANVAS_SIZE = ICON_SIZE + SDF_BUFFER * 2;
const ICON_PREFIX = 'maki-';

const loadedIcons = new Set<string>();
const pendingLoads = new Map<string, Promise<void>>();

/**
 * Ensures a Maki icon is available in the map's image store.
 * Fetches the SVG from CDN, renders to canvas, and adds as an SDF image.
 * Returns true if the icon was loaded (or already exists), false on failure.
 */
export async function ensureMarkerIcon(map: maplibregl.Map, symbolName: string): Promise<boolean> {
  const imageId = ICON_PREFIX + symbolName;

  if (map.hasImage(imageId) || loadedIcons.has(imageId)) return true;

  // Deduplicate concurrent loads of the same icon
  if (pendingLoads.has(imageId)) {
    await pendingLoads.get(imageId);
    return map.hasImage(imageId);
  }

  const loadPromise = (async () => {
    try {
      const url = `${MAKI_CDN}/${symbolName}.svg`;
      const response = await fetch(url);
      if (!response.ok) return;

      const svgText = await response.text();
      const imageData = await svgToImageData(svgText);
      if (!imageData) return;

      if (!map.hasImage(imageId)) {
        map.addImage(imageId, imageData, { sdf: true, pixelRatio: 1 });
      }
      loadedIcons.add(imageId);
    } catch {
      // Icon not found or load failed — silently skip
    } finally {
      pendingLoads.delete(imageId);
    }
  })();

  pendingLoads.set(imageId, loadPromise);
  await loadPromise;
  return map.hasImage(imageId);
}

/**
 * Load all unique marker-symbol values from features into the map.
 * Returns the set of symbol names that were successfully loaded.
 */
export async function loadMarkerIcons(
  map: maplibregl.Map,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  features: { properties?: Record<string, any> | null }[],
): Promise<Set<string>> {
  const symbols = new Set<string>();
  for (const f of features) {
    const sym = f.properties?.['marker-symbol'];
    if (typeof sym === 'string' && sym.length > 0) {
      symbols.add(sym);
    }
  }

  const loaded = new Set<string>();
  await Promise.all(
    Array.from(symbols).map(async (sym) => {
      const ok = await ensureMarkerIcon(map, sym);
      if (ok) loaded.add(sym);
    }),
  );
  return loaded;
}

/** Get the MapLibre image ID for a marker-symbol name */
export function getMarkerImageId(symbolName: string): string {
  return ICON_PREFIX + symbolName;
}

// -- SVG to ImageData conversion --

function svgToImageData(svgText: string): Promise<ImageData | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }

      // Draw SVG centered with buffer
      ctx.drawImage(img, SDF_BUFFER, SDF_BUFFER, ICON_SIZE, ICON_SIZE);
      resolve(ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE));
    };
    img.onerror = () => resolve(null);

    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    img.src = URL.createObjectURL(blob);
  });
}
