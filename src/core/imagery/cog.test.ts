import { describe, expect, it } from 'vitest';
import { cogTileUrl, parseCogTileUrl, projectorFor, tilePixelToLngLat, utmForward } from './cog';

describe('COG tiles', () => {
  it('round-trips tile URLs with the COG url and clip box', () => {
    const tpl = cogTileUrl('https://example.org/a b.tif?x=1', [85.1, 27.9, 85.2, 28]);
    const parsed = parseCogTileUrl(tpl.replace('{z}', '17').replace('{x}', '96412').replace('{y}', '54632'));
    expect(parsed).toEqual({ z: 17, x: 96412, y: 54632, url: 'https://example.org/a b.tif?x=1', clip: [85.1, 27.9, 85.2, 28] });
    expect(parseCogTileUrl('cog://tile/1/2/3')).toBeNull();
    expect(parseCogTileUrl('https://example.org/1/2/3.png')).toBeNull();
  });

  it('converts tile positions to lon/lat', () => {
    expect(tilePixelToLngLat(0, 0, 0)[0]).toBeCloseTo(-180);
    expect(tilePixelToLngLat(0, 0.5, 0.5)).toEqual([0, 0]);
    expect(tilePixelToLngLat(1, 1, 1)[1]).toBeCloseTo(0);
  });

  it('projects WGS84 to UTM like proj4', () => {
    // Reference values from proj4 (EPSG:32645): Syabrubesi and Devghat.
    const [x1, y1] = utmForward(85.338, 28.1628, 45, false);
    expect(x1).toBeCloseTo(336821.437, 1);
    expect(y1).toBeCloseTo(3116354.004, 1);
    const [x2, y2] = utmForward(84.4254, 27.7392, 45, false);
    expect(x2).toBeCloseTo(246203.245, 1);
    expect(y2).toBeCloseTo(3070968.006, 1);
    expect(projectorFor(32645)!(85.338, 28.1628)[0]).toBeCloseTo(336821.437, 1);
    expect(projectorFor(4326)!(85, 28)).toEqual([85, 28]);
    expect(projectorFor(2193)).toBeNull();
  });
});
