import type { MapContextMenuContext } from '@/core/engine';

/** What a context-menu item receives: pure data, no framework handles. */
export type ContextMenuContext = MapContextMenuContext;

export interface ContextMenuItem {
  id: string;
  label: string;
  isVisible?: (ctx: ContextMenuContext) => boolean;
  execute: (ctx: ContextMenuContext) => void;
  group?: 'navigate' | 'data' | 'edit' | 'style' | 'danger';
  order?: number;
}

const GROUP_ORDER = ['navigate', 'data', 'edit', 'style', 'danger'];

class ContextMenuRegistry {
  private items = new Map<string, ContextMenuItem>();

  register(item: ContextMenuItem): void {
    this.items.set(item.id, item);
  }

  unregister(id: string): void {
    this.items.delete(id);
  }

  getItemsForContext(ctx: ContextMenuContext): ContextMenuItem[] {
    return Array.from(this.items.values())
      .filter((item) => !item.isVisible || item.isVisible(ctx))
      .sort((a, b) => {
        const ga = GROUP_ORDER.indexOf(a.group ?? 'edit');
        const gb = GROUP_ORDER.indexOf(b.group ?? 'edit');
        if (ga !== gb) return ga - gb;
        return (a.order ?? 0) - (b.order ?? 0);
      });
  }
}

export const contextMenuRegistry = new ContextMenuRegistry();
