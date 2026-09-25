import { describe, expect, it } from 'vitest';
import { easeInOutQuad, flightDurationMs, flightPathLength } from './flight';

const view = { width: 1440, height: 900 };

describe('flight timing', () => {
  it('is zero for no move and grows with distance', () => {
    const here = { lng: 85.3, lat: 28.2, zoom: 12 };
    expect(flightPathLength({ from: here, to: here, ...view })).toBe(0);
    const near = flightPathLength({ from: here, to: { lng: 85.35, lat: 28.2, zoom: 12 }, ...view });
    const far = flightPathLength({ from: here, to: { lng: 84.4, lat: 27.7, zoom: 12 }, ...view });
    expect(near).toBeGreaterThan(0);
    expect(far).toBeGreaterThan(near);
  });

  it('counts pure zoom changes', () => {
    const S = flightPathLength({ from: { lng: 85, lat: 28, zoom: 8 }, to: { lng: 85, lat: 28, zoom: 12 }, ...view });
    expect(S).toBeCloseTo(Math.log(16) / 1.42, 3);
  });

  it('clamps durations', () => {
    const here = { lng: 85.3, lat: 28.2, zoom: 12 };
    expect(flightDurationMs({ from: here, to: here, ...view }, { minMs: 2500 })).toBe(2500);
    expect(flightDurationMs({ from: here, to: { lng: -70, lat: 40, zoom: 12 }, ...view })).toBe(6500);
  });

  it('eases in and out symmetrically', () => {
    expect(easeInOutQuad(0)).toBe(0);
    expect(easeInOutQuad(1)).toBe(1);
    expect(easeInOutQuad(0.5)).toBeCloseTo(0.5);
    expect(easeInOutQuad(0.25) + easeInOutQuad(0.75)).toBeCloseTo(1);
  });
});
