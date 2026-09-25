import { describe, expect, it, vi } from 'vitest';
import { lazy } from './lazy';

describe('lazy', () => {
  it('creates once and caches', async () => {
    const create = vi.fn(async () => ({ n: 1 }));
    const l = lazy(create);
    expect(l.get()).toBeNull();
    const [a, b] = await Promise.all([l.load(), l.load()]);
    expect(a).toBe(b);
    expect(l.get()).toBe(a);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('request() loads once and calls onReady once, however often it is called', async () => {
    const onReady = vi.fn();
    const create = vi.fn(async () => 'v');
    const l = lazy(create, { onReady });
    for (let i = 0; i < 60; i++) l.request();
    await vi.waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
    l.request();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('destroys a value that lands after dispose', async () => {
    const destroy = vi.fn();
    const l = lazy(async () => 'v', { destroy });
    const p = l.load();
    l.dispose();
    expect(await p).toBeNull();
    expect(destroy).toHaveBeenCalledWith('v');
    expect(l.get()).toBeNull();
  });

  it('backs off after a failure, then retries', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    let calls = 0;
    const l = lazy(
      async () => {
        calls++;
        if (calls === 1) throw new Error('offline');
        return 'ok';
      },
      { retryAfterMs: 1000 },
    );
    l.request();
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toBe(1);
    l.request(); // within the back-off: ignored
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toBe(1);
    await vi.advanceTimersByTimeAsync(1001);
    l.request();
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toBe(2);
    expect(l.get()).toBe('ok');
    vi.useRealTimers();
    spy.mockRestore();
  });
});
