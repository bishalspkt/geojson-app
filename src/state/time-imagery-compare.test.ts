import { beforeEach, describe, expect, it } from 'vitest';
import { advanceTime, useTimeStore } from './time-store';
import { resetImageryIdCounter, useImageryStore } from './imagery-store';
import { useCompareStore } from './compare-store';

const initialTime = useTimeStore.getState();

beforeEach(() => {
  useTimeStore.setState({ ...initialTime });
  resetImageryIdCounter();
  useImageryStore.setState({ layers: [] });
  useCompareStore.getState().stop();
});

describe('time store', () => {
  it('enable configures extent and clamps the playhead', () => {
    useTimeStore.getState().enable({ extent: [100, 200], current: 500, duration: 10 });
    const s = useTimeStore.getState();
    expect(s.enabled).toBe(true);
    expect(s.current).toBe(200);
    expect(s.duration).toBe(10);
  });

  it('setting an extent moves the playhead to its start unless given', () => {
    useTimeStore.getState().configure({ extent: [1000, 2000] });
    expect(useTimeStore.getState().current).toBe(1000);
  });

  it('play restarts from the beginning when at the end', () => {
    useTimeStore.getState().configure({ extent: [0, 100], current: 100 });
    useTimeStore.getState().play();
    expect(useTimeStore.getState()).toMatchObject({ playing: true, current: 0 });
  });

  it('tick advances proportionally and stops at the end', () => {
    // 1000 ms of data over a 10 s pass → 100 ms of data per real second.
    useTimeStore.getState().configure({ extent: [0, 1000], current: 0, duration: 10 });
    useTimeStore.getState().play();
    useTimeStore.getState().tick(1000);
    expect(useTimeStore.getState().current).toBeCloseTo(100);
    useTimeStore.getState().setSpeed(2);
    useTimeStore.getState().tick(1000);
    expect(useTimeStore.getState().current).toBeCloseTo(300);
    useTimeStore.getState().tick(60_000);
    expect(useTimeStore.getState()).toMatchObject({ current: 1000, playing: false });
  });

  it('tick is a no-op while paused', () => {
    useTimeStore.getState().configure({ extent: [0, 1000], current: 0 });
    useTimeStore.getState().tick(1000);
    expect(useTimeStore.getState().current).toBe(0);
  });

  it('advanceTime loops when asked', () => {
    const next = advanceTime({ extent: [0, 100], current: 90, duration: 1, speed: 1, loop: true }, 200);
    expect(next.playing).toBe(true);
    expect(next.current).toBeCloseTo(10);
  });

  it('pace slows playback and resets with the timeline', () => {
    const slow = advanceTime({ extent: [0, 1000], current: 0, duration: 1, speed: 1, loop: false, pace: 0.25 }, 400);
    expect(slow.current).toBeCloseTo(100);
    const t = useTimeStore.getState();
    t.setPace(0.5);
    expect(useTimeStore.getState().pace).toBe(0.5);
    t.setPace(7);
    expect(useTimeStore.getState().pace).toBe(1);
    t.setPace(0.5);
    t.enable({ extent: [0, 10] });
    expect(useTimeStore.getState().pace).toBe(1);
  });

  it('derived extents are ignored while locked', () => {
    const t = useTimeStore.getState();
    t.configure({ extent: [0, 10], lockExtent: true });
    t.setDerivedExtent([100, 200]);
    expect(useTimeStore.getState().extent).toEqual([0, 10]);
    t.configure({ lockExtent: false });
    t.setDerivedExtent([100, 200]);
    expect(useTimeStore.getState().extent).toEqual([100, 200]);
    expect(useTimeStore.getState().current).toBe(200);
  });

  it('setWindow normalizes non-positive windows to cumulative', () => {
    useTimeStore.getState().setWindow(0);
    expect(useTimeStore.getState().window).toBeNull();
    useTimeStore.getState().setWindow(3600_000);
    expect(useTimeStore.getState().window).toBe(3600_000);
  });
});

describe('imagery store', () => {
  const source = { type: 'xyz' as const, tiles: ['https://example.com/{z}/{x}/{y}.png'] };

  it('adds with defaults and session ids', () => {
    const id = useImageryStore.getState().addImagery({ name: 'Sat', source });
    expect(id).toBe('R1');
    expect(useImageryStore.getState().layers[0]).toMatchObject({ visible: true, opacity: 1, origin: 'upload' });
  });

  it('replaces in place when the id matches', () => {
    const s = useImageryStore.getState();
    s.addImagery({ id: 'a', name: 'A', source });
    s.addImagery({ id: 'b', name: 'B', source });
    s.addImagery({ id: 'a', name: 'A2', source });
    expect(useImageryStore.getState().layers.map((l) => l.name)).toEqual(['A2', 'B']);
  });

  it('clamps opacity, toggles visibility, clears by origin', () => {
    const s = useImageryStore.getState();
    s.addImagery({ id: 'a', name: 'A', source, origin: 'story' });
    s.addImagery({ id: 'b', name: 'B', source });
    s.setImageryOpacity('a', 4);
    s.setImageryVisible('b', false);
    expect(useImageryStore.getState().layers.map((l) => [l.opacity, l.visible])).toEqual([
      [1, true],
      [1, false],
    ]);
    s.clearImagery({ origin: 'story' });
    expect(useImageryStore.getState().layers.map((l) => l.id)).toEqual(['b']);
  });
});

describe('compare store', () => {
  it('starts, clamps the divider, and stops', () => {
    const c = useCompareStore.getState();
    c.start({ left: ['before'], leftLabel: '2023', rightLabel: '2024', position: 2 });
    expect(useCompareStore.getState()).toMatchObject({ active: true, left: ['before'], position: 0.98 });
    c.setPosition(-1);
    expect(useCompareStore.getState().position).toBe(0.02);
    c.stop();
    expect(useCompareStore.getState()).toMatchObject({ active: false, left: [] });
  });
});
