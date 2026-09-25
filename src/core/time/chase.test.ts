import { describe, expect, it } from 'vitest';
import {
  distanceAtTime,
  fromMercator,
  groundDistance,
  measureTrack,
  paceFor,
  pointAtDistance,
  smoothDamp,
  speedAtTime,
  toMercator,
} from './chase';

describe('smoothDamp', () => {
  it('converges without overshoot and is frame-rate independent', () => {
    const run = (dt: number) => {
      let x = 0;
      let v = 0;
      let max = 0;
      for (let t = 0; t < 3; t += dt) {
        [x, v] = smoothDamp(x, 100, v, 0.5, dt);
        max = Math.max(max, x);
      }
      return { x, max };
    };
    const at60 = run(1 / 60);
    const at144 = run(1 / 144);
    expect(at60.x).toBeCloseTo(100, 0);
    expect(at60.max).toBeLessThanOrEqual(100.0001);
    expect(Math.abs(at60.x - at144.x)).toBeLessThan(0.5);
  });

  it('keeps velocity continuous when the target jumps', () => {
    let x = 0;
    let v = 0;
    [x, v] = smoothDamp(x, 10, v, 0.5, 1 / 60);
    const before = v;
    [x, v] = smoothDamp(x, -10, v, 0.5, 1 / 60);
    // One frame after reversing the target, velocity changes by a bounded amount.
    expect(Math.abs(v - before)).toBeLessThan(Math.abs(before) * 3 + 5);
    expect(x).toBeGreaterThan(0);
  });
});

describe('along-track geometry', () => {
  // Two 1 km legs north then east, taking 100 s and 400 s.
  const lat0 = 28;
  const dLat = 1000 / 111_320;
  const dLng = 1000 / (111_320 * Math.cos(((lat0 + dLat) * Math.PI) / 180));
  const track = measureTrack({
    coords: [[85, lat0], [85, lat0 + dLat], [85 + dLng, lat0 + dLat]],
    times: [0, 100_000, 500_000],
  });

  it('measures cumulative length', () => {
    expect(track.length).toBeGreaterThan(1990);
    expect(track.length).toBeLessThan(2010);
  });

  it('maps time to distance, clamped', () => {
    expect(distanceAtTime(track, -5)).toBe(0);
    expect(distanceAtTime(track, 50_000)).toBeCloseTo(track.cum[1] / 2, 3);
    expect(distanceAtTime(track, 300_000)).toBeCloseTo(track.cum[1] + (track.cum[2] - track.cum[1]) / 2, 3);
    expect(distanceAtTime(track, 1e9)).toBe(track.length);
  });

  it('finds points by distance', () => {
    const mid = pointAtDistance(track, track.cum[1] / 2);
    expect(mid[0]).toBeCloseTo(85, 6);
    expect(groundDistance(track.coords[0], mid)).toBeCloseTo(track.cum[1] / 2, 0);
    expect(pointAtDistance(track, 1e9)).toEqual(track.coords[2]);
  });

  it('reports front speed per leg', () => {
    expect(speedAtTime(track, 50_000, 10_000) * 1000).toBeCloseTo(10, 0); // 1 km in 100 s
    expect(speedAtTime(track, 300_000, 10_000) * 1000).toBeCloseTo(2.5, 1); // 1 km in 400 s
  });

  it('round-trips Web Mercator', () => {
    const [x, y] = toMercator([85.3, 28.2]);
    const [lng, lat] = fromMercator(x, y);
    expect(lng).toBeCloseTo(85.3, 9);
    expect(lat).toBeCloseTo(28.2, 9);
  });
});

describe('paceFor', () => {
  it('slows the timeline only when the front would outrun the view', () => {
    expect(paceFor(1000, 10_000, 0.2)).toBe(1); // 1 km/s < 2 km/s allowed
    expect(paceFor(8000, 10_000, 0.2)).toBeCloseTo(0.25);
    expect(paceFor(1e9, 10_000, 0.2)).toBe(0.05);
    expect(paceFor(0, 10_000, 0.2)).toBe(1);
  });
});
