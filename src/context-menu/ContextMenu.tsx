import { useEffect, useState, useCallback } from 'react';
import { contextMenuRegistry, ContextMenuContext, ContextMenuItem } from './context-menu-registry';
import { ZoomIn, Copy, Trash2, FileJson } from 'lucide-react';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  context: ContextMenuContext | null;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'zoom-to-feature': ZoomIn,
  'copy-properties': Copy,
  'copy-geojson': FileJson,
  'delete-feature': Trash2,
};

export default function ContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState>({
    visible: false, x: 0, y: 0, context: null,
  });

  const close = useCallback(() => {
    setMenu(prev => ({ ...prev, visible: false }));
  }, []);

  // Listen for custom context menu events from the map
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { x: number; y: number; context: ContextMenuContext };
      setMenu({ visible: true, x: detail.x, y: detail.y, context: detail.context });
    };
    window.addEventListener('geojson-context-menu', handler);
    return () => window.removeEventListener('geojson-context-menu', handler);
  }, []);

  // Close on click outside or Escape
  useEffect(() => {
    if (!menu.visible) return;
    const handleClick = () => close();
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    // Delay to avoid the triggering right-click from closing immediately
    const timer = setTimeout(() => {
      window.addEventListener('click', handleClick);
      window.addEventListener('contextmenu', handleClick);
      window.addEventListener('keydown', handleKeyDown);
    }, 10);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('contextmenu', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menu.visible, close]);

  if (!menu.visible || !menu.context) return null;

  const items = contextMenuRegistry.getItemsForContext(menu.context);

  // Pre-compute which items need dividers
  const dividerBefore = new Set<string>();
  for (let i = 1; i < items.length; i++) {
    if (items[i].group !== items[i - 1].group) {
      dividerBefore.add(items[i].id);
    }
  }

  // Clamp menu position to stay within viewport
  const menuX = Math.min(menu.x, window.innerWidth - 200);
  const menuY = Math.min(menu.y, window.innerHeight - (items.length * 36 + 16));

  return (
    <div
      className="fixed z-50 min-w-[180px] rounded-xl bg-white/80 backdrop-blur-2xl border border-white/30 shadow-2xl shadow-black/10 py-1"
      style={{ left: menuX, top: menuY }}
    >
      {items.map((item: ContextMenuItem) => {
        const showDivider = dividerBefore.has(item.id);
        const Icon = ICON_MAP[item.id];
        return (
          <div key={item.id}>
            {showDivider && <div className="h-px bg-gray-200/50 my-1" />}
            <button
              className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-left transition-colors hover:bg-black/5 ${
                item.group === 'danger' ? 'text-red-600' : 'text-gray-700'
              }`}
              onClick={() => {
                item.execute(menu.context!);
                close();
              }}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {item.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
