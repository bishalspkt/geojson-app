import type { Position } from 'geojson';
import { TERRAIN_TILES_URL } from './terrain';

/**
 * Coarse terrain heights anywhere near a route, independent of the DEM tiles
 * MapLibre has loaded for the current view. A chase camera needs the ground
 * behind and beneath itself — outside the view, so MapLibre never loads it
 * (and its own "camera inside terrain" guard then sees height 0).
 *
 * Terrarium tiles at one fixed zoom (z10 ≈ 135 m pixels at 28°N) are fetched
 * on demand; lookups are synchronous and return null until a tile arrives.
 */
export const DEM_SAMPLER_ZOOM = 10;

export interface DemTile {
  width: number;
  height: number;
  /** Metres above sea level, row-major. */
  data: Int16Array;
}

export type DemTileLoader = (z: number, x: number, y: number) => Promise<DemTile>;

export interface ElevationSampler {
  /** Metres above sea level (bilinear), or null while a covering tile is missing. */
  elevation(lng: number, lat: number): number | null;
  /** Start fetching every tile within `marginKm` of these positions. */
  prefetch(coords: Position[], marginKm: number): void;
  destroy(): void;
}

/** Terrarium RGB → metres. */
export const decodeTerrarium = (r: number, g: number, b: number): number => r * 256 + g + b / 256 - 32768;

export function decodeTerrariumPixels(rgba: ArrayLike<number>, width: number, height: number): DemTile {
  const data = new Int16Array(width * height);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.round(decodeTerrarium(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]));
  }
  return { width, height, data };
}

/** Fractional Web Mercator tile coordinates of a point at zoom `z`. */
export function tileFraction(lng: number, lat: number, z: number): [number, number] {
  const n = 2 ** z;
  const sin = Math.sin((lat * Math.PI) / 180);
  return [((lng + 180) / 360) * n, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * n];
}

/** Browser loader: fetch a Terrarium PNG and decode it through a canvas. */
export async function loadTerrariumTile(z: number, x: number, y: number): Promise<DemTile> {
  const url = TERRAIN_TILES_URL.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`DEM tile ${z}/${x}/${y}: HTTP ${res.status}`);
  const bitmap = await createImageBitmap(await res.blob(), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('2d canvas unavailable');
    ctx.drawImage(bitmap, 0, 0);
    return decodeTerrariumPixels(ctx.getImageData(0, 0, bitmap.width, bitmap.height).data, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

export function createElevationSampler(
  load: DemTileLoader = loadTerrariumTile,
  { zoom = DEM_SAMPLER_ZOOM, maxTiles = 96 }: { zoom?: number; maxTiles?: number } = {},
): ElevationSampler {
  const n = 2 ** zoom;
  // undefined = never requested, null = loading or failed.
  const tiles = new Map<string, DemTile | null>();
  let destroyed = false;

  function request(x: number, y: number) {
    if (y < 0 || y >= n) return;
    const key = `${((x % n) + n) % n}/${y}`;
    if (tiles.has(key)) return;
    tiles.set(key, null);
    if (tiles.size > maxTiles) tiles.delete(tiles.keys().next().value as string);
    load(zoom, ((x % n) + n) % n, y).then(
      (tile) => {
        if (!destroyed && tiles.has(key)) tiles.set(key, tile);
      },
      () => {
        // Leave it null: callers treat the area as unknown.
      },
    );
  }

  /** Height of global pixel (gx, gy) at `zoom`, or null if its tile is missing. */
  function pixel(gx: number, gy: number): number | null {
    const tx = Math.floor(gx / 256);
    const ty = Math.floor(gy / 256);
    const tile = tiles.get(`${((tx % n) + n) % n}/${ty}`);
    if (!tile) return null;
    const px = Math.min(tile.width - 1, Math.max(0, Math.floor(((gx - tx * 256) / 256) * tile.width)));
    const py = Math.min(tile.height - 1, Math.max(0, Math.floor(((gy - ty * 256) / 256) * tile.height)));
    return tile.data[py * tile.width + px];
  }

  return {
    elevation(lng, lat) {
      if (destroyed) return null;
      const [fx, fy] = tileFraction(lng, lat, zoom);
      // Pixel centres sit at half-pixel offsets; neighbours may be in the next tile.
      const gx = fx * 256 - 0.5;
      const gy = fy * 256 - 0.5;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const tx = gx - x0;
      const ty = gy - y0;
      const a = pixel(x0, y0);
      const b = pixel(x0 + 1, y0);
      const c = pixel(x0, y0 + 1);
      const d = pixel(x0 + 1, y0 + 1);
      if (a === null || b === null || c === null || d === null) return null;
      return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
    },
    prefetch(coords, marginKm) {
      if (destroyed) return;
      const seen = new Set<string>();
      for (const [lng, lat] of coords) {
        const dLat = marginKm / 111.32;
        const dLng = marginKm / (111.32 * Math.max(0.05, Math.cos((lat * Math.PI) / 180)));
        const [x0, y0] = tileFraction(lng - dLng, Math.min(85, lat + dLat), zoom);
        const [x1, y1] = tileFraction(lng + dLng, Math.max(-85, lat - dLat), zoom);
        for (let x = Math.floor(x0); x <= Math.floor(x1); x++) {
          for (let y = Math.floor(y0); y <= Math.floor(y1); y++) {
            const key = `${x}/${y}`;
            if (seen.has(key)) continue;
            seen.add(key);
            request(x, y);
          }
        }
      }
    },
    destroy() {
      destroyed = true;
      tiles.clear();
    },
  };
}
