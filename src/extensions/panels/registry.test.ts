import { describe, expect, it, vi } from 'vitest';
import { Layers } from 'lucide-react';
import { getPanel, lazyPanel, listPanels, registerPanel, unregisterPanel } from './registry';

describe('panel registry', () => {
  it('lists panels by order', () => {
    const base = { title: 'x', icon: Layers, component: () => null };
    registerPanel({ ...base, id: 'b', order: 20 });
    registerPanel({ ...base, id: 'a', order: 10 });
    expect(listPanels().map((p) => p.id)).toEqual(['a', 'b']);
    unregisterPanel('a');
    unregisterPanel('b');
    expect(getPanel('a')).toBeUndefined();
  });

  it('lazyPanel loads the module once, on preload or first render', async () => {
    const load = vi.fn(async () => ({ default: () => null }));
    const panel = lazyPanel(load);
    expect(load).not.toHaveBeenCalled();
    panel.preload!();
    panel.preload!();
    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(1);
    expect(panel.component).toBeTypeOf('object'); // a React.lazy component
  });
});
