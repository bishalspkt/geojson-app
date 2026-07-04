import { useEffect, useMemo, useRef } from 'react';
import { create } from 'zustand';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Info,
  Layers2,
  MapPin,
  RotateCcw,
  Shapes,
  Trash2,
  Waypoints,
} from 'lucide-react';
import { length } from '@turf/length';
import { area } from '@turf/area';
import { Button } from '@/components/ui/button';
import { DataLayer, GeometryCategory, IdentifiedFeature, categorizeGeometry } from '@/types';
import { useLayersStore } from '@/state/layers-store';
import { useUiStore } from '@/state/ui-store';
import { useEmbed } from '@/integrations/embed/embed-context';
import Panel from '../Panel';
import { setPanelWithPolicy } from '../panel-policy';

function formatNumber(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  if (value >= 10) return value.toFixed(0);
  if (value >= 0.01) return value.toFixed(2);
  return value.toFixed(4);
}

const CATEGORY_CONFIG: { type: GeometryCategory; label: string; icon: typeof MapPin }[] = [
  { type: 'point', label: 'Markers', icon: MapPin },
  { type: 'line', label: 'LineStrings', icon: Waypoints },
  { type: 'polygon', label: 'Polygons', icon: Shapes },
];

type SortOrder = 'original' | 'alpha' | 'size';

/**
 * Panel-local UI state that must survive close/reopen (registry panels take
 * no props). Sections are collapsed by default; `expanded` tracks exceptions,
 * keyed "<layerId>:<category>".
 */
const usePanelUiStore = create<{
  sortOrder: SortOrder;
  expanded: Set<string>;
  setSortOrder(order: SortOrder): void;
  toggleExpanded(key: string): void;
  expand(key: string): void;
}>((set) => ({
  sortOrder: 'original',
  expanded: new Set<string>(),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  toggleExpanded: (key) =>
    set((s) => {
      const expanded = new Set(s.expanded);
      if (expanded.has(key)) expanded.delete(key);
      else expanded.add(key);
      return { expanded };
    }),
  expand: (key) =>
    set((s) => {
      if (s.expanded.has(key)) return s;
      const expanded = new Set(s.expanded);
      expanded.add(key);
      return { expanded };
    }),
}));

function sortFeatures(
  features: IdentifiedFeature[],
  cat: GeometryCategory,
  order: SortOrder,
): IdentifiedFeature[] {
  if (order === 'original') return features;
  const getSortName = (f: IdentifiedFeature) =>
    (f.properties?.name || f.properties?.label || f.properties?.title || '') as string;
  if (order === 'alpha' || cat === 'point') {
    return [...features].sort((a, b) => getSortName(a).localeCompare(getSortName(b)));
  }
  if (cat === 'polygon') return [...features].sort((a, b) => area(b) - area(a));
  return [...features].sort((a, b) => length(b) - length(a));
}

export default function LayersPanel() {
  const embed = useEmbed();
  const layers = useLayersStore((s) => s.layers);
  const selection = useLayersStore((s) => s.selection);
  const hiddenFeatureIds = useLayersStore((s) => s.hiddenFeatureIds);
  const store = useLayersStore.getState();
  const { sortOrder, expanded, setSortOrder, toggleExpanded, expand } = usePanelUiStore();
  const featureRefs = useRef<Map<string, HTMLElement>>(new Map());

  const selectedFeatureId = selection?.featureId ?? null;

  // Auto-expand the section containing a newly selected feature.
  useEffect(() => {
    if (!selectedFeatureId) return;
    for (const layer of useLayersStore.getState().layers) {
      const feature = layer.features.find((f) => f.id === selectedFeatureId);
      if (feature) {
        expand(`${layer.id}:${categorizeGeometry(feature.geometry.type)}`);
        break;
      }
    }
  }, [selectedFeatureId, expand]);

  // Scroll to the selected feature once its section has expanded.
  useEffect(() => {
    if (!selectedFeatureId) return;
    const timer = setTimeout(() => {
      const el = featureRefs.current.get(selectedFeatureId);
      if (!el) return;
      const scrollContainer = el.closest<HTMLElement>('[data-scroll-container]');
      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const STICKY_HEADER_HEIGHT = 36;
        const target =
          scrollContainer.scrollTop + (elRect.top - containerRect.top) - STICKY_HEADER_HEIGHT;
        scrollContainer.scrollTo({ top: target, behavior: 'smooth' });
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [selectedFeatureId]);

  const featuresByLayerAndCategory = useMemo(() => {
    const result = new Map<string, Record<GeometryCategory, IdentifiedFeature[]>>();
    for (const layer of layers) {
      const buckets: Record<GeometryCategory, IdentifiedFeature[]> = {
        point: [],
        line: [],
        polygon: [],
      };
      for (const f of layer.features) buckets[categorizeGeometry(f.geometry.type)].push(f);
      result.set(layer.id, {
        point: sortFeatures(buckets.point, 'point', sortOrder),
        line: sortFeatures(buckets.line, 'line', sortOrder),
        polygon: sortFeatures(buckets.polygon, 'polygon', sortOrder),
      });
    }
    return result;
  }, [layers, sortOrder]);

  const handleFeatureClick = (feature: IdentifiedFeature) => {
    if (selectedFeatureId === feature.id) {
      store.selectFeature(null);
    } else {
      store.selectFeature(feature.id);
      if (!hiddenFeatureIds.has(feature.id)) {
        useUiStore.getState().requestFocus({ kind: 'feature', featureId: feature.id });
      }
    }
  };

  const getFeatureName = (feature: IdentifiedFeature, cat: GeometryCategory, idx: number) => {
    const name = feature.properties?.name;
    if (name) return name as string;
    const label = cat === 'polygon' ? 'Polygon' : cat === 'line' ? 'Line' : 'Point';
    return `${label} ${idx + 1}`;
  };

  const getSubtitle = (feature: IdentifiedFeature, cat: GeometryCategory) => {
    if (cat === 'polygon') return `${formatNumber(area(feature) / 1e6)} sq km`;
    if (cat === 'line') return `${formatNumber(length(feature))} km`;
    return undefined;
  };

  const hasData = layers.some((l) => l.features.length > 0);
  const showLayerHeaders = layers.length > 1;

  const renderCategory = (layer: DataLayer, cat: GeometryCategory, label: string, Icon: typeof MapPin) => {
    const features = featuresByLayerAndCategory.get(layer.id)?.[cat] ?? [];
    if (features.length === 0) return null;

    const key = `${layer.id}:${cat}`;
    const isExpanded = expanded.has(key);
    const catIds = features.map((f) => f.id);
    const allCatHidden = catIds.every((id) => hiddenFeatureIds.has(id));

    return (
      <div key={key}>
        {/* Sticky category header */}
        <div
          role="button"
          tabIndex={0}
          className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/60 transition-colors duration-150 select-none bg-white/90 backdrop-blur-sm border-b border-white/20"
          onClick={() => toggleExpanded(key)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleExpanded(key);
            }
          }}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          )}
          <Icon className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-xs font-extrabold text-gray-700 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            {label}
          </span>
          <span className="text-[11px] font-semibold text-gray-400">{features.length}</span>
          <div className="flex-1" />
          <button
            className="shrink-0 p-1.5 rounded-lg transition-colors duration-150 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation();
              store.setFeaturesVisibility(catIds, allCatHidden);
            }}
            aria-label={allCatHidden ? `Show all ${label.toLowerCase()}` : `Hide all ${label.toLowerCase()}`}
          >
            {allCatHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
        </div>
        {isExpanded && (
          <ul className="px-1 pb-1">
            {features.map((feature, idx) => {
              const active = selectedFeatureId === feature.id;
              const hidden = hiddenFeatureIds.has(feature.id);
              return (
                <li key={feature.id}>
                  <div
                    ref={(el) => {
                      if (el) featureRefs.current.set(feature.id, el);
                      else featureRefs.current.delete(feature.id);
                    }}
                    role="button"
                    tabIndex={0}
                    className={`flex items-center gap-2.5 w-full pl-8 pr-2 py-2.5 sm:py-2 rounded-xl text-left transition-colors duration-150 cursor-pointer active:scale-[0.98] scroll-mt-10 ${
                      active ? 'bg-orange-50 ring-1 ring-orange-300' : 'hover:bg-white/40'
                    } ${hidden ? 'opacity-40' : ''}`}
                    onClick={() => handleFeatureClick(feature)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleFeatureClick(feature);
                      }
                    }}
                  >
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-orange-100' : 'bg-violet-50'}`}>
                      <Icon className={`h-3.5 w-3.5 ${active ? 'text-orange-500' : 'text-violet-400'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-bold truncate ${active ? 'text-orange-800' : 'text-gray-900'}`}>
                        {getFeatureName(feature, cat, idx)}
                      </p>
                      {getSubtitle(feature, cat) && (
                        <p className="text-[11px] text-gray-400">{getSubtitle(feature, cat)}</p>
                      )}
                    </div>
                    {/* Info button — mobile only */}
                    <button
                      className="sm:hidden shrink-0 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150"
                      onClick={(e) => {
                        e.stopPropagation();
                        useUiStore.getState().showProperties(feature.id);
                      }}
                      aria-label="View properties"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                    {/* Visibility toggle */}
                    <button
                      className={`shrink-0 p-2 sm:p-1 rounded-lg transition-colors duration-150 ${
                        hidden
                          ? 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        store.toggleFeatureVisibility(feature.id);
                      }}
                      aria-label={hidden ? 'Show feature' : 'Hide feature'}
                    >
                      {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  return (
    <Panel panelId="layers">
      <>
        {!hasData && (
          <div className="p-3">
            <p className="text-sm font-bold text-gray-900">No features</p>
            {!embed.enabled && (
              <>
                <p className="text-gray-500 text-xs mt-0.5">Import GeoJSON to see features here</p>
                <div className="pt-3">
                  <Button className="rounded-xl text-xs font-bold h-8" onClick={() => setPanelWithPolicy('upload')}>
                    Import GeoJSON
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
        {hasData && (
          <div className="pb-2">
            {/* Sort bar */}
            <div className="flex items-center gap-1 px-3 py-1.5 border-b border-white/30 bg-white/60 backdrop-blur-sm">
              <span className="text-[10px] font-semibold text-gray-400 mr-0.5">Sort:</span>
              {(['original', 'alpha', 'size'] as SortOrder[]).map((order) => (
                <button
                  key={order}
                  onClick={() => setSortOrder(order)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors duration-150 ${
                    sortOrder === order
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-white/60'
                  }`}
                >
                  {order === 'original' ? 'Original' : order === 'alpha' ? 'A–Z' : 'Size'}
                </button>
              ))}
            </div>

            {layers.map((layer) => {
              if (layer.features.length === 0) return null;
              const layerFeatureIds = layer.features.map((f) => f.id);
              const layerHidden = !layer.visible;
              return (
                <div key={layer.id}>
                  {showLayerHeaders && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-violet-50/60 border-b border-white/20">
                      <Layers2 className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                      <span
                        className={`text-xs font-extrabold tracking-tight truncate ${layerHidden ? 'text-gray-400' : 'text-violet-900'}`}
                        style={{ fontFamily: 'var(--font-heading)' }}
                        title={layer.name}
                      >
                        {layer.name}
                      </span>
                      <span className="text-[11px] font-semibold text-gray-400">
                        {layerFeatureIds.length}
                      </span>
                      <div className="flex-1" />
                      <button
                        className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/70 transition-colors duration-150"
                        onClick={() => store.setLayerVisible(layer.id, !layer.visible)}
                        aria-label={layer.visible ? `Hide layer ${layer.name}` : `Show layer ${layer.name}`}
                      >
                        {layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </button>
                      {!embed.enabled && (
                        <button
                          className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-150"
                          onClick={() => store.removeLayer(layer.id)}
                          aria-label={`Remove layer ${layer.name}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                  {CATEGORY_CONFIG.map(({ type, label, icon }) => renderCategory(layer, type, label, icon))}
                </div>
              );
            })}

            {!embed.enabled && (
              <div className="flex justify-end px-2 pt-1 border-t border-white/30">
                <button
                  onClick={() => store.clearLayers()}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </div>
            )}
          </div>
        )}
      </>
    </Panel>
  );
}
