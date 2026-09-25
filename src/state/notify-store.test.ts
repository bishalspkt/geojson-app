import { afterEach, describe, expect, it, vi } from 'vitest';
import { notify, useNotifyStore } from './notify-store';

describe('notify', () => {
  afterEach(() => {
    vi.useRealTimers();
    useNotifyStore.setState({ notices: [] });
  });

  it('queues notices, keeps at most three, and expires them', () => {
    vi.useFakeTimers();
    for (const m of ['a', 'b', 'c', 'd']) notify(m);
    expect(useNotifyStore.getState().notices.map((n) => n.message)).toEqual(['b', 'c', 'd']);
    vi.advanceTimersByTime(6000);
    expect(useNotifyStore.getState().notices).toEqual([]);
  });

  it('can be dismissed early', () => {
    notify('hello', 'info');
    const [n] = useNotifyStore.getState().notices;
    expect(n.tone).toBe('info');
    useNotifyStore.getState().dismiss(n.id);
    expect(useNotifyStore.getState().notices).toEqual([]);
  });
});
