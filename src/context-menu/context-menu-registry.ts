import { IdentifiedFeature } from '@/types';
import { GeoJsonActions } from '@/services';

export interface ContextMenuContext {
  feature: IdentifiedFeature | null;
  lngLat: { lng: number; lat: number };
  mapInstance: maplibregl.Map | null;
  actions: GeoJsonActions;
}

export interface ContextMenuItem {
  id: string;
  label: string;
  iconClass?: string;
  isVisible?: (ctx: ContextMenuContext) => boolean;
  execute: (ctx: ContextMenuContext) => void;
  group?: 'navigate' | 'data' | 'edit' | 'style' | 'danger';
  order?: number;
}

class ContextMenuRegistry {
  private items: Map<string, ContextMenuItem> = new Map();

  register(item: ContextMenuItem): void {
    this.items.set(item.id, item);
  }

  unregister(id: string): void {
    this.items.delete(id);
  }

  getItemsForContext(ctx: ContextMenuContext): ContextMenuItem[] {
    return Array.from(this.items.values())
      .filter(item => !item.isVisible || item.isVisible(ctx))
      .sort((a, b) => {
        const groupOrder = ['navigate', 'data', 'edit', 'style', 'danger'];
        const ga = groupOrder.indexOf(a.group ?? 'edit');
        const gb = groupOrder.indexOf(b.group ?? 'edit');
        if (ga !== gb) return ga - gb;
        return (a.order ?? 0) - (b.order ?? 0);
      });
  }
}

export const contextMenuRegistry = new ContextMenuRegistry();
