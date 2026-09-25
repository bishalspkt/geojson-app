// Elevation sampling from the open Terrarium DEM tiles (the same source the
// app uses for 3D terrain): elevation = R·256 + G + B/256 − 32768 metres.

import sharp from 'sharp';
import { cachedFetch } from './lib.mjs';

const TILE_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const tiles = new Map();

async function tile(z, x, y) {
  const k = `${z}/${x}/${y}`;
  if (!tiles.has(k)) {
    tiles.set(
      k,
      (async () => {
        const png = await cachedFetch(TILE_URL.replace('{z}', z).replace('{x}', x).replace('{y}', y), { type: 'buffer' });
        const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
        const elev = new Float32Array(info.width * info.height);
        for (let i = 0; i < elev.length; i++) {
          const o = i * info.channels;
          elev[i] = data[o] * 256 + data[o + 1] + data[o + 2] / 256 - 32768;
        }
        return { elev, size: info.width };
      })(),
    );
  }
  return tiles.get(k);
}

/** Elevation (m) at [lon, lat], bilinear within a zoom-`z` tile (z12 ≈ 30 m pixels here). */
export async function elevationAt([lon, lat], z = 12) {
  const n = 2 ** z;
  const fx = ((lon + 180) / 360) * n;
  const latR = (lat * Math.PI) / 180;
  const fy = ((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n;
  const tx = Math.floor(fx);
  const ty = Math.floor(fy);
  const { elev, size } = await tile(z, tx, ty);
  const px = (fx - tx) * size - 0.5;
  const py = (fy - ty) * size - 0.5;
  const x0 = Math.max(0, Math.min(size - 1, Math.floor(px)));
  const y0 = Math.max(0, Math.min(size - 1, Math.floor(py)));
  const x1 = Math.min(size - 1, x0 + 1);
  const y1 = Math.min(size - 1, y0 + 1);
  const ax = Math.max(0, Math.min(1, px - x0));
  const ay = Math.max(0, Math.min(1, py - y0));
  const v = (x, y) => elev[y * size + x];
  return (v(x0, y0) * (1 - ax) + v(x1, y0) * ax) * (1 - ay) + (v(x0, y1) * (1 - ax) + v(x1, y1) * ax) * ay;
}

/** Elevation for many points (sequential to keep tile fetches polite and cached). */
export async function elevations(points, z = 12) {
  const out = [];
  for (const p of points) out.push(await elevationAt(p, z));
  return out;
}
