import { describe, expect, it } from 'vitest';
import { angleDelta, bearingBetween, cameraDistanceMeters, chaseClearance, clearPitch, offsetPosition, trackHead, type ChaseTerrain } from './follow';

describe('follow camera maths', () => {
  it('bearingBetween gives compass bearings', () => {
    expect(bearingBetween([0, 0], [0, 1])).toBeCloseTo(0);
    expect(bearingBetween([0, 0], [1, 0])).toBeCloseTo(90);
    expect(bearingBetween([0, 0], [0, -1])).toBeCloseTo(180);
    expect(bearingBetween([0, 0], [-1, 0])).toBeCloseTo(270);
  });

  it('angleDelta takes the short way round', () => {
    expect(angleDelta(350, 10)).toBe(20);
    expect(angleDelta(10, 350)).toBe(-20);
    expect(Math.abs(angleDelta(0, 180))).toBe(180);
  });

  it('trackHead finds the moving head and its direction', () => {
    const part = { coords: [[0, 0], [0, 1], [1, 1]], times: [0, 100, 200] };
    const mid = trackHead([part], 50, 10)!;
    expect(mid.head[1]).toBeCloseTo(0.5);
    expect(mid.bearing).toBeCloseTo(0);
    const turned = trackHead([part], 150, 10)!;
    expect(turned.bearing).toBeCloseTo(90, 0);
    expect(trackHead([part], 250, 10)).toBeNull(); // finished
    expect(trackHead([part], -5, 10)).toBeNull(); // not started
  });

  it('offsetPosition moves the given ground distance', () => {
    const [lng, lat] = offsetPosition([85, 28], 1000, 0);
    expect(lng).toBeCloseTo(85);
    expect((lat - 28) * 111_320).toBeCloseTo(1000, 0);
    const east = offsetPosition([85, 28], 1000, 90);
    expect((east[0] - 85) * 111_320 * Math.cos((28 * Math.PI) / 180)).toBeCloseTo(1000, 0);
  });

  it('cameraDistanceMeters matches MapLibre scale', () => {
    // 900 px viewport, default 36.87° fov → 1350 px camera-to-centre distance.
    expect(cameraDistanceMeters(1350, 12.6, 28) / 1000).toBeCloseTo(15.0, 0);
    expect(cameraDistanceMeters(1350, 13.6, 28)).toBeCloseTo(cameraDistanceMeters(1350, 12.6, 28) / 2);
  });
});

describe('chase camera terrain clearance', () => {
  const head = [85.5, 28];
  const flat: ChaseTerrain = { heightAt: () => 1000, clearance: chaseClearance(1) };
  // A 3 km-high wall 5 km behind the head (bearing 180 → the camera sits to the north).
  const wall: ChaseTerrain = {
    heightAt: ([, lat]: number[]) => ((lat - 28) * 111_320 > 5000 ? 4000 : 1000),
    clearance: chaseClearance(1),
  };

  it('keeps the requested pitch over open ground', () => {
    expect(clearPitch(head, 1000, 180, 64, 15_000, flat)).toBe(64);
  });

  it('lowers the pitch until the sight line clears a ridge', () => {
    const pitch = clearPitch(head, 1000, 180, 64, 15_000, wall);
    expect(pitch).toBeLessThan(64);
    // The sight line passes over the wall's near edge (sampled every ~210 m)…
    const tan = Math.tan((pitch * Math.PI) / 180);
    const clearance = chaseClearance(1)(5000);
    expect(5000 / tan).toBeGreaterThan(3000);
    // …and not by much: the constraint is tight.
    expect(5000 / tan).toBeLessThan(3000 + clearance + 150);
  });

  it('ignores terrain it cannot see yet', () => {
    expect(clearPitch(head, 1000, 180, 64, 15_000, { heightAt: () => null, clearance: () => 0 })).toBe(64);
  });

  it('keeps the camera above ground at its own position', () => {
    // Rising ground under where the camera would be, but nothing on the line close to the head.
    const slope: ChaseTerrain = {
      heightAt: ([, lat]: number[]) => 1000 + Math.max(0, (lat - 28) * 111_320 - 9000) * 2,
      clearance: () => 0,
    };
    const pitch = clearPitch(head, 1000, 180, 70, 15_000, slope);
    const dh = 15_000 * Math.sin((pitch * Math.PI) / 180);
    const dv = 15_000 * Math.cos((pitch * Math.PI) / 180);
    expect(1000 + Math.max(0, dh - 9000) * 2).toBeLessThanOrEqual(1000 + dv + 1);
  });
});

