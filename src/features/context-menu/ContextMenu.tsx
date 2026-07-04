import { useEffect, useState, useCallback } from 'react';
import { Eye, FileJson, MapPin, Minus, Pentagon, Plus, Ruler, Trash2, ZoomIn } from 'lucide-react';
import { CONTEXT_MENU_EVENT, MapContextMenuContext } from '@/core';
import { contextMenuRegistry, ContextMenuItem } from '@/extensions/context-menu/registry';
import { getFeatureDetails } from './feature-details';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  context: MapContextMenuContext | null;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'zoom-to-feature': ZoomIn,
  'view-properties': Eye,
  'copy-geojson': FileJson,
  'delete-feature': Trash2,
  'add-marker': Plus,
  'measure-distance': Ruler,
};

const GEOMETRY_LABELS: Record<string, string> = {
  Point: 'Point', MultiPoint: 'MultiPoint',
  LineString: 'Line', MultiLineString: 'MultiLine',
  Polygon: 'Polygon', MultiPolygon: 'MultiPolygon',
};

const GEOMETRY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Point: MapPin, MultiPoint: MapPin,
  LineString: Minus, MultiLineString: Minus,
  Polygon: Pentagon, MultiPolygon: Pentagon,
};

export default function ContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState>({
    visible: false, x: 0, y: 0, context: null,
  });

  const close = useCallback(() => {
    setMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  // Listen for context-menu events dispatched by the map engine.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { x: number; y: number; context: MapContextMenuContext };
      setMenu({ visible: true, x: detail.x, y: detail.y, context: detail.context });
    };
    window.addEventListener(CONTEXT_MENU_EVENT, handler);
    return () => window.removeEventListener(CONTEXT_MENU_EVENT, handler);
  }, []);

  // Close on click outside or Escape
  useEffect(() => {
    if (!menu.visible) return;
    const handleClick = () => close();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
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
  const feature = menu.context.feature;

  // Pre-compute which items need dividers
  const dividerBefore = new Set<string>();
  for (let i = 1; i < items.length; i++) {
    if (items[i].group !== items[i - 1].group) {
      dividerBefore.add(items[i].id);
    }
  }

  const header = feature ? (
    (() => {
      const { name, geomType, detail } = getFeatureDetails(feature);
      const GeomIcon = GEOMETRY_ICONS[geomType] || MapPin;
      const geomLabel = GEOMETRY_LABELS[geomType] || geomType;
      return (
        <div className="px-3 py-2 border-b border-gray-200/50">
          {name && <p className="text-xs font-semibold text-gray-800 truncate">{name}</p>}
          <div className="flex items-center gap-1.5 mt-0.5">
            <GeomIcon className="h-3 w-3 text-gray-400 shrink-0" />
            <span className="text-[10px] text-gray-400">{geomLabel}</span>
            {detail && <span className="text-[10px] text-gray-400 ml-auto">{detail}</span>}
          </div>
        </div>
      );
    })()
  ) : (
    <div className="px-3 py-2 border-b border-gray-200/50">
      <p className="text-[10px] text-gray-400 tabular-nums">
        {menu.context.lngLat.lat.toFixed(5)}, {menu.context.lngLat.lng.toFixed(5)}
      </p>
    </div>
  );

  // Clamp menu position to stay within viewport
  const menuWidth = 200;
  const menuX = Math.max(8, Math.min(menu.x, window.innerWidth - menuWidth - 8));
  const menuY = Math.max(8, Math.min(menu.y, window.innerHeight - (items.length * 36 + 60)));

  return (
    <div
      className="fixed z-50 min-w-[180px] max-w-[calc(100vw-16px)] sm:max-w-[240px] rounded-xl bg-white/80 backdrop-blur-2xl border border-white/30 shadow-2xl shadow-black/10 py-1"
      style={{ left: menuX, top: menuY }}
    >
      {header}
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
