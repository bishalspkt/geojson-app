import * as maplibregl from 'maplibre-gl';
import type { GeoTIFF, GeoTIFFImage, Pool } from 'geotiff';

/**
 * Cloud-optimised GeoTIFF imagery streamed straight from its host.
 *
 * Open satellite archives (Vantor/Maxar Open Data, Planet disaster data,
 * Sentinel-2 on AWS…) publish COGs with CORS and HTTP range requests, so the
 * browser can read exactly the overview level and window a map tile needs —
 * at full native resolution, with nothing re-hosted (serving cost stays zero).
 *
 * Registered once as the MapLibre `cog://` protocol. A raster source uses
 * tiles like `cog://tile/{z}/{x}/{y}?url=<COG url>&clip=w,s,e,n`; each tile
 * is reprojected (EPSG:4326 or UTM → Web Mercator) into an ImageBitmap.
 * geotiff.js is loaded lazily, and decoding runs in a small worker pool.
 */

export const COG_PROTOCOL = 'cog';
const TILE = 256;

/** Tile URL template for a COG (and optional clip box, lon/lat). */
export function cogTileUrl(url: string, clip?: [number, number, number, number]): string {
  const params = new URLSearchParams({ url });
  if (clip) params.set('clip', clip.map((v) => v.toFixed(6)).join(','));
  return `${COG_PROTOCOL}://tile/{z}/{x}/{y}?${params.toString()}`;
}

export function parseCogTileUrl(raw: string): { z: number; x: number; y: number; url: string; clip: number[] | null } | null {
  const m = /^cog:\/\/tile\/(\d+)\/(\d+)\/(\d+)\?(.*)$/.exec(raw);
  if (!m) return null;
  const params = new URLSearchParams(m[4]);
  const url = params.get('url');
  if (!url) return null;
  const clip = params.get('clip')?.split(',').map(Number) ?? null;
  return { z: +m[1], x: +m[2], y: +m[3], url, clip: clip && clip.length === 4 && clip.every(Number.isFinite) ? clip : null };
}

// --- Projections -----------------------------------------------------------

/** Longitude / latitude of a Web Mercator tile's pixel position (x, y in tile units at zoom z). */
export function tilePixelToLngLat(z: number, x: number, y: number): [number, number] {
  const n = 2 ** z;
  const lng = (x / n) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  return [lng, lat];
}

/**
 * WGS84 → UTM (transverse Mercator, Snyder 1987 series). Sub-millimetre
 * within a zone, which is far below imagery pixel size.
 */
export function utmForward(lng: number, lat: number, zone: number, south: boolean): [number, number] {
  const a = 6378137;
  const f = 1 / 298.257223563;
  const k0 = 0.9996;
  const e2 = f * (2 - f);
  const ep2 = e2 / (1 - e2);
  const φ = (lat * Math.PI) / 180;
  const λ0 = (((zone - 1) * 6 - 180 + 3) * Math.PI) / 180;
  const sinφ = Math.sin(φ);
  const cosφ = Math.cos(φ);
  const tanφ = Math.tan(φ);
  const N = a / Math.sqrt(1 - e2 * sinφ * sinφ);
  const T = tanφ * tanφ;
  const C = ep2 * cosφ * cosφ;
  const A = cosφ * ((lng * Math.PI) / 180 - λ0);
  const e4 = e2 * e2;
  const e6 = e4 * e2;
  const M =
    a *
    ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * φ -
      ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * φ) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * φ) -
      ((35 * e6) / 3072) * Math.sin(6 * φ));
  const x =
    k0 * N * (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5) / 120) + 500000;
  let y =
    k0 *
    (M +
      N *
        tanφ *
        ((A * A) / 2 +
          ((5 - T + 9 * C + 4 * C * C) * A ** 4) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6) / 720));
  if (south) y += 10_000_000;
  return [x, y];
}

type Projector = (lng: number, lat: number) => [number, number];

/** Forward projection lon/lat → the COG's CRS, for the EPSG codes open archives use. */
export function projectorFor(epsg: number): Projector | null {
  if (epsg === 4326 || epsg === 4979) return (lng, lat) => [lng, lat];
  if (epsg >= 32601 && epsg <= 32660) return (lng, lat) => utmForward(lng, lat, epsg - 32600, false);
  if (epsg >= 32701 && epsg <= 32760) return (lng, lat) => utmForward(lng, lat, epsg - 32700, true);
  if (epsg === 3857 || epsg === 900913) {
    const R = 6378137;
    return (lng, lat) => [(R * lng * Math.PI) / 180, R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))];
  }
  return null;
}

// --- COG access --------------------------------------------------------------

interface CogInfo {
  tiff: GeoTIFF;
  levels: { image: GeoTIFFImage; width: number; height: number; resX: number; resY: number }[];
  originX: number;
  originY: number;
  project: Projector;
  /** Full-resolution pixel size in metres (approximate for geographic CRSs). */
  metres: number;
  geographic: boolean;
}

let geotiffModule: Promise<typeof import('geotiff')> | null = null;
let pool: Pool | null = null;
/**
 * Open COGs, least recently used first. Each holds a block cache of up to
 * `cacheSize × blockSize` bytes, so keep only the scenes a story is likely to
 * swap between (both compare sides, a few alternatives).
 */
const cogs = new Map<string, Promise<CogInfo>>();
const MAX_OPEN_COGS = 8;

async function openCog(url: string): Promise<CogInfo> {
  geotiffModule ??= import('geotiff');
  const { fromUrl, Pool: PoolCtor } = await geotiffModule;
  if (!pool && typeof Worker !== 'undefined') {
    try {
      pool = new PoolCtor(Math.min(4, Math.max(1, (navigator.hardwareConcurrency || 4) - 1)));
    } catch {
      pool = null;
    }
  }
  // Block-cached range reads: neighbouring tiles share header and tile-index
  // blocks. (geotiff 3 only caches when `blockSize` is given.)
  const blockOptions = { blockSize: 64 * 1024, cacheSize: 192 }; // ≤ 12 MB per scene
  const tiff = await fromUrl(url, blockOptions as Parameters<typeof fromUrl>[1]);
  const count = await tiff.getImageCount();
  const first = await tiff.getImage(0);
  const keys = (first.getGeoKeys() ?? {}) as Record<string, number | undefined>;
  const epsg = keys.ProjectedCSTypeGeoKey ?? keys.GeographicTypeGeoKey ?? 4326;
  const project = projectorFor(epsg);
  if (!project) throw new Error(`COG ${url}: unsupported CRS EPSG:${epsg}`);
  const [originX, originY] = first.getOrigin();
  const [resX, resY] = first.getResolution();
  const W0 = first.getWidth();
  const levels = [];
  for (let i = 0; i < count; i++) {
    const image = i === 0 ? first : await tiff.getImage(i);
    // Masks share the IFD list; keep only true overviews of the main image.
    if (image.getSamplesPerPixel() < 3) continue;
    const k = W0 / image.getWidth();
    levels.push({ image, width: image.getWidth(), height: image.getHeight(), resX: resX * k, resY: resY * k });
  }
  const geographic = epsg === 4326 || epsg === 4979;
  const metres = geographic ? Math.abs(resX) * 111_320 * Math.cos((originY * Math.PI) / 180) : Math.abs(resX);
  return { tiff, levels, originX, originY, project, metres, geographic };
}

function cogInfo(url: string): Promise<CogInfo> {
  let p = cogs.get(url);
  if (p) {
    // Most recently used moves to the end.
    cogs.delete(url);
    cogs.set(url, p);
    return p;
  }
  p = openCog(url);
  const opened = p;
  p.catch(() => {
    if (cogs.get(url) === opened) cogs.delete(url);
  });
  cogs.set(url, p);
  while (cogs.size > MAX_OPEN_COGS) cogs.delete(cogs.keys().next().value as string);
  return p;
}

/**
 * Start opening a COG (header and overview directory) ahead of its first tile.
 * Parsing a large COG's IFDs takes a few round trips; doing it while a camera
 * flight is still under way means tiles can render as soon as it lands.
 */
export function warmCog(url: string): void {
  void cogInfo(url).catch(() => {
    /* the first tile request will surface the error */
  });
}

let emptyTile: Promise<ImageBitmap> | null = null;
function transparentTile(): Promise<ImageBitmap> {
  emptyTile ??= createImageBitmap(new ImageData(TILE, TILE));
  return emptyTile;
}

/**
 * Render one Web Mercator tile from a COG. Pixels outside the image, black
 * no-data, or outside `clip` (lon/lat) are transparent.
 */
export async function renderCogTile(
  url: string,
  z: number,
  x: number,
  y: number,
  clip: number[] | null,
  signal?: AbortSignal,
): Promise<ImageBitmap> {
  const [w, n] = tilePixelToLngLat(z, x, y);
  const [e, s] = tilePixelToLngLat(z, x + 1, y + 1);
  if (clip && (e < clip[0] || w > clip[2] || n < clip[1] || s > clip[3])) return transparentTile();
  const info = await cogInfo(url);

  // Output pixel size in metres at this latitude; pick the coarsest overview at least that fine.
  const lat = (n + s) / 2;
  const tileMetres = ((2 * Math.PI * 6378137 * Math.cos((lat * Math.PI) / 180)) / 2 ** z) / TILE;
  let level = info.levels[0];
  for (const l of info.levels) {
    if (info.metres * (info.levels[0].width / l.width) <= tileMetres * 1.25) level = l;
  }

  // Source pixel coordinates on a coarse mesh, interpolated per pixel (projections are smooth at tile scale).
  const MESH = 16;
  const steps = TILE / MESH;
  const meshC = new Float64Array((steps + 1) * (steps + 1));
  const meshR = new Float64Array((steps + 1) * (steps + 1));
  let cmin = Infinity;
  let cmax = -Infinity;
  let rmin = Infinity;
  let rmax = -Infinity;
  for (let j = 0; j <= steps; j++) {
    for (let i = 0; i <= steps; i++) {
      const [lng, la] = tilePixelToLngLat(z, x + (i * MESH) / TILE, y + (j * MESH) / TILE);
      const [X, Y] = info.project(lng, la);
      const c = (X - info.originX) / level.resX;
      const r = (Y - info.originY) / level.resY;
      const k = j * (steps + 1) + i;
      meshC[k] = c;
      meshR[k] = r;
      cmin = Math.min(cmin, c);
      cmax = Math.max(cmax, c);
      rmin = Math.min(rmin, r);
      rmax = Math.max(rmax, r);
    }
  }
  const c0 = Math.max(0, Math.floor(cmin) - 1);
  const r0 = Math.max(0, Math.floor(rmin) - 1);
  const c1 = Math.min(level.width, Math.ceil(cmax) + 2);
  const r1 = Math.min(level.height, Math.ceil(rmax) + 2);
  if (c1 - c0 < 2 || r1 - r0 < 2) return transparentTile();
  const abortIfCancelled = () => {
    if (signal?.aborted) throw new DOMException('Tile request cancelled', 'AbortError');
  };
  abortIfCancelled();

  // The signal is deliberately not passed down: geotiff's block cache shares
  // range requests between tiles, and aborting one leaves a rejected block
  // promise nobody awaits (an unhandled rejection). Neighbouring tiles usually
  // need the same blocks anyway, so let the read finish and drop the result.
  const rgb = (await level.image.readRGB({
    window: [c0, r0, c1, r1],
    interleave: true,
    enableAlpha: false,
    pool: pool ?? undefined,
  } as Parameters<GeoTIFFImage['readRGB']>[0])) as unknown as Uint8Array;
  abortIfCancelled();
  const ww = c1 - c0;
  const wh = r1 - r0;

  const out = new Uint8ClampedArray(TILE * TILE * 4);
  for (let py = 0; py < TILE; py++) {
    const gy = py / MESH;
    const j = Math.min(steps - 1, Math.floor(gy));
    const fy = gy - j;
    // Latitude of this row, for clipping.
    const rowLat = clip ? tilePixelToLngLat(z, x, y + (py + 0.5) / TILE)[1] : 0;
    for (let px = 0; px < TILE; px++) {
      if (clip) {
        const lng = w + ((e - w) * (px + 0.5)) / TILE;
        if (lng < clip[0] || lng > clip[2] || rowLat < clip[1] || rowLat > clip[3]) continue;
      }
      const gx = px / MESH;
      const i = Math.min(steps - 1, Math.floor(gx));
      const fx = gx - i;
      const k00 = j * (steps + 1) + i;
      const k10 = k00 + 1;
      const k01 = k00 + steps + 1;
      const k11 = k01 + 1;
      const c = (meshC[k00] * (1 - fx) + meshC[k10] * fx) * (1 - fy) + (meshC[k01] * (1 - fx) + meshC[k11] * fx) * fy - c0 - 0.5;
      const r = (meshR[k00] * (1 - fx) + meshR[k10] * fx) * (1 - fy) + (meshR[k01] * (1 - fx) + meshR[k11] * fx) * fy - r0 - 0.5;
      if (c < 0 || r < 0 || c >= ww - 1 || r >= wh - 1) continue;
      const cx = c | 0;
      const cy = r | 0;
      const ax = c - cx;
      const ay = r - cy;
      const q00 = (cy * ww + cx) * 3;
      const q10 = q00 + 3;
      const q01 = q00 + ww * 3;
      const q11 = q01 + 3;
      const o = (py * TILE + px) * 4;
      let sum = 0;
      for (let b = 0; b < 3; b++) {
        const v = (rgb[q00 + b] * (1 - ax) + rgb[q10 + b] * ax) * (1 - ay) + (rgb[q01 + b] * (1 - ax) + rgb[q11 + b] * ax) * ay;
        out[o + b] = v;
        sum += v;
      }
      // Black is no-data in visual COGs.
      out[o + 3] = sum < 3 ? 0 : 255;
    }
  }
  return createImageBitmap(new ImageData(out, TILE, TILE));
}

let registered = false;
/** Register the `cog://` protocol with MapLibre (idempotent; shared by every map). */
export function registerCogProtocol(): void {
  if (registered) return;
  registered = true;
  maplibregl.addProtocol(COG_PROTOCOL, async (params, abortController) => {
    const parsed = parseCogTileUrl(params.url);
    if (!parsed) throw new Error(`bad COG tile url ${params.url}`);
    const data = await renderCogTile(parsed.url, parsed.z, parsed.x, parsed.y, parsed.clip, abortController.signal);
    return { data };
  });
}
