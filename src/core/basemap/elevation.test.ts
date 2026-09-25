import { describe, expect, it } from 'vitest';
import { createElevationSampler, decodeTerrarium, decodeTerrariumPixels, tileFraction, type DemTile } from './elevation';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('DEM sampler', () => {
  it('decodes Terrarium RGB', () => {
    expect(decodeTerrarium(128, 0, 0)).toBe(0);
    expect(decodeTerrarium(139, 136, 128)).toBe(2952.5);
    const tile = decodeTerrariumPixels([128, 100, 0, 255, 127, 0, 0, 255], 2, 1);
    expect(Array.from(tile.data)).toEqual([100, -256]);
  });

  it('computes Web Mercator tile coordinates', () => {
    expect(tileFraction(0, 0, 1)).toEqual([1, 1]);
    const [x, y] = tileFraction(85.3, 27.7, 10);
    expect(Math.floor(x)).toBe(754);
    expect(Math.floor(y)).toBe(429);
  });

  it('fetches covering tiles once and samples bilinearly across tile edges', async () => {
    const requested: string[] = [];
    // Height = global pixel column, so bilinear results are easy to predict.
    const loader = async (z: number, x: number, y: number): Promise<DemTile> => {
      requested.push(`${z}/${x}/${y}`);
      const data = new Int16Array(256 * 256);
      for (let r = 0; r < 256; r++) for (let c = 0; c < 256; c++) data[r * 256 + c] = (x * 256 + c) % 30000;
      return { width: 256, height: 256, data };
    };
    const sampler = createElevationSampler(loader, { zoom: 4 });
    // Before anything loads, heights are unknown.
    expect(sampler.elevation(10, 10)).toBeNull();
    sampler.prefetch([[10, 10]], 50);
    sampler.prefetch([[10, 10]], 50);
    await flush();
    expect(new Set(requested).size).toBe(requested.length); // no duplicate fetches
    const [fx] = tileFraction(10, 10, 4);
    expect(sampler.elevation(10, 10)).toBeCloseTo(fx * 256 - 0.5, 3);
    // A point on a tile seam blends both neighbours.
    const seamLng = (9 / 16) * 360 - 180; // x = 9 exactly at z4
    sampler.prefetch([[seamLng, 10]], 10);
    await flush();
    expect(sampler.elevation(seamLng, 10)).toBeCloseTo(9 * 256 - 0.5, 3);
    sampler.destroy();
    expect(sampler.elevation(10, 10)).toBeNull();
  });

  it('treats failed tiles as unknown', async () => {
    const sampler = createElevationSampler(async () => {
      throw new Error('offline');
    });
    sampler.prefetch([[85, 28]], 1);
    await flush();
    expect(sampler.elevation(85, 28)).toBeNull();
  });
});
